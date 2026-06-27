const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../common/db');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gridrunner-secret-key-2026';

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  if (password.length < 4) {
    return res.status(400).json({ success: false, message: 'Password too short' });
  }
  const existing = db.findOne('accounts', a => a.email === email || a.username === username);
  if (existing) return res.status(409).json({ success: false, message: 'User already exists' });

  const account = db.insert('accounts', {
    username, email, password_hash: bcrypt.hashSync(password, 10),
    role: 'player', level: 1, xp: 0, gold: 0, vip: false,
    hp: 100, fuel: 100, current_vehicle: 'feet', totalDistance: 0, totalTrips: 0,
    created_at: new Date().toISOString(),
  });

  const token = jwt.sign({ id: account.id, username, email, role: 'player' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { id: account.id, username, email, role: 'player' } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const account = db.findOne('accounts', a => a.email === email);
  if (!account || !bcrypt.compareSync(password, account.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  const token = jwt.sign(
    { id: account.id, username: account.username, email: account.email, role: account.role },
    JWT_SECRET, { expiresIn: '7d' }
  );
  res.json({ success: true, token, user: { id: account.id, username: account.username, email: account.email, role: account.role, vip: account.vip } });
});

router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const account = db.findById('accounts', payload.id);
    if (!account) return res.status(404).json({ success: false, message: 'Not found' });
    const { password_hash, ...user } = account;
    res.json({ success: true, user });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = router;
