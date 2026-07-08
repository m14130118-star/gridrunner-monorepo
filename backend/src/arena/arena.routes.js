const { Router } = require('express');
const db = require('../common/db');
const events = require('../common/events');
const rating = require('../engine/ratingSystem');
const missionEngine = require('../missions/missionEngine');
const { authenticate, checkBan } = require('../common/middleware');

// Суммарный уровень участников фракции, активных за последние 30 минут
async function onlineSumLevel(factionId) {
  if (!factionId) return 0;
  const accounts = (await db.load('accounts')).filter(a => a.factionId === factionId);
  const locations = await db.load('locations');
  const cutoff = Date.now() - 30 * 60000;
  const online = new Set(locations.filter(l => l.timestamp > cutoff).map(l => l.user_id));
  return accounts.filter(a => online.has(a.id)).reduce((s, a) => s + (a.level || 1), 0);
}

const router = Router();
router.use(authenticate, checkBan);

// ELO duel between two accounts; scoreA = 1 means A won.
// Returns deltas so the caller can show them in the UI.
async function eloDuel(accountA, accountB, scoreA) {
  const rA = rating.getRating(accountA);
  const rB = rating.getRating(accountB);
  const gA = accountA.arena_games || 0;
  const gB = accountB.arena_games || 0;
  const result = rating.calculate(rA, rB, scoreA, gA, gB);
  await db.update('accounts', accountA.id, { arena_rating: result.newRatingA, arena_games: gA + 1 });
  await db.update('accounts', accountB.id, { arena_rating: result.newRatingB, arena_games: gB + 1 });
  return result;
}

async function getInventory(userId) {
  let inv = await db.findOne('inventories', { userId });
  if (!inv) {
    inv = await db.insert('inventories', {
      userId,
      items: { shield: 2, medpack: 4, scanner: 1, vibe_booster: 1, trap: 3 },
    });
  }
  return inv;
}

async function useInventoryItem(userId, itemType) {
  const inv = await getInventory(userId);
  if (inv.items[itemType] > 0) {
    inv.items[itemType] -= 1;
    await db.update('inventories', inv.id, inv);
  }
}

router.get('/get-inventory', async (req, res) => {
  const inv = await getInventory(req.user.id);
  res.json({ success: true, inventory: inv });
});

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buffExpired(zone) {
  return zone?.activeBuff?.expiresAt && new Date(zone.activeBuff.expiresAt) < new Date();
}

async function cleanupZoneBuffs(zones) {
  for (const z of zones) {
    if (buffExpired(z)) {
      z.activeBuff = null;
      await db.update('zones', z.id, { activeBuff: null });
    }
  }
}

// Глобальная сетка зон — квадраты генерируются вокруг любого игрока
const { ensureGridAround } = require('./grid');

router.get('/zones', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng required' });

  const latNum0 = parseFloat(lat);
  const lngNum0 = parseFloat(lng);
  if (isFinite(latNum0) && isFinite(lngNum0)) {
    try { await ensureGridAround(latNum0, lngNum0); } catch (e) { console.warn('[zones] grid gen failed:', e.message); }
  }

  let zones = await db.load('zones');
  const factions = await db.load('factions');
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  zones = zones.filter(z => {
    if (z.geometry?.type === 'Polygon') {
      const center = z.geometry.coordinates[0].reduce((a, c) => [a[0] + c[0], a[1] + c[1]], [0, 0]);
      center[0] /= z.geometry.coordinates[0].length;
      center[1] /= z.geometry.coordinates[0].length;
      return haversine(latNum, lngNum, center[1], center[0]) <= 2;
    }
    return false;
  });

  const zonesWithColors = zones.map(z => {
    if (buffExpired(z)) z.activeBuff = null;
    const color = factions.find(f => f.id === z.controllingFaction)?.color || '#555';
    return {
      type: 'Feature',
      geometry: z.geometry,
      properties: {
        id: z.id,
        controllingFaction: z.controllingFaction || null,
        factionColor: color,
        influence: z.influence || {},
        hasTrap: !!z.activeTrap,
        hasBuff: !!z.activeBuff,
        isBase: !!z.isBase,
      },
    };
  });

  res.json({ success: true, zones: zonesWithColors });
});

// Смерть: действия блокируются, фракция теряет 10% случайных зон
// (сбрасываются в НЕЙТРАЛЬНОЕ состояние), респавн в Safe Zone,
// HP восстанавливается трипами (+10 за трип).
async function applyDeath(account, result) {
  account.hp = 0;
  account.is_dead = true;
  const allZones = await db.load('zones');
  const factionZones = allZones.filter(z => z.controllingFaction === account.factionId);
  const toLose = factionZones.length > 0 ? Math.max(1, Math.floor(factionZones.length * 0.1)) : 0;
  const shuffled = factionZones.sort(() => Math.random() - 0.5).slice(0, toLose);
  for (const z of shuffled) {
    if (z.influence) delete z.influence[account.factionId];
    z.controllingFaction = null;      // зоны уходят в нейтраль, не врагу
    z.capturedBy = null;
    delete z.isBase;
    await db.update('zones', z.id, z);
  }
  result.deathPenalty = { zonesLost: toLose };
  if (account.factionId && toLose > 0) {
    await events.emit('territory_lost', {
      actorId: account.id, victim: account.username, zonesLost: toLose,
    }, { factionId: account.factionId });
  }
}

router.post('/step', async (req, res) => {
  const { lat, lng, ninja } = req.body;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng required' });

  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'User not found' });

  // Мёртвый игрок заблокирован до восстановления HP трипами
  if (account.is_dead && (account.hp || 0) <= 0) {
    return res.json({ success: true, dead: true, hp: 0, message: 'Ты выведен из строя. Восстанови HP трипами (1 трип = +10 HP)' });
  }
  if (account.is_dead && (account.hp || 0) > 0) {
    account.is_dead = false; // отхилился трипами — снова в строю
  }

  let zone = await db.findOne('zones', {
    geometry: { $geoIntersects: { $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] } } }
  });
  if (!zone) return res.json({ success: true, message: 'Outside any zone', hp: account.hp });

  const result = { zoneId: zone.id, hp: account.hp, gridCoins: account.gridCoins || 0, captured: false, trapHit: null, isHq: false, ninja: !!ninja };

  const isOwnZone = account.factionId && zone.controllingFaction === account.factionId;
  const isEnemyZone = !!(zone.controllingFaction && account.factionId && zone.controllingFaction !== account.factionId);
  const isEnemyHq = zone.isBase && isEnemyZone;
  if (zone.isBase && isOwnZone) result.isHq = true;

  if (isOwnZone) {
    // Своя зона — регенерация +5 HP за пинг
    if (account.hp < 100) account.hp = Math.min(100, (account.hp || 0) + 5);
    result.hp = account.hp;
  } else if (account.factionId) {
    // Чужая/нейтральная зона — износ HP. База -2 за пинг; чем выше суммарный
    // уровень банды онлайн, тем стабильнее: 2 / (Суммарный_Уровень * 0.1).
    // Режим Ниндзя удваивает износ.
    const sumLevel = await onlineSumLevel(account.factionId);
    let drain = sumLevel > 0 ? 2 / (sumLevel * 0.1) : 2;
    drain = Math.min(2, Math.max(0.2, drain));
    if (ninja) drain *= 2;
    const inTrip = account.is_in_trip === true;
    account.hp = Math.max(inTrip ? 1 : 0, (account.hp || 100) - drain);
    account.hp = Math.round(account.hp * 10) / 10;
    result.hp = account.hp;
    result.hpDrain = Math.round(drain * 10) / 10;
    if (account.hp <= 0) {
      await applyDeath(account, result);
      await db.update('accounts', req.user.id, { hp: 0, is_dead: true });
      try { await missionEngine.handleEvent(req.user.id, 'death', {}); } catch {}
      return res.json({ success: true, ...result, hp: 0, dead: true });
    }
  }

  // Захват: +2 очка влияния за шаг, зона перекрашивается на 100 очках
  if (account.factionId && !isEnemyHq && !isOwnZone) {
    if (!zone.influence) zone.influence = {};
    const INFLUENCE_PER_STEP = 2;
    const CAPTURE_AT = 100;
    zone.influence[account.factionId] = (zone.influence[account.factionId] || 0) + INFLUENCE_PER_STEP;
    result.influence = zone.influence[account.factionId];
    result.influenceTarget = CAPTURE_AT;

    if (zone.influence[account.factionId] >= CAPTURE_AT) {
      const previousFaction = zone.controllingFaction;
      const previousDefenderId = zone.capturedBy;
      zone.controllingFaction = account.factionId;
      zone.capturedBy = req.user.id;
      zone.capturedAt = new Date().toISOString();
      zone.influence = { [account.factionId]: CAPTURE_AT };
      result.captured = true;

      // ELO duel vs the previous defender of this zone
      if (previousDefenderId && previousDefenderId !== req.user.id) {
        const defender = await db.findById('accounts', previousDefenderId);
        if (defender && defender.factionId !== account.factionId) {
          const duel = await eloDuel(account, defender, 1);
          account.arena_rating = duel.newRatingA;
          account.arena_games = (account.arena_games || 0) + 1;
          result.elo = { delta: duel.deltaA, rating: duel.newRatingA, rank: rating.getRank(duel.newRatingA) };
          await events.emit('elo_change', {
            actorId: req.user.id, attacker: account.username,
            delta: duel.deltaB, rating: duel.newRatingB, zoneId: zone.id,
          }, { userId: previousDefenderId });
        }
      }

      if (previousFaction) {
        await events.emit('zone_captured', {
          actorId: req.user.id, attacker: account.username,
          attackerFaction: account.factionId, zoneId: zone.id,
        }, { factionId: previousFaction });
      }
    } else if (isEnemyZone) {
      // Contested step on enemy territory — warn the owners (throttled per zone: max 1/5min)
      const lastWarn = zone.lastAttackWarnAt ? new Date(zone.lastAttackWarnAt).getTime() : 0;
      if (Date.now() - lastWarn > 300000) {
        zone.lastAttackWarnAt = new Date().toISOString();
        await events.emit('zone_attacked', {
          actorId: req.user.id, attacker: account.username, zoneId: zone.id,
          influence: zone.influence[account.factionId],
        }, { factionId: zone.controllingFaction });
      }
    }
    await db.update('zones', zone.id, zone);

    account.gridCoins = (account.gridCoins || 0) + 2;
    account.xp = (account.xp || 0) + 4;
    result.gridCoins = account.gridCoins;
  }

  // Мина: в Режиме Ниндзя автоматический подрыв ОТКЛЮЧЁН
  if (!ninja && zone.activeTrap && zone.activeTrap.placedBy !== req.user.id) {
    const placedByAccount = await db.findById('accounts', zone.activeTrap.placedBy);
    if (placedByAccount && placedByAccount.factionId !== account.factionId) {
      const hasShield = (await getInventory(req.user.id))?.items?.shield > 0;
      if (hasShield) {
        await useInventoryItem(req.user.id, 'shield');
        result.trapHit = { type: zone.activeTrap.type, damage: 0, blocked: true };
      } else {
        const dmg = zone.activeTrap.damage || 25;
        const inTrip = account.is_in_trip === true;
        account.hp = Math.max(inTrip ? 1 : 0, (account.hp || 100) - dmg);
        result.trapHit = { type: zone.activeTrap.type, damage: dmg, blocked: false, tripProtected: inTrip && account.hp === 1 };
        result.hp = account.hp;

        await events.emit('trap_triggered', {
          actorId: req.user.id, victim: account.username, zoneId: zone.id, damage: dmg,
        }, { userId: zone.activeTrap.placedBy });

        if (account.hp <= 0) {
          await applyDeath(account, result);
          // Death by trap = lost ELO duel vs the trap owner
          const duel = await eloDuel(placedByAccount, account, 1);
          result.elo = { delta: duel.deltaB, rating: duel.newRatingB, rank: rating.getRank(duel.newRatingB) };
        }
      }
      // Destroy trap after trigger
      await db.update('zones', zone.id, { activeTrap: null });
    }
  }

  // Save account state
  await db.update('accounts', req.user.id, { hp: account.hp, gridCoins: account.gridCoins, xp: account.xp, is_dead: !!account.is_dead });

  // Mission triggers (операции/директивы)
  try {
    const missionResults = [];
    missionResults.push(...await missionEngine.handleEvent(req.user.id, 'arena_step', {
      enemyZone: isEnemyZone,
      influenceGained: account.factionId && !isEnemyHq && !isOwnZone ? 2 : 0,
    }));
    if (result.captured) {
      missionResults.push(...await missionEngine.handleEvent(req.user.id, 'zone_captured', {
        onlineSumLevel: await onlineSumLevel(account.factionId),
      }));
    }
    if (result.trapHit?.blocked) {
      missionResults.push(...await missionEngine.handleEvent(req.user.id, 'mine_neutralized', { method: 'shield' }));
    }
    if (result.deathPenalty) {
      await missionEngine.handleEvent(req.user.id, 'death', {});
    }
    if (missionResults.length > 0) result.completedMissions = missionResults;
  } catch (e) {
    console.warn('[missions] arena trigger failed:', e.message);
  }

  res.json({ success: true, ...result });
});

// Арена очищена от бустеров и усилений: остались только предметы,
// понятные из обучения — щит (пассивно блокирует мину) и аптечка.
router.post('/use-item', async (req, res) => {
  const { itemType } = req.body;
  if (!itemType) return res.status(400).json({ success: false, message: 'itemType required' });

  const validItems = ['shield', 'medpack'];
  if (!validItems.includes(itemType)) return res.status(400).json({ success: false, message: 'Invalid item type' });

  const inv = await getInventory(req.user.id);
  if (!inv.items?.[itemType] || inv.items[itemType] <= 0) {
    return res.status(400).json({ success: false, message: 'Item not available' });
  }

  const account = await db.findById('accounts', req.user.id);
  if (itemType === 'medpack') {
    account.hp = Math.min(100, (account.hp || 0) + 30);
    await db.update('accounts', req.user.id, { hp: account.hp });
  }
  // shield: passive, consumed automatically in /step

  if (itemType === 'medpack') {
    inv.items[itemType] -= 1;
    await db.update('inventories', inv.id, inv);
  }

  res.json({ success: true, item: itemType, remaining: inv.items[itemType], hp: account.hp });
});

// Тактический Сканер (бесплатный инструмент Режима Ниндзя):
// подсвечивает вражеские мины в радиусе 150 метров.
router.post('/scan', async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng required' });

  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'User not found' });

  const zones = await db.load('zones');
  const traps = [];
  for (const z of zones) {
    if (!z.activeTrap) continue;
    // Свои мины не показываем как угрозы
    const owner = await db.findById('accounts', z.activeTrap.placedBy);
    if (owner && account.factionId && owner.factionId === account.factionId) continue;
    const tLat = z.activeTrap.lat ?? (z.geometry?.coordinates?.[0] || []).reduce((s, c) => s + c[1], 0) / (z.geometry?.coordinates?.[0]?.length || 1);
    const tLng = z.activeTrap.lng ?? (z.geometry?.coordinates?.[0] || []).reduce((s, c) => s + c[0], 0) / (z.geometry?.coordinates?.[0]?.length || 1);
    if (haversine(parseFloat(lat), parseFloat(lng), tLat, tLng) <= 0.15) {
      traps.push({ zoneId: z.id, lat: tLat, lng: tLng });
    }
  }
  res.json({ success: true, traps, radiusM: 150 });
});

// Разминирование после мини-игры с проводами. Сервер проверяет дистанцию
// (<10 м с допуском GPS), удаляет мину, даёт +15 XP на общий уровень и шлёт
// пуш-алерт фракции-владельцу — без координат и имени саботажника.
router.post('/defuse', async (req, res) => {
  const { zoneId, lat, lng } = req.body;
  if (!zoneId || !lat || !lng) return res.status(400).json({ success: false, message: 'zoneId, lat, lng required' });

  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'User not found' });
  if (account.is_dead && (account.hp || 0) <= 0) {
    return res.status(400).json({ success: false, message: 'Ты выведен из строя' });
  }

  const zone = await db.findOne('zones', { id: zoneId }) || await db.findById('zones', zoneId);
  if (!zone || !zone.activeTrap) return res.status(404).json({ success: false, message: 'Мины здесь нет' });

  const owner = await db.findById('accounts', zone.activeTrap.placedBy);
  if (owner && account.factionId && owner.factionId === account.factionId) {
    return res.status(400).json({ success: false, message: 'Это мина твоей банды' });
  }

  const tLat = zone.activeTrap.lat ?? (zone.geometry?.coordinates?.[0] || []).reduce((s, c) => s + c[1], 0) / (zone.geometry?.coordinates?.[0]?.length || 1);
  const tLng = zone.activeTrap.lng ?? (zone.geometry?.coordinates?.[0] || []).reduce((s, c) => s + c[0], 0) / (zone.geometry?.coordinates?.[0]?.length || 1);
  const distM = haversine(parseFloat(lat), parseFloat(lng), tLat, tLng) * 1000;
  if (distM > 10) {
    return res.status(400).json({ success: false, message: `Слишком далеко от мины (${Math.round(distM)} м)` });
  }

  const ownerFactionId = owner?.factionId || null;
  await db.update('zones', zone.id, { activeTrap: null });

  account.xp = (account.xp || 0) + 15;
  const newLevel = Math.floor(account.xp / 1000) + 1;
  if (newLevel > (account.level || 1)) account.level = newLevel;
  await db.update('accounts', req.user.id, { xp: account.xp, level: account.level });

  // Пуш-алерт защитникам: координаты и имя саботажника не раскрываются
  if (ownerFactionId) {
    await events.emit('perimeter_breached', {
      actorId: req.user.id, zoneId: zone.id, zoneName: zone.name || zone.id,
    }, { factionId: ownerFactionId });
  }

  let completedMissions = [];
  try {
    completedMissions = await missionEngine.handleEvent(req.user.id, 'mine_neutralized', { method: 'defuse' });
  } catch {}

  res.json({ success: true, xpAwarded: 15, xp: account.xp, completedMissions });
});

router.post('/trade/initiate', async (req, res) => {
  const { targetUserId, itemsToOffer, itemsToRequest } = req.body;
  if (!targetUserId || !itemsToOffer || !itemsToRequest) {
    return res.status(400).json({ success: false, message: 'targetUserId, itemsToOffer, itemsToRequest required' });
  }

  const SAFE_ZONES = [
    { lat: 55.7558, lng: 37.6173, radius: 0.3 }, // Moscow center
    { lat: 59.9343, lng: 30.3351, radius: 0.3 }, // SPb center
    { lat: 55.0302, lng: 82.9204, radius: 0.3 }, // Novosibirsk
  ];

  const account = await db.findById('accounts', req.user.id);
  const target = await db.findById('accounts', targetUserId);
  if (!target) return res.status(404).json({ success: false, message: 'Target user not found' });

  const locations = await db.load('locations');
  const myLast = locations.filter(l => l.user_id === req.user.id).sort((a, b) => b.timestamp - a.timestamp)[0];
  const targetLast = locations.filter(l => l.user_id === targetUserId).sort((a, b) => b.timestamp - a.timestamp)[0];

  if (!myLast || !targetLast) return res.status(400).json({ success: false, message: 'Location data missing' });

  const inSafeZone = SAFE_ZONES.some(sz =>
    haversine(myLast.latitude, myLast.longitude, sz.lat, sz.lng) <= sz.radius &&
    haversine(targetLast.latitude, targetLast.longitude, sz.lat, sz.lng) <= sz.radius
  );

  if (!inSafeZone) return res.status(400).json({ success: false, message: 'Both players must be in a Safe Zone' });

  const myInv = await db.findOne('inventories', { userId: req.user.id });
  const targetInv = await db.findOne('inventories', { userId: targetUserId });

  if (!myInv || !targetInv) return res.status(400).json({ success: false, message: 'Inventory error' });

  for (const [item, qty] of Object.entries(itemsToOffer)) {
    if ((myInv.items[item] || 0) < qty) return res.status(400).json({ success: false, message: `Not enough ${item}` });
  }
  for (const [item, qty] of Object.entries(itemsToRequest)) {
    if ((targetInv.items[item] || 0) < qty) return res.status(400).json({ success: false, message: `Target lacks ${item}` });
  }

  for (const [item, qty] of Object.entries(itemsToOffer)) {
    myInv.items[item] -= qty;
    targetInv.items[item] = (targetInv.items[item] || 0) + qty;
  }
  for (const [item, qty] of Object.entries(itemsToRequest)) {
    targetInv.items[item] -= qty;
    myInv.items[item] = (myInv.items[item] || 0) + qty;
  }

  await db.update('inventories', myInv.id, myInv);
  await db.update('inventories', targetInv.id, targetInv);

  await events.emit('trade_received', {
    actorId: req.user.id, from: account?.username || 'Player',
    received: itemsToOffer, given: itemsToRequest,
  }, { userId: targetUserId });

  res.json({ success: true, myInventory: myInv.items });
});

// Matchmaking: opponents within ±200 ELO, active in the last hour, other factions
router.get('/matchmaking', async (req, res) => {
  const me = await db.findById('accounts', req.user.id);
  if (!me) return res.status(404).json({ success: false, message: 'User not found' });

  const myRating = rating.getRating(me);
  const accounts = await db.load('accounts');
  const locations = await db.load('locations');
  const hourAgo = Date.now() - 3600000;

  const lastSeen = {};
  for (const l of locations) {
    if (!lastSeen[l.user_id] || l.timestamp > lastSeen[l.user_id].timestamp) lastSeen[l.user_id] = l;
  }
  const myLoc = lastSeen[req.user.id];

  const opponents = accounts
    .filter(a => a.id !== req.user.id && !a.isBanned)
    .filter(a => !me.factionId || a.factionId !== me.factionId)
    .map(a => ({ account: a, rating: rating.getRating(a), loc: lastSeen[a.id] }))
    .filter(o => Math.abs(o.rating - myRating) <= 200)
    .filter(o => o.loc && o.loc.timestamp > hourAgo)
    .map(o => ({
      id: o.account.id,
      username: o.account.username,
      rating: o.rating,
      rank: rating.getRank(o.rating),
      faction: o.account.factionName || null,
      quality: rating.matchQuality(myRating, o.rating),
      distanceKm: myLoc ? Math.round(haversine(myLoc.latitude, myLoc.longitude, o.loc.latitude, o.loc.longitude) * 10) / 10 : null,
    }))
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
    .slice(0, 20);

  res.json({
    success: true,
    myRating,
    myRank: rating.getRank(myRating),
    myGames: me.arena_games || 0,
    opponents,
  });
});

// Бустеры и платный сканер удалены: сканер теперь бесплатный инструмент
// Режима Ниндзя. Покупаются только понятные из обучения предметы.
const SHOP_PRICES = {
  shield: 50, medpack: 30, trap: 40,
};

router.post('/shop/buy', async (req, res) => {
  const { itemType } = req.body;
  if (!itemType || !SHOP_PRICES[itemType]) {
    return res.status(400).json({ success: false, message: 'Invalid item' });
  }
  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'User not found' });

  const price = SHOP_PRICES[itemType];
  if ((account.gridCoins || 0) < price) {
    return res.status(400).json({ success: false, message: `Need ${price} gridCoins` });
  }

  account.gridCoins -= price;
  await db.update('accounts', req.user.id, { gridCoins: account.gridCoins });

  const inv = await getInventory(req.user.id);
  inv.items[itemType] = (inv.items[itemType] || 0) + 1;
  await db.update('inventories', inv.id, inv);

  res.json({ success: true, item: itemType, gridCoins: account.gridCoins, inventory: inv.items });
});

router.post('/place-trap', async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng required' });

  const account = await db.findById('accounts', req.user.id);
  if (!account?.factionId) return res.status(400).json({ success: false, message: 'Must be in a faction' });

  const inv = await getInventory(req.user.id);
  if (!inv.items?.trap || inv.items.trap <= 0) {
    return res.status(400).json({ success: false, message: 'No traps available' });
  }

  let zone = await db.findOne('zones', {
    geometry: { $geoIntersects: { $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] } } }
  });
  if (!zone) return res.status(400).json({ success: false, message: 'Must be inside a zone' });
  if (zone.activeTrap) return res.status(400).json({ success: false, message: 'Zone already has a trap' });

  // Only allow traps on own faction territory
  if (zone.controllingFaction !== account.factionId) {
    return res.status(403).json({ success: false, message: 'Доступ запрещен. Это не твоя территория' });
  }

  zone.activeTrap = { placedBy: req.user.id, type: 'trap', damage: 25, lat: parseFloat(lat), lng: parseFloat(lng), placedAt: new Date().toISOString() };
  await db.update('zones', zone.id, zone);

  inv.items.trap -= 1;
  await db.update('inventories', inv.id, inv);

  let completedMissions = [];
  try {
    completedMissions = await missionEngine.handleEvent(req.user.id, 'trap_placed', { onOwnTerritory: true });
  } catch (e) {
    console.warn('[missions] trap trigger failed:', e.message);
  }

  res.json({ success: true, zoneId: zone.id, trapsLeft: inv.items.trap, completedMissions });
});

// Daily bonus
router.post('/daily-bonus', async (req, res) => {
  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'User not found' });

  const now = Date.now();
  const lastBonus = account.lastDailyBonus ? new Date(account.lastDailyBonus).getTime() : 0;
  if (now - lastBonus < 86400000) {
    const remaining = Math.ceil((86400000 - (now - lastBonus)) / 3600000);
    return res.status(429).json({ success: false, message: `Бонус будет доступен через ${remaining} ч.` });
  }

  const isVip = account.isVip && account.vipExpiresAt && new Date(account.vipExpiresAt) > new Date();
  const coins = isVip ? 200 : 50;
  account.gridCoins = (account.gridCoins || 0) + coins;
  account.lastDailyBonus = new Date().toISOString();
  await db.update('accounts', req.user.id, { gridCoins: account.gridCoins, lastDailyBonus: account.lastDailyBonus });

  let bonusItem = null;
  if (isVip) {
    const items = ['shield', 'medpack', 'scanner', 'vibe_booster', 'trap'];
    bonusItem = items[Math.floor(Math.random() * items.length)];
    const inv = await getInventory(req.user.id);
    inv.items[bonusItem] = (inv.items[bonusItem] || 0) + 1;
    await db.update('inventories', inv.id, inv);
  }

  res.json({ success: true, coins, isVip, bonusItem, gridCoins: account.gridCoins });
});

module.exports = router;
