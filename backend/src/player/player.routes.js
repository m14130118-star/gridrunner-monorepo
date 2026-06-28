const { Router } = require('express');
const db = require('../common/db');
const { authenticate } = require('../common/middleware');
const achievementEngine = require('../engine/achievementEngine');

const router = Router();
router.use(authenticate);

router.get('/profile', async (req, res) => {
  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'Not found' });
  
  const profile = { ...account, faction: account.factionName || 'Без банды' };
  delete profile.password_hash;
  res.json({ success: true, profile });
});

router.post('/vehicle/select', async (req, res) => {
  const { vehicle } = req.body;
  const valid = ['feet', 'skateboard', 'bicycle', 'car'];
  if (!valid.includes(vehicle)) return res.status(400).json({ success: false, message: 'Invalid vehicle' });
  const updated = await db.update('accounts', req.user.id, { current_vehicle: vehicle });
  if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, vehicle });
});

router.post('/location/update', async (req, res) => {
  const { latitude, longitude, vehicle_id, isArenaMode } = req.body;
  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'Not found' });

  const vehicles = await db.load('vehicles');
  const vehicle = vehicles.find(v => v.id === vehicle_id);
  if (!vehicle) return res.status(400).json({ success: false, message: 'Vehicle not found' });

  const allLocs = await db.query('locations', { user_id: req.user.id });
  const prev = allLocs.length > 0 ? allLocs.sort((a, b) => b.timestamp - a.timestamp)[0] : null;
  let distance = 0, goldEarned = 0, xpEarned = 0, hpUsed = 0, fuelUsed = 0;

  if (prev) {
    distance = haversine(prev.latitude, prev.longitude, latitude, longitude);
    const speedKmh = distance / ((Date.now() - prev.timestamp) / 3600000) || 0;

    if (speedKmh > vehicle.speed_limit_kmh) {
      return res.status(400).json({ success: false, message: 'Speed limit exceeded' });
    }

    goldEarned = Math.floor(distance * 10);
    xpEarned = Math.floor(distance * 5);

    if (vehicle.resource_type === 'hp') {
      hpUsed = distance * vehicle.resource_consumption_per_km;
      account.hp = Math.max(0, account.hp - hpUsed);
    } else {
      fuelUsed = distance * vehicle.resource_consumption_per_km;
      account.fuel = Math.max(0, account.fuel - fuelUsed);
    }

    account.gold = (account.gold || 0) + goldEarned;
    account.xp = (account.xp || 0) + xpEarned;
    await db.update('accounts', req.user.id, account);
  }

  await db.insert('locations', {
    user_id: req.user.id, latitude, longitude, vehicle_id,
    isArenaMode: isArenaMode || false, timestamp: Date.now(),
  });

  // Arena mode trap check
  const trapHit = isArenaMode ? await checkTraps(req.user.id, latitude, longitude) : null;

  // Check achievements on each location update
  const achResult = achievementEngine.check(req.user.id);

  res.json({
    success: true, distance, gold_earned: goldEarned, xp_earned: xpEarned,
    resources: { hp: account.hp, fuel: account.fuel },
    trap_hit: trapHit,
    achievements_unlocked: achResult.unlocked,
  });
});

router.post('/check-in', async (req, res) => {
  const { checkpoint_id, latitude, longitude } = req.body;
  const checkpoint = await db.findById('checkpoints', checkpoint_id);
  if (!checkpoint) return res.status(404).json({ success: false, message: 'Checkpoint not found' });

  const dist = haversine(checkpoint.latitude, latitude, checkpoint.longitude, longitude);
  if (dist > 0.03) return res.status(400).json({ success: false, message: 'Too far from checkpoint' });

  await db.insert('checkins', {
    user_id: req.user.id, checkpoint_id, timestamp: Date.now(),
  });

  const account = await db.findById('accounts', req.user.id);
  account.gold = (account.gold || 0) + 50;
  account.xp = (account.xp || 0) + 25;
  await db.update('accounts', req.user.id, account);

  res.json({ success: true, reward: { gold: 50, xp: 25 }, restored_hp: checkpoint.restore_hp || 0 });
});

router.get('/achievements', async (req, res) => {
  const userAchs = await db.query('achievements', { user_id: req.user.id });
  res.json({ success: true, achievements: userAchs });
});

router.get('/achievements/progress', async (req, res) => {
  const userAchs = await db.query('achievements', { user_id: req.user.id });
  const earnedIds = new Set(userAchs.map(a => a.achievement_id));
  const defs = require('../engine/achievement_defs');
  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
  const allLocs = await db.query('locations', { user_id: req.user.id });
  const checkins = await db.query('checkins', { user_id: req.user.id });
  const stats = achievementEngine.computeStats(account, allLocs, checkins);

  const progress = defs.map(def => ({
    ...def,
    earned: earnedIds.has(def.id),
    unlocked_at: userAchs.find(a => a.achievement_id === def.id)?.unlocked_at || null,
    stats: def.condition.type === 'distance_total' ? { current: stats.totalDistance, target: def.condition.target } :
           def.condition.type === 'distance_vehicle' ? { current: stats.distByVehicle[def.condition.vehicle] || 0, target: def.condition.target } :
           def.condition.type === 'trip_count' ? { current: stats.tripCount, target: def.condition.target } :
           def.condition.type === 'checkin_count' ? { current: stats.checkinCount, target: def.condition.target } :
           def.condition.type === 'night_trip' ? { current: stats.nightTripCount, target: def.condition.target } :
           def.condition.type === 'arena_trip' ? { current: stats.arenaTripCount, target: def.condition.target } :
           def.condition.type === 'level_reached' ? { current: stats.level, target: def.condition.target } :
           def.condition.type === 'max_speed' ? { current: stats.maxSpeed, target: def.condition.target } :
           def.condition.type === 'traps_survived' ? { current: stats.trapsHit, target: def.condition.target } :
           null,
  }));

  res.json({ success: true, progress, stats });
});

router.post('/achievements/check', async (req, res) => {
  const result = achievementEngine.check(req.user.id);
  res.json({ success: true, ...result });
});

router.get('/quests', async (req, res) => {
  const today = new Date().toDateString();
  const quests = await db.query('quests', { user_id: req.user.id, date: today });
  if (quests.length === 0) {
    const generated = await generateDailyQuests(req.user.id);
    return res.json({ success: true, quests: generated });
  }
  res.json({ success: true, quests });
});

router.get('/trips', async (req, res) => {
  const locs = (await db.query('locations', { user_id: req.user.id }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const trips = [];
  let current = [];
  for (let i = 0; i < locs.length; i++) {
    if (current.length === 0) {
      current.push(locs[i]);
    } else {
      const gap = locs[i].timestamp - current[current.length - 1].timestamp;
      if (gap > 300000) {
        trips.push({ points: [...current] });
        current = [locs[i]];
      } else {
        current.push(locs[i]);
      }
    }
  }
  if (current.length > 0) trips.push({ points: current });

  const enriched = trips.map(t => {
    const pts = t.points;
    let totalDist = 0;
    for (let i = 1; i < pts.length; i++) {
      totalDist += haversine(pts[i-1].latitude, pts[i-1].longitude, pts[i].latitude, pts[i].longitude);
    }
    return {
      id: pts[0].id || Date.now() + Math.random() * 1000,
      points: pts,
      startTime: pts[0].timestamp,
      endTime: pts[pts.length - 1].timestamp,
      distance: Math.round(totalDist * 100) / 100,
      pointCount: pts.length,
      vehicle_id: pts[0].vehicle_id,
      isArenaMode: pts.some(p => p.isArenaMode),
    };
  }).reverse();

  res.json({ success: true, trips: enriched });
});

async function checkTraps(userId, lat, lng) {
  const traps = await db.query('traps', { is_active: true });
  for (const trap of traps) {
    const dist = haversine(trap.latitude, trap.longitude, lat, lng);
    if (dist <= (trap.radius_km || 0.015)) {
      const account = await db.findById('accounts', userId);
      const dmg = trap.damage_hp || 10;
      account.hp = Math.max(0, account.hp - dmg);
      await db.update('accounts', userId, account);
      return { trap_id: trap.id, name: trap.name, damage_hp: dmg, hp_left: account.hp };
    }
  }
  return null;
}

async function generateDailyQuests(userId) {
  const templates = [
    { title: 'Утренний разгон', desc: 'Трип 1.5км до 11:00 + чекин в кафе', mode: 'chill', xp: 100, gold: 30 },
    { title: 'Зачистка спота', desc: 'Въехать на вражескую территорию, скорость >18км/ч 45с + боевой чекин', mode: 'arena', xp: 250, gold: 0 },
    { title: 'Кофейный марафон', desc: 'Посетить 3 разных кафе за день', mode: 'chill', xp: 150, gold: 50 },
  ];
  const today = new Date().toDateString();
  const quests = templates.map(t => ({
    user_id: userId, date: today, ...t, id: Date.now() + Math.random() * 1000,
    progress: 0, target: 1, completed: false,
  }));
  for(const q of quests) await db.insert('quests', q);
  return quests;
}

router.post('/trip/complete', async (req, res) => {
  const { distance, duration, waypoints_total, waypoints_visited, transport } = req.body;
  if (distance == null || waypoints_total == null || waypoints_visited == null) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'Not found' });

  const visitedRatio = Math.min(1, (waypoints_visited || 0) / Math.max(1, waypoints_total || 1));
  const baseXp = 50;
  const baseGold = 10;
  const distXp = Math.floor((distance || 0) * 5);
  const distGold = Math.floor((distance || 0) * 2);
  const wpXp = Math.floor(visitedRatio * 100);
  const wpGold = Math.floor(visitedRatio * 20);
  const durationBonus = (duration || 0) > 600 ? 20 : 0;

  const totalXp = baseXp + distXp + wpXp + durationBonus;
  const totalGold = baseGold + distGold + wpGold;

  const coinReward = Math.floor((distance || 0) * 3) + 5;
  account.xp = (account.xp || 0) + totalXp;
  account.gold = (account.gold || 0) + totalGold;
  account.gridCoins = (account.gridCoins || 0) + coinReward;
  account.totalDistance = (account.totalDistance || 0) + (distance || 0);
  account.totalTrips = (account.totalTrips || 0) + 1;

  const oldLevel = account.level || 1;
  const newLevel = Math.floor((account.xp || 0) / 1000) + 1;
  let levelUp = false;
  if (newLevel > oldLevel) {
    levelUp = true;
    account.level = newLevel;
    account.hp = 100;
    account.fuel = 100;
  }

  await db.update('accounts', req.user.id, account);

  res.json({
    success: true,
    totalXp,
    totalGold,
    gridCoins: coinReward,
    baseXp,
    distXp,
    wpXp,
    durationBonus,
    distance: distance || 0,
    duration: duration || 0,
    waypoints_visited: waypoints_visited || 0,
    waypoints_total: waypoints_total || 0,
    visitedRatio,
    levelUp,
    oldLevel,
    newLevel: account.level,
  });
});

router.get('/leaderboard', async (req, res) => {
  const accounts = await db.load('accounts');
  const sorted = accounts
    .map(a => ({ id: a.id, username: a.username, level: a.level || 1, xp: a.xp || 0, gold: a.gold || 0, totalDistance: a.totalDistance || 0, totalTrips: a.totalTrips || 0, vip: a.vip || false, vehicle: a.current_vehicle || 'feet' }))
    .sort((a, b) => b.xp - a.xp || b.level - a.level)
    .slice(0, 50)
    .map((u, i) => ({ rank: i + 1, ...u }));
  res.json({ success: true, leaderboard: sorted });
});

module.exports = router;

