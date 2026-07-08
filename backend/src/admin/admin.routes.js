const { Router } = require('express');
const jwt = require('jsonwebtoken');
const db = require('../common/db');

const router = Router();

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD || 'gridrunner-admin-2026';
const JWT_SECRET = process.env.JWT_SECRET || 'gridrunner-secret-key-2026';

function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Admin token required' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    if (decoded.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid admin token' });
  }
}

// Admin login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD_HASH) {
    return res.status(401).json({ success: false, message: 'Invalid password' });
  }
  const token = jwt.sign(
    { role: 'SUPER_ADMIN', id: 'admin', username: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' },
  );
  res.json({ success: true, token });
});

// All routes below require admin auth
router.use(adminAuth);

// Ban user
router.post('/ban', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
  const user = await db.findById('accounts', userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  await db.update('accounts', userId, { isBanned: true });
  res.json({ success: true, userId, isBanned: true });
});

// Unban user
router.post('/unban', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
  await db.update('accounts', userId, { isBanned: false });
  res.json({ success: true, userId, isBanned: false });
});

// Set VIP (grant or revoke)
router.post('/vip', async (req, res) => {
  const { userId, isVip, days } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
  const user = await db.findById('accounts', userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const updates = { isVip: !!isVip };
  if (isVip && days) {
    updates.vipExpiresAt = new Date(Date.now() + days * 86400000).toISOString();
  } else if (!isVip) {
    updates.vipExpiresAt = null;
  }
  await db.update('accounts', userId, updates);
  res.json({ success: true, userId, ...updates });
});

// List all factions with stats
router.get('/factions', async (req, res) => {
  const factions = await db.load('factions');
  const zones = await db.load('zones');
  const accounts = await db.load('accounts');

  const data = factions.map(f => {
    const memberIds = f.memberIds || [];
    const controlledZones = zones.filter(z => z.controllingFaction === f.id);
    return {
      id: f.id, name: f.name, color: f.color,
      members: memberIds.length,
      controlledZones: controlledZones.length,
      treasury: f.treasury || 0,
      leaderId: f.leaderId,
      leaderName: accounts.find(a => a.id === f.leaderId)?.username || '???',
    };
  });
  res.json({ success: true, factions: data });
});

// Reset faction zones (anti-cheat)
router.post('/factions/:id/reset', async (req, res) => {
  const faction = await db.findById('factions', req.params.id);
  if (!faction) return res.status(404).json({ success: false, message: 'Faction not found' });
  const zones = await db.load('zones');
  let resetCount = 0;
  for (const z of zones) {
    if (z.controllingFaction === faction.id) {
      z.controllingFaction = null;
      z.influence = {};
      delete z.isBase;
      await db.update('zones', z.id, z);
      resetCount++;
    }
  }
  faction.hqZoneId = null;
  await db.update('factions', faction.id, { hqZoneId: null });
  res.json({ success: true, factionId: faction.id, zonesReset: resetCount });
});

// ── News management (public feed lives at GET /api/v1/news) ──
router.get('/news', async (req, res) => {
  const news = await db.load('news');
  res.json({ success: true, news: news.sort((a, b) => b.date - a.date) });
});

router.post('/news', async (req, res) => {
  const { title, content, pinned } = req.body;
  if (!title || !content) return res.status(400).json({ success: false, message: 'title and content required' });
  const item = await db.insert('news', {
    title: String(title).trim().slice(0, 140),
    content: String(content).trim().slice(0, 5000),
    pinned: !!pinned,
    published: true,
    author: 'GridRunner',
    date: Date.now(),
  });
  res.json({ success: true, item });
});

router.put('/news/:id', async (req, res) => {
  const news = await db.load('news');
  const item = news.find(n => String(n.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  const updates = {};
  if (req.body.title !== undefined) updates.title = String(req.body.title).trim().slice(0, 140);
  if (req.body.content !== undefined) updates.content = String(req.body.content).trim().slice(0, 5000);
  if (req.body.pinned !== undefined) updates.pinned = !!req.body.pinned;
  await db.update('news', item.id, updates);
  res.json({ success: true });
});

router.delete('/news/:id', async (req, res) => {
  const news = await db.load('news');
  const item = news.find(n => String(n.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  await db.remove('news', item.id);
  res.json({ success: true });
});

// Search users
router.get('/users', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'Query param q required' });
  const accounts = await db.load('accounts');
  const results = accounts.filter(a =>
    (a.username && a.username.toLowerCase().includes(q.toLowerCase())) ||
    String(a.id).includes(q)
  ).slice(0, 20).map(a => ({
    id: a.id, username: a.username, email: a.email || '',
    factionId: a.factionId, factionName: a.factionName,
    factionRole: a.factionRole,
    isVip: !!a.isVip, isBanned: !!a.isBanned,
    hp: a.hp || 100, gridCoins: a.gridCoins || 0, xp: a.xp || 0,
  }));
  res.json({ success: true, users: results });
});

module.exports = router;
