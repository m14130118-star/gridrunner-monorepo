const { Router } = require('express');
const db = require('../common/db');
const { authenticate } = require('../common/middleware');
const achievementEngine = require('../engine/achievementEngine');

const router = Router();
router.use(authenticate);

router.get('/profile', async (req, res) => {
  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'Not found' });
  
  const rating = require('../engine/ratingSystem');
  const profile = { ...account, faction: account.factionName || 'Без банды' };
  profile.arenaRating = rating.getRating(account);
  profile.arenaRank = rating.getRank(profile.arenaRating);
  profile.arenaGames = account.arena_games || 0;
  delete profile.password_hash;

  // Platega не умеет рекуррентные платежи — предупреждаем о конце VIP
  // пуш-уведомлением за 3 дня (не чаще раза в сутки)
  try {
    if ((account.isVip || account.vip) && account.vipExpiresAt) {
      const msLeft = new Date(account.vipExpiresAt).getTime() - Date.now();
      const daysLeft = Math.ceil(msLeft / 86400000);
      const warnedAgo = Date.now() - (account.vip_warned_at || 0);
      if (msLeft > 0 && daysLeft <= 3 && warnedAgo > 86400000) {
        const events = require('../common/events');
        await events.emit('vip_expiring', { daysLeft }, { userId: account.id });
        await db.update('accounts', account.id, { vip_warned_at: Date.now() });
      }
    }
  } catch {}

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
  const achResult = await achievementEngine.check(req.user.id);

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

  const dist = haversine(checkpoint.latitude, checkpoint.longitude, latitude, longitude);
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
  const result = await achievementEngine.check(req.user.id);
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
      // Death protection while a trip is active: HP can't drop below 1
      const floor = account.is_in_trip === true ? 1 : 0;
      account.hp = Math.max(floor, account.hp - dmg);
      await db.update('accounts', userId, account);
      return { trap_id: trap.id, name: trap.name, damage_hp: dmg, hp_left: account.hp, tripProtected: floor === 1 && account.hp === 1 };
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

// Trip economy v2 — deterministic reward math, no randomness:
//   XP    = 100 + km * K_transport + checkpoints * 25 + minutes * 2
//   Coins = checkpoints * 15 + km * K_gold
//   +50 coins for a real >=5 min food stop; x1.25 for A→B trips; x2 for VIP
const XP_PER_KM = { feet: 150, skateboard: 100, bicycle: 75, car: 20 };
const GOLD_PER_KM = { feet: 50, skateboard: 35, bicycle: 25, car: 5 };

// Detect a >=N min dwell within 60 m of a food checkpoint from GPS logs
async function detectFoodStop(userId, tripId, minMinutes = 5) {
  const foodCps = (await db.query('checkpoints', { trip_id: tripId, kind: 'food' }));
  if (foodCps.length === 0) return false;
  const locs = (await db.query('locations', { user_id: userId }))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (locs.length === 0) return false;

  for (const cp of foodCps) {
    let dwellStart = null;
    for (const l of locs) {
      const distM = haversine(cp.latitude, cp.longitude, l.latitude, l.longitude) * 1000;
      if (distM <= 60) {
        if (dwellStart === null) dwellStart = l.timestamp;
        if (l.timestamp - dwellStart >= minMinutes * 60000) return true;
      } else {
        dwellStart = null;
      }
    }
  }
  return false;
}

router.post('/trip/complete', async (req, res) => {
  const { trip_id, distance, duration, waypoints_total, waypoints_visited, transport } = req.body;
  if (distance == null || waypoints_total == null || waypoints_visited == null) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'Not found' });

  const trip = trip_id ? await db.findById('trips', trip_id) : null;
  const vehicle = transport || trip?.transport || account.current_vehicle || 'feet';
  const km = Math.max(0, Number(distance) || 0);
  const minutes = Math.max(0, Math.round((Number(duration) || 0) / 60));
  const cpVisited = Math.max(0, Number(waypoints_visited) || 0);

  // XP
  const baseXp = 100;
  const distXp = Math.round(km * (XP_PER_KM[vehicle] ?? XP_PER_KM.feet));
  const cpXp = cpVisited * 25;
  const timeXp = minutes * 2;
  let totalXp = baseXp + distXp + cpXp + timeXp;

  // Coins
  const cpCoins = cpVisited * 15;
  const distCoins = Math.round(km * (GOLD_PER_KM[vehicle] ?? GOLD_PER_KM.feet));
  let totalCoins = cpCoins + distCoins;

  // Food stop bonus: backend verifies the player actually stayed 5+ min
  let foodBonus = 0;
  if (trip?.eat && trip_id) {
    if (await detectFoodStop(req.user.id, trip_id)) {
      foodBonus = 50;
      totalCoins += foodBonus;
    }
  }

  // Target (A→B) trips reward planning
  let targetMultiplier = 1;
  if (trip?.isTargetTrip) {
    targetMultiplier = 1.25;
    totalCoins = Math.round(totalCoins * targetMultiplier);
  }

  // VIP double drop
  const isVip = (account.isVip || account.vip) && (!account.vipExpiresAt || new Date(account.vipExpiresAt) > new Date());
  const vipMultiplier = isVip ? 2 : 1;
  totalXp *= vipMultiplier;
  totalCoins *= vipMultiplier;

  account.xp = (account.xp || 0) + totalXp;
  account.gold = (account.gold || 0) + totalCoins;
  account.gridCoins = (account.gridCoins || 0) + totalCoins;
  account.totalDistance = (account.totalDistance || 0) + km;
  account.totalTrips = (account.totalTrips || 0) + 1;
  account.is_in_trip = false;
  account.active_trip_id = null;

  // Per-vehicle progression: trip XP levels up only the transport it was ridden on.
  // account.xp / account.level stay as the shared account-wide track (missions, arena).
  account.vehicleXp = account.vehicleXp || {};
  account.vehicleXp[vehicle] = (account.vehicleXp[vehicle] || 0) + totalXp;
  account.vehicleLevels = account.vehicleLevels || {};
  const oldVehicleLevel = account.vehicleLevels[vehicle] || 1;
  const newVehicleLevel = Math.floor(account.vehicleXp[vehicle] / 1000) + 1;
  const vehicleLevelUp = newVehicleLevel > oldVehicleLevel;
  account.vehicleLevels[vehicle] = newVehicleLevel;

  const oldLevel = account.level || 1;
  const newLevel = Math.floor((account.xp || 0) / 1000) + 1;
  let levelUp = false;
  if (newLevel > oldLevel) {
    levelUp = true;
    account.level = newLevel;
    account.hp = 100;
    account.fuel = 100;
  }
  // Trips heal: each completed trip restores 10 HP (10 trips = full bar)
  account.hp = Math.min(100, (account.hp || 0) + 10);

  await db.update('accounts', req.user.id, account);
  if (trip) {
    await db.update('trips', trip.id, {
      status: 'completed', finished_at: new Date().toISOString(),
      result: { km, minutes, cpVisited, totalXp, totalCoins },
    });
  }

  // Mission triggers (контракты): tzOffset = client's Date.getTimezoneOffset()
  let completedMissions = [];
  try {
    const missionEngine = require('../missions/missionEngine');
    const tzOffset = Number(req.body.tzOffset);
    const startedMs = trip?.started_at ? new Date(trip.started_at).getTime() : Date.now() - (Number(duration) || 0) * 1000;
    const startHour = new Date(startedMs - (Number.isFinite(tzOffset) ? tzOffset : 0) * 60000).getUTCHours();
    completedMissions = await missionEngine.handleEvent(req.user.id, 'trip_complete', {
      km, minutes, cpVisited,
      transport: vehicle,
      vibe: trip?.vibe || null,
      isTargetTrip: !!trip?.isTargetTrip,
      foodPreference: trip?.eat ? 'restaurant' : null,
      foodStop7min: trip?.eat && trip_id ? await detectFoodStop(req.user.id, trip_id, 7) : false,
      startHour,
    });
  } catch (e) {
    console.warn('[missions] trip trigger failed:', e.message);
  }

  res.json({
    success: true,
    totalXp,
    totalGold: totalCoins,
    gridCoins: totalCoins,
    breakdown: {
      baseXp, distXp, cpXp, timeXp,
      cpCoins, distCoins, foodBonus,
      targetMultiplier, vipMultiplier,
    },
    // legacy fields for older clients
    baseXp, distXp, wpXp: cpXp, durationBonus: timeXp,
    distance: km,
    duration: duration || 0,
    waypoints_visited: cpVisited,
    waypoints_total: waypoints_total || 0,
    levelUp,
    oldLevel,
    newLevel: account.level,
    vehicle,
    vehicleXp: account.vehicleXp[vehicle],
    vehicleLevel: account.vehicleLevels[vehicle],
    vehicleLevelUp,
    hp: account.hp,
    completedMissions,
  });
});

// Abort trip: clears death protection without rewards
router.post('/trip/abort', async (req, res) => {
  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'Not found' });
  if (account.active_trip_id) {
    const trip = await db.findById('trips', account.active_trip_id);
    if (trip && trip.status === 'active') {
      await db.update('trips', trip.id, { status: 'aborted', finished_at: new Date().toISOString() });
    }
  }
  await db.update('accounts', req.user.id, { is_in_trip: false, active_trip_id: null });
  res.json({ success: true });
});

router.get('/leaderboard', async (req, res) => {
  const rating = require('../engine/ratingSystem');
  const sortBy = req.query.sort === 'rating' ? 'rating' : 'xp';
  let accounts = await db.load('accounts');

  // Dedupe by username (case-insensitive), keeping the strongest record.
  // Guards against duplicate accounts spawned by cold-start auto-recreate
  // when running without a persistent DB.
  const byName = new Map();
  for (const a of accounts) {
    const key = (a.username || '').toLowerCase().trim() || String(a.id);
    const cur = byName.get(key);
    if (!cur || (a.xp || 0) > (cur.xp || 0)) byName.set(key, a);
  }
  accounts = [...byName.values()];

  const sorted = accounts
    .map(a => ({
      id: a.id, username: a.username, level: a.level || 1, xp: a.xp || 0, gold: a.gold || 0,
      totalDistance: a.totalDistance || 0, totalTrips: a.totalTrips || 0, vip: a.vip || false,
      vehicle: a.current_vehicle || 'feet',
      arenaRating: rating.getRating(a), arenaRank: rating.getRank(rating.getRating(a)), arenaGames: a.arena_games || 0,
    }))
    .sort((a, b) => sortBy === 'rating'
      ? b.arenaRating - a.arenaRating || b.xp - a.xp
      : b.xp - a.xp || b.level - a.level)
    .slice(0, 50)
    .map((u, i) => ({ rank: i + 1, ...u }));
  res.json({ success: true, leaderboard: sorted, sortBy });
});

module.exports = router;

