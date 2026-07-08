const { Router } = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../common/db');
const { sendEmail, verificationEmail, EMAIL_ENABLED, REQUIRE_EMAIL_VERIFY } = require('../common/mailer');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gridrunner-secret-key-2026';
const API_URL = process.env.API_URL || 'https://gridrunner-api.vercel.app';
const GAME_URL = process.env.GAME_URL || 'https://game-gridrunner.vercel.app';

async function issueVerification(account) {
  const token = crypto.randomBytes(24).toString('hex');
  await db.update('accounts', account.id, { verify_token: token, verify_sent_at: Date.now() });
  const link = `${API_URL}/api/v1/auth/verify?token=${token}`;
  const mail = verificationEmail(account.username, link);
  await sendEmail({ to: account.email, toName: account.username, ...mail });
  return token;
}

// Access-code gate. Founder codes always work (bootstrap); every player also
// gets a personal code they can share. Set INVITE_CODES to override founders.
const MASTER_CODES = (process.env.INVITE_CODES || 'GRIDRUNNER,NEON2026,CITYWAR,FOUNDER')
  .split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
// Регистрация открыта: код не обязателен. Вернуть гейт можно переменной
// REQUIRE_INVITE=true. Реферальный бонус работает, если код введён добровольно.
const REQUIRE_INVITE = process.env.REQUIRE_INVITE === 'true';
const REFERRAL_BONUS = 200; // gridCoins credited to the inviter

// Unambiguous alphabet (no O/0/I/1) for shareable codes
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(len = 6) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}
async function uniqueCode() {
  for (let i = 0; i < 8; i++) {
    const c = makeCode();
    const clash = await db.findOne('accounts', { invite_code: c });
    if (!clash) return c;
  }
  return makeCode(8);
}

// Resolve a submitted code -> { valid, inviter|null }
async function resolveInvite(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { valid: false, inviter: null };
  if (MASTER_CODES.includes(code)) return { valid: true, inviter: null };
  const inviter = await db.findOne('accounts', { invite_code: code });
  if (inviter) return { valid: true, inviter };
  return { valid: false, inviter: null };
}

// Live check for the register UI (no side effects)
router.get('/check-code', async (req, res) => {
  if (!REQUIRE_INVITE) return res.json({ success: true, valid: true, requireInvite: false });
  const { valid, inviter } = await resolveInvite(req.query.code);
  res.json({ success: true, valid, requireInvite: true, invitedBy: inviter?.username || null });
});

router.post('/register', async (req, res) => {
  const { username, email, password, inviteCode } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  if (password.length < 4) {
    return res.status(400).json({ success: false, message: 'Password too short' });
  }

  // Access-code gate (по умолчанию выключен). Введённый код всё равно
  // резолвим, чтобы пригласивший получил реферальный бонус.
  let inviter = null;
  if (inviteCode) {
    const check = await resolveInvite(inviteCode);
    if (check.valid) inviter = check.inviter;
    else if (REQUIRE_INVITE) {
      return res.status(403).json({ success: false, message: 'Неверный код доступа', code: 'BAD_INVITE' });
    }
  } else if (REQUIRE_INVITE) {
    return res.status(403).json({ success: false, message: 'Неверный код доступа', code: 'BAD_INVITE' });
  }

  const existing = await db.findOne('accounts', { $or: [{ email }, { username }] });
  if (existing) return res.status(409).json({ success: false, message: 'User already exists' });

  const myCode = await uniqueCode();
  const account = await db.insert('accounts', {
    username, email, password_hash: bcrypt.hashSync(password, 10),
    role: 'player', level: 1, xp: 0, gold: 0, vip: false,
    hp: 100, gridCoins: 500, fuel: 100, current_vehicle: 'feet', totalDistance: 0, totalTrips: 0,
    invite_code: myCode,
    invited_by: inviter ? inviter.id : null,
    // Unverified only when gating is actually enforced
    email_verified: !REQUIRE_EMAIL_VERIFY,
    created_at: new Date().toISOString(),
  });

  // Send the verification email whenever email is configured (even before
  // gating is enforced, so we can confirm delivery works)
  if (EMAIL_ENABLED) {
    try { await issueVerification(account); } catch (e) { console.error('[auth] verify email failed:', e.message); }
  }

  // First 100 players get the founder achievement "С начала времён"
  try {
    const total = await db.count('accounts');
    if (total <= 100) {
      await db.insert('achievements', {
        user_id: account.id, achievement_id: 'founder_100',
        unlocked_at: Date.now(), category: 'milestone',
      });
      await db.update('accounts', account.id, { xp: (account.xp || 0) + 1000, founder: true, founder_number: total });
    }
  } catch (e) { console.warn('[auth] founder award failed:', e.message); }

  // Reward the inviter (referral loop)
  if (inviter) {
    await db.update('accounts', inviter.id, {
      gridCoins: (inviter.gridCoins || 0) + REFERRAL_BONUS,
      invite_count: (inviter.invite_count || 0) + 1,
    });
    try {
      const events = require('../common/events');
      await events.emit('member_joined', { actorId: account.id, username, referral: true, bonus: REFERRAL_BONUS }, { userId: inviter.id });
    } catch {}
  }

  const token = jwt.sign({ id: account.id, username, email, role: 'player' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    success: true, token,
    user: { id: account.id, username, email, role: 'player', invite_code: myCode, email_verified: account.email_verified },
    inviteCode: myCode,
    needsVerification: REQUIRE_EMAIL_VERIFY,
  });
});

// Verify email — opened from the emailed link, redirects back to the game
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  const account = token ? await db.findOne('accounts', { verify_token: token }) : null;
  if (!account) {
    return res.redirect(302, `${GAME_URL}/auth/login?verify=invalid`);
  }
  await db.update('accounts', account.id, { email_verified: true, verify_token: null });
  return res.redirect(302, `${GAME_URL}/auth/login?verify=ok`);
});

// Resend the verification email (throttled to once per minute)
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });
  const account = await db.findOne('accounts', { email });
  if (!account) return res.status(404).json({ success: false, message: 'Аккаунт не найден' });
  if (account.email_verified) return res.json({ success: true, alreadyVerified: true });
  if (account.verify_sent_at && Date.now() - account.verify_sent_at < 60000) {
    return res.status(429).json({ success: false, message: 'Письмо уже отправлено, подожди минуту' });
  }
  if (!EMAIL_ENABLED) return res.status(503).json({ success: false, message: 'Почта не настроена' });
  try { await issueVerification(account); } catch (e) { return res.status(500).json({ success: false, message: 'Не удалось отправить' }); }
  res.json({ success: true });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email и пароль обязательны' });
  // Accept either email or username in the login field
  const account = await db.findOne('accounts', { $or: [{ email }, { username: email }] });
  if (!account) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  // Ghost accounts auto-recreated from a JWT have an empty password_hash and
  // could never log in. First successful login claims the account: the
  // password used becomes the account password.
  if (!account.password_hash) {
    if (password.length < 4) return res.status(400).json({ success: false, message: 'Пароль слишком короткий' });
    await db.update('accounts', account.id, { password_hash: bcrypt.hashSync(password, 10) });
    account.password_hash = 'claimed';
  } else if (!bcrypt.compareSync(password, account.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  // Block unverified accounts only when gating is explicitly enforced
  if (REQUIRE_EMAIL_VERIFY && account.email_verified === false) {
    return res.status(403).json({ success: false, message: 'Подтверди почту — проверь письмо', code: 'EMAIL_UNVERIFIED', email: account.email });
  }
  const token = jwt.sign(
    { id: account.id, username: account.username, email: account.email, role: account.role },
    JWT_SECRET, { expiresIn: '7d' }
  );
  res.json({ success: true, token, user: { id: account.id, username: account.username, email: account.email, role: account.role, vip: account.vip, invite_code: account.invite_code } });
});

router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const account = await db.findById('accounts', payload.id);
    if (!account) return res.status(404).json({ success: false, message: 'Not found' });
    const { password_hash, ...user } = account;
    res.json({ success: true, user });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = router;
