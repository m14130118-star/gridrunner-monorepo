const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'gridrunner-secret-key-2026';

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    // Auto-recreate account if DB was reset (in-memory mode)
    const exists = await db.findById('accounts', req.user.id);
    if (!exists) {
      const genCode = () => {
        const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
        return s;
      };
      const newAccount = await db.insert('accounts', {
        id: req.user.id,
        username: req.user.username || 'Player',
        email: req.user.email || 'unknown@email.com',
        password_hash: '',
        role: req.user.role || 'player',
        level: 1, xp: 0, gold: 0, vip: false,
        hp: 100, gridCoins: 500, fuel: 100,
        current_vehicle: 'feet', totalDistance: 0, totalTrips: 0,
        factionName: null, factionId: null, factionRole: null,
        invite_code: genCode(),
        email_verified: true, // came from a valid signed token
        created_at: new Date().toISOString(),
      });
      console.log(`[auth] Auto-recreated account ${req.user.id} (${req.user.username})`);
    }
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

async function checkBan(req, res, next) {
  if (!req.user) return next();
  try {
    const account = await db.findById('accounts', req.user.id);
    if (account?.isBanned) {
      return res.status(403).json({ success: false, message: 'Account is banned' });
    }
    next();
  } catch {
    next();
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticate, checkBan, requireRole };
