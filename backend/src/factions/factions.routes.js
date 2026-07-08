const { Router } = require('express');
const db = require('../common/db');
const { authenticate, checkBan } = require('../common/middleware');

const router = Router();
router.use(authenticate, checkBan);

const ROLES = ['owner', 'officer', 'rookie'];
const RANK = { owner: 3, officer: 2, rookie: 1 };

async function getFaction(userId) {
  const account = await db.findById('accounts', userId);
  if (!account?.factionId) return null;
  return { account, faction: await findEntity('factions', account.factionId) };
}

// Look up by id tolerating string/number mismatch. Created factions get a
// numeric id (Date.now) but URL params arrive as strings, so a plain
// findById({id}) misses them in Mongo. Try the raw value and its numeric twin.
async function findEntity(collection, id) {
  let e = await db.findById(collection, id);
  if (!e && typeof id === 'string' && /^\d+$/.test(id)) e = await db.findById(collection, Number(id));
  if (!e && typeof id === 'number') e = await db.findById(collection, String(id));
  return e;
}

function checkRole(userRole, minRole) {
  return (RANK[userRole] || 0) >= (RANK[minRole] || 0);
}

router.get('/', async (req, res) => {
  const factions = await db.load('factions');
  const data = factions.map(f => ({
    _id: f.id, name: f.name, factionColor: f.color || '#555',
    memberCount: f.memberIds?.length || 1, leaderId: f.leaderId,
  }));
  res.json({ success: true, factions: data });
});

router.get('/my', async (req, res) => {
  const account = await db.findById('accounts', req.user.id);
  if (!account?.factionId) return res.json({ success: true, faction: null });
  const faction = await db.findById('factions', account.factionId);
  if (!faction) return res.json({ success: true, faction: null });

  const accounts = await db.load('accounts');
  const members = (faction.memberIds || []).map(id => ({
    id, username: accounts.find(a => a.id === id)?.username || '???',
    role: accounts.find(a => a.id === id)?.factionRole || 'rookie',
    hp: accounts.find(a => a.id === id)?.hp || 100,
  }));
  const hq = faction.hqZoneId
    ? await db.findById('zones', faction.hqZoneId)
    : null;

  res.json({
    success: true,
    faction: {
      _id: faction.id, name: faction.name, color: faction.color,
      leaderId: faction.leaderId, treasury: faction.treasury || 0,
      members, hq: hq ? { id: hq.id, lat: hq.centerLat, lng: hq.centerLng } : null,
    },
  });
});

router.post('/create', async (req, res) => {
  const { name, color, lat, lng } = req.body;
  if (!name || !color) return res.status(400).json({ success: false, message: 'Need name and color' });
  const cleanName = String(name).trim().slice(0, 30);
  if (cleanName.length < 2) return res.status(400).json({ success: false, message: 'Название слишком короткое' });
  const existing = await db.findOne('factions', { name: cleanName });
  if (existing) return res.status(409).json({ success: false, message: 'Faction already exists' });
  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
  if (account.factionId) return res.status(400).json({ success: false, message: 'Already in a faction' });

  const faction = await db.insert('factions', {
    name: cleanName, color, leaderId: req.user.id,
    memberIds: [req.user.id],
    treasury: 0,
    createdAt: new Date().toISOString(),
  });

  // Стартовый участок: квадрат сетки под создателем сразу становится
  // штабом банды — «личный маленький участок», который наращивают
  let hq = null;
  const latN = parseFloat(lat), lngN = parseFloat(lng);
  if (isFinite(latN) && isFinite(lngN) && Math.abs(latN) <= 90 && Math.abs(lngN) <= 180) {
    try {
      const { ensureCellZone, ensureGridAround } = require('../arena/grid');
      const zone = await ensureCellZone(latN, lngN);
      if (!zone.controllingFaction) {
        await db.update('zones', zone.id, {
          controllingFaction: faction.id,
          capturedBy: req.user.id,
          capturedAt: new Date().toISOString(),
          isBase: true,
          influence: { [faction.id]: 100 },
        });
        await db.update('factions', faction.id, { hqZoneId: zone.id });
        hq = zone.id;
      }
      await ensureGridAround(latN, lngN); // соседние квадраты для карты
    } catch (e) { console.warn('[factions] HQ seed failed:', e.message); }
  }

  await db.update('accounts', req.user.id, {
    factionName: cleanName, factionId: faction.id,
    factionRole: 'owner', hp: account.hp ?? 100, gridCoins: account.gridCoins ?? 500,
  });
  res.json({ success: true, faction: { _id: faction.id, name: cleanName, factionColor: color, memberCount: 1, hqZoneId: hq } });
});

router.post('/join/:id', async (req, res) => {
  const faction = await findEntity('factions', req.params.id);
  if (!faction) return res.status(404).json({ success: false, message: 'Faction not found' });
  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
  if (account.factionId) return res.status(400).json({ success: false, message: 'Already in a faction' });

  if (!Array.isArray(faction.memberIds)) faction.memberIds = [];
  if (!faction.memberIds.includes(req.user.id)) faction.memberIds.push(req.user.id);
  await db.update('factions', faction.id, { memberIds: faction.memberIds });
  await db.update('accounts', req.user.id, {
    factionName: faction.name, factionId: faction.id, factionRole: 'rookie',
  });
  const events = require('../common/events');
  await events.emit('member_joined', { actorId: req.user.id, username: account.username }, { factionId: faction.id });
  res.json({ success: true, faction: { _id: faction.id, name: faction.name, factionColor: faction.color } });
});

router.post('/leave', async (req, res) => {
  const ctx = await getFaction(req.user.id);
  if (!ctx) return res.status(400).json({ success: false, message: 'Not in a faction' });
  const { account, faction } = ctx;

  faction.memberIds = faction.memberIds.filter(id => id !== req.user.id);
  if (faction.leaderId === req.user.id && faction.memberIds.length > 0) {
    faction.leaderId = faction.memberIds[0];
    const newOwner = await db.findById('accounts', faction.memberIds[0]);
    if (newOwner) await db.update('accounts', faction.memberIds[0], { factionRole: 'owner' });
  }
  await db.update('factions', faction.id, faction);
  await db.update('accounts', req.user.id, { factionName: null, factionId: null, factionRole: null });
  res.json({ success: true });
});

router.post('/set-hq', async (req, res) => {
  const { zoneId } = req.body;
  if (!zoneId) return res.status(400).json({ success: false, message: 'zoneId required' });
  const ctx = await getFaction(req.user.id);
  if (!ctx) return res.status(400).json({ success: false, message: 'Not in a faction' });
  if (ctx.faction.leaderId !== req.user.id) return res.status(403).json({ success: false, message: 'Only owner can set HQ' });

  // Reset old HQ
  if (ctx.faction.hqZoneId) {
    const old = await db.findById('zones', ctx.faction.hqZoneId);
    if (old) { old.isBase = false; await db.update('zones', old.id, old); }
  }
  const zone = await db.findById('zones', zoneId);
  if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });
  zone.isBase = true;
  await db.update('zones', zone.id, zone);
  ctx.faction.hqZoneId = zone.id;
  await db.update('factions', ctx.faction.id, { hqZoneId: zone.id });
  res.json({ success: true, zoneId });
});

router.post('/role', async (req, res) => {
  const { targetUserId, newRole } = req.body;
  if (!targetUserId || !newRole) return res.status(400).json({ success: false, message: 'targetUserId and newRole required' });
  if (!ROLES.includes(newRole)) return res.status(400).json({ success: false, message: `Invalid role: ${newRole}` });

  const ctx = await getFaction(req.user.id);
  if (!ctx) return res.status(400).json({ success: false, message: 'Not in a faction' });
  const { account, faction } = ctx;

  if (faction.leaderId !== req.user.id && account.factionRole !== 'officer') {
    return res.status(403).json({ success: false, message: 'Only owner or officer can manage roles' });
  }

  const target = await db.findById('accounts', targetUserId);
  if (!target || target.factionId !== faction.id) {
    return res.status(400).json({ success: false, message: 'Target not in your faction' });
  }

  // Owner restrictions
  if (account.factionRole === 'officer' && newRole === 'owner') {
    return res.status(403).json({ success: false, message: 'Only current owner can transfer ownership' });
  }
  if (account.factionRole === 'officer' && target.factionRole === 'owner') {
    return res.status(403).json({ success: false, message: 'Cannot demote the owner' });
  }
  if (account.factionRole === 'officer' && (target.factionRole === 'owner' || target.factionRole === 'officer')) {
    return res.status(403).json({ success: false, message: 'Officers can only manage rookies' });
  }

  // Transfer ownership
  if (newRole === 'owner' && account.factionRole === 'owner') {
    await db.update('accounts', req.user.id, { factionRole: 'officer' });
    faction.leaderId = targetUserId;
    await db.update('factions', faction.id, { leaderId: targetUserId });
  }

  // Prevent owner demotion
  if (target.factionRole === 'owner' && newRole !== 'owner') {
    return res.status(403).json({ success: false, message: 'Cannot demote owner' });
  }

  await db.update('accounts', targetUserId, { factionRole: newRole });
  res.json({ success: true, targetUserId, newRole });
});

router.post('/kick', async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ success: false, message: 'targetUserId required' });

  const ctx = await getFaction(req.user.id);
  if (!ctx) return res.status(400).json({ success: false, message: 'Not in a faction' });
  const { account, faction } = ctx;

  const target = await db.findById('accounts', targetUserId);
  if (!target || target.factionId !== faction.id) {
    return res.status(400).json({ success: false, message: 'Target not in your faction' });
  }
  if (target.factionRole === 'owner') return res.status(403).json({ success: false, message: 'Cannot kick owner' });
  if (account.factionRole === 'officer' && target.factionRole === 'officer') {
    return res.status(403).json({ success: false, message: 'Officers cannot kick other officers' });
  }
  if (account.factionRole === 'rookie') return res.status(403).json({ success: false, message: 'Rookies cannot kick' });

  faction.memberIds = faction.memberIds.filter(id => id !== targetUserId);
  await db.update('factions', faction.id, { memberIds: faction.memberIds });
  await db.update('accounts', targetUserId, { factionName: null, factionId: null, factionRole: null });
  res.json({ success: true });
});

module.exports = router;
