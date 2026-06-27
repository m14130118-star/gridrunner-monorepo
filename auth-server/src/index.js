const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.AUTH_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gridrunner-secret-key-2026';
const DB_PATH = path.join(__dirname, '..', 'data', 'accounts.json');

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

function loadAccounts() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); }
  catch { return []; }
}

function saveAccounts(accounts) {
  fs.writeFileSync(DB_PATH, JSON.stringify(accounts, null, 2));
}

app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  if (password.length < 4) {
    return res.status(400).json({ success: false, message: 'Password too short' });
  }
  const accounts = loadAccounts();
  if (accounts.find(a => a.email === email || a.username === username)) {
    return res.status(409).json({ success: false, message: 'User already exists' });
  }
  const id = Date.now() + Math.floor(Math.random() * 1000);
  const account = { id, username, email, password_hash: bcrypt.hashSync(password, 10), role: 'player' };
  accounts.push(account);
  saveAccounts(accounts);
  const token = jwt.sign({ id, username, email, role: 'player' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { id, username, email, role: 'player' } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  const accounts = loadAccounts();
  const account = accounts.find(a => a.email === email);
  if (!account || !bcrypt.compareSync(password, account.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  const token = jwt.sign(
    { id: account.id, username: account.username, email: account.email, role: account.role },
    JWT_SECRET, { expiresIn: '7d' }
  );
  res.json({ success: true, token, user: { id: account.id, username: account.username, email: account.email, role: account.role } });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user: { id: account.id, username: account.username, email: account.email, role: account.role } });
});

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
  console.log(`Data file: ${DB_PATH}`);
});
