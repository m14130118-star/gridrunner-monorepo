const { Router } = require('express');
const db = require('../common/db');
const { authenticate } = require('../common/middleware');

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const factions = await db.load('factions');
  const users = await db.load('accounts');
  const data = factions.map(f => ({
    _id: f.id,
    name: f.name,
    factionColor: f.color || '#555',
    memberCount: f.memberIds?.length || 1,
    leaderId: f.leaderId,
  }));
  res.json({ success: true, factions: data });
});

router.post('/create', async (req, res) => {
  const { name, color } = req.body;
  if (!name || !color) return res.status(400).json({ success: false, message: 'Need name and color' });

  const existing = await db.findOne('factions', { name });
  if (existing) return res.status(409).json({ success: false, message: 'Faction already exists' });

  const account = await db.findById('accounts', req.user.id);
  if (account.factionId) return res.status(400).json({ success: false, message: 'Already in a faction' });

  const faction = await db.insert('factions', {
    name,
    color,
    leaderId: req.user.id,
    memberIds: [req.user.id],
    createdAt: new Date().toISOString(),
  });

  await db.update('accounts', req.user.id, {
    factionName: name,
    factionId: faction.id,
    factionRole: 'leader',
    hp: account.hp ?? 100,
    gridCoins: account.gridCoins ?? 500,
  });

  res.json({ success: true, faction: { _id: faction.id, name, factionColor: color, memberCount: 1 } });
});

router.post('/join/:id', async (req, res) => {
  const faction = await db.findById('factions', req.params.id);
  if (!faction) return res.status(404).json({ success: false, message: 'Faction not found' });

  const account = await db.findById('accounts', req.user.id);
  if (account.factionId) return res.status(400).json({ success: false, message: 'Already in a faction' });

  faction.memberIds.push(req.user.id);
  await db.update('factions', faction.id, { memberIds: faction.memberIds });
  await db.update('accounts', req.user.id, {
    factionName: faction.name,
    factionId: faction.id,
    factionRole: 'member',
  });

  res.json({ success: true, faction: { _id: faction.id, name: faction.name, factionColor: faction.color } });
});

router.post('/leave', async (req, res) => {
  const account = await db.findById('accounts', req.user.id);
  if (!account.factionId) return res.status(400).json({ success: false, message: 'Not in a faction' });

  const faction = await db.findById('factions', account.factionId);
  if (faction) {
    faction.memberIds = faction.memberIds.filter(id => id !== req.user.id);
    if (faction.leaderId === req.user.id && faction.memberIds.length > 0) {
      faction.leaderId = faction.memberIds[0];
    }
    await db.update('factions', faction.id, faction);
  }

  await db.update('accounts', req.user.id, { factionName: null, factionId: null, factionRole: null });
  res.json({ success: true });
});

module.exports = router;
