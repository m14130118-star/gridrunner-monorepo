// Transactional email via Mailjet Send API v3.1.
// A plain HTTPS POST works reliably from Vercel serverless, and Mailjet
// (unlike Brevo) does not block requests by source IP — so rotating
// serverless IPs are fine. Sender must be a validated email/domain in Mailjet.
// Configure with:
//   MAILJET_API_KEY     — API key
//   MAILJET_SECRET_KEY  — secret key
//   MAIL_FROM           — validated sender email
//   MAIL_FROM_NAME      — display name (default "GridRunner")
// (Legacy BREVO_API_KEY is still honoured as a fallback so nothing breaks.)

const MAILJET_API_KEY = process.env.MAILJET_API_KEY || '';
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY || '';
const BREVO_API_KEY = process.env.BREVO_API_KEY || ''; // legacy fallback
const MAIL_FROM = process.env.MAIL_FROM || 'noreply@gridrunner.app';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'GridRunner';

const MAILJET_READY = !!(MAILJET_API_KEY && MAILJET_SECRET_KEY);
// Whether the account can send at all (a provider is configured).
const EMAIL_ENABLED = MAILJET_READY || !!BREVO_API_KEY;
// Login gating is a SEPARATE explicit switch, so we can set the keys and
// confirm real delivery before locking anyone out. Only 'true' enforces it.
const REQUIRE_EMAIL_VERIFY = process.env.REQUIRE_EMAIL_VERIFY === 'true';

async function sendViaMailjet({ to, toName, subject, html, text }) {
  const auth = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  const r = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    signal: ac.signal,
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Messages: [{
        From: { Email: MAIL_FROM, Name: MAIL_FROM_NAME },
        To: [{ Email: to, Name: toName || to }],
        Subject: subject,
        HTMLPart: html,
        TextPart: text || undefined,
      }],
    }),
  });
  clearTimeout(t);
  if (!r.ok) {
    const body = await r.text();
    console.error('[mailer] Mailjet error', r.status, body.slice(0, 300));
    return { ok: false, status: r.status };
  }
  return { ok: true };
}

async function sendViaBrevo({ to, toName, subject, html, text }) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', signal: ac.signal,
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      sender: { email: MAIL_FROM, name: MAIL_FROM_NAME },
      to: [{ email: to, name: toName || to }],
      subject, htmlContent: html, textContent: text || undefined,
    }),
  });
  clearTimeout(t);
  if (!r.ok) {
    const body = await r.text();
    console.error('[mailer] Brevo error', r.status, body.slice(0, 200));
    return { ok: false, status: r.status };
  }
  return { ok: true };
}

async function sendEmail(msg) {
  if (!EMAIL_ENABLED) {
    console.warn('[mailer] no email provider configured — skipped:', msg.subject);
    return { skipped: true };
  }
  try {
    return MAILJET_READY ? await sendViaMailjet(msg) : await sendViaBrevo(msg);
  } catch (e) {
    console.error('[mailer] send failed:', e.message);
    return { ok: false, error: e.message };
  }
}

function verificationEmail(username, link) {
  const subject = 'GridRunner — подтверди почту';
  const html = `
  <div style="margin:0;padding:0;background:#081827;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:480px;margin:0 auto;padding:32px 20px">
      <div style="text-align:center;margin-bottom:24px">
        <span style="font-family:monospace;font-size:26px;font-weight:800;letter-spacing:1px">
          <span style="color:#00e676">GRID</span><span style="color:#eafff5">RUNNER</span>
        </span>
      </div>
      <div style="background:#10293f;border:1px solid rgba(0,230,118,0.25);border-radius:16px;padding:28px;color:#dbe9f0">
        <h1 style="font-size:20px;margin:0 0 12px;color:#fff">Привет, ${escapeHtml(username)}!</h1>
        <p style="font-size:14px;line-height:1.6;color:#9fb3c4;margin:0 0 24px">
          Подтверди адрес почты, чтобы активировать аккаунт и захватывать районы города.
        </p>
        <a href="${link}" style="display:block;text-align:center;background:#00e676;color:#04120a;text-decoration:none;font-weight:700;font-size:15px;padding:14px;border-radius:12px">
          Подтвердить почту
        </a>
        <p style="font-size:12px;color:#5f7788;margin:20px 0 0;line-height:1.5">
          Если кнопка не работает, открой ссылку:<br>
          <a href="${link}" style="color:#00e676;word-break:break-all">${link}</a>
        </p>
      </div>
      <p style="text-align:center;font-size:11px;color:#3f5568;margin-top:20px;font-family:monospace">
        Если это был не ты — просто проигнорируй письмо.
      </p>
    </div>
  </div>`;
  const text = `Привет, ${username}! Подтверди почту для GridRunner: ${link}`;
  return { subject, html, text };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = { sendEmail, verificationEmail, EMAIL_ENABLED, REQUIRE_EMAIL_VERIFY };
