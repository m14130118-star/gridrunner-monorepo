// Mission (quest) engine: static mission defs + per-user progress in `user_missions`.
// Progress is driven by handleEvent() calls from trip/arena code paths.

const db = require('../common/db');
const events = require('../common/events');

const MISSIONS = [
  // --- Тактические контракты (одиночные) ---
  {
    id: 'pervoprohodec', group: 'contract', title: 'Контракт: Первопроходец',
    desc: 'Заверши трип A→B от 3 км пешком, посетив не менее 4 чекпоинтов с вайбом aesthetic.',
    reward: { coins: 150, xp: 300 },
  },
  {
    id: 'kiber_dozapravka', group: 'contract', title: 'Контракт: Кибер-дозаправка',
    desc: 'Начни трип с фильтром еды «ресторан», остановись в зоне чекпоинта на 7 минут и заверши трип.',
    reward: { coins: 200, xp: 100 },
  },
  {
    id: 'nochnoy_patrul', group: 'contract', title: 'Контракт: Ночной патруль',
    desc: 'Заверши трип от 45 минут на скейтборде или велосипеде, начатый между 22:00 и 04:00.',
    reward: { coins: 250, xp: 400 },
  },
  // --- Боевые операции (арена) ---
  {
    id: 'minnoe_pole', group: 'operation', title: 'Операция: Минное поле',
    desc: 'Установи 5 мин на территории своей банды.',
    reward: { coins: 100, xp: 200, supply: 20 }, target: 5,
  },
  {
    id: 'proryv_blokady', group: 'operation', title: 'Операция: Прорыв блокады',
    desc: 'Подними влияние своей фракции во вражеской зоне с 0 до 50 очков за один заход (без смерти).',
    reward: { coins: 300, xp: 500 }, target: 50,
  },
  {
    id: 'kiber_inzhener', group: 'operation', title: 'Операция: Кибер-инженер',
    desc: 'Нейтрализуй вражескую мину: щитом или разминированием.',
    reward: { coins: 150, xp: 250 },
  },
  // --- Фракционные директивы (командные) ---
  {
    id: 'sindikat', group: 'directive', title: 'Директива: Синдикат',
    desc: 'Захвати зону, доведя влияние банды до 100 очков, пока суммарный уровень участников банды онлайн выше 50.',
    reward: { coins: 500, xp: 600, supply: 50 },
  },
  {
    id: 'ekspansiya', group: 'directive', title: 'Директива: Экспансия',
    desc: 'Удерживай бандой не менее 5 зон непрерывно в течение 24 часов.',
    reward: { coins: 400, xp: 1000 }, target: 5,
  },
];

function getMissionDef(id) {
  return MISSIONS.find(m => m.id === id) || null;
}

async function listForUser(userId) {
  const states = await db.query('user_missions', { user_id: userId });
  return MISSIONS.map(m => {
    const s = states.find(x => x.mission_id === m.id);
    return {
      ...m,
      status: s ? s.status : 'available',
      progress: s?.progress || 0,
      target: m.target || 1,
      completed_at: s?.completed_at || null,
    };
  });
}

async function accept(userId, missionId) {
  const def = getMissionDef(missionId);
  if (!def) return { ok: false, message: 'Unknown mission' };
  const existing = await db.findOne('user_missions', { user_id: userId, mission_id: missionId });
  if (existing) {
    if (existing.status === 'completed') return { ok: false, message: 'Already completed' };
    return { ok: true, mission: existing };
  }
  const rec = await db.insert('user_missions', {
    user_id: userId, mission_id: missionId,
    status: 'active', progress: 0, state: {},
    accepted_at: new Date().toISOString(), completed_at: null,
  });
  return { ok: true, mission: rec };
}

async function award(account, def) {
  account.xp = (account.xp || 0) + (def.reward.xp || 0);
  account.gridCoins = (account.gridCoins || 0) + (def.reward.coins || 0);
  account.gold = (account.gold || 0) + (def.reward.coins || 0);
  const newLevel = Math.floor((account.xp || 0) / 1000) + 1;
  if (newLevel > (account.level || 1)) account.level = newLevel;
  await db.update('accounts', account.id, {
    xp: account.xp, gridCoins: account.gridCoins, gold: account.gold, level: account.level,
  });
  if (def.reward.supply && account.factionId) {
    const faction = await db.findOne('factions', { id: account.factionId });
    if (faction) await db.update('factions', faction.id, { supply: (faction.supply || 0) + def.reward.supply });
  }
  await events.emit('mission_completed', {
    actorId: null, title: def.title, xp: def.reward.xp, coins: def.reward.coins,
  }, { userId: account.id });
}

async function complete(userMission, account, def, results) {
  userMission.status = 'completed';
  userMission.completed_at = new Date().toISOString();
  userMission.progress = def.target || 1;
  await db.update('user_missions', userMission.id, userMission);
  await award(account, def);
  results.push({ id: def.id, title: def.title, reward: def.reward });
}

// type: 'trip_complete' | 'trap_placed' | 'arena_step' | 'mine_neutralized' | 'zone_captured' | 'death'
// Returns list of missions completed by this event.
async function handleEvent(userId, type, data = {}) {
  const active = await db.query('user_missions', { user_id: userId, status: 'active' });
  if (active.length === 0) return [];
  const account = await db.findById('accounts', userId);
  if (!account) return [];
  const results = [];

  for (const um of active) {
    const def = getMissionDef(um.mission_id);
    if (!def) continue;

    switch (def.id) {
      case 'pervoprohodec':
        if (type === 'trip_complete' && data.isTargetTrip && data.km >= 3
            && data.transport === 'feet' && data.vibe === 'aesthetic' && data.cpVisited >= 4) {
          await complete(um, account, def, results);
        }
        break;

      case 'kiber_dozapravka':
        if (type === 'trip_complete' && data.foodPreference === 'restaurant' && data.foodStop7min) {
          await complete(um, account, def, results);
        }
        break;

      case 'nochnoy_patrul':
        if (type === 'trip_complete' && data.minutes >= 45
            && (data.transport === 'skateboard' || data.transport === 'bicycle')
            && (data.startHour >= 22 || data.startHour < 4)) {
          await complete(um, account, def, results);
        }
        break;

      case 'minnoe_pole':
        if (type === 'trap_placed' && data.onOwnTerritory) {
          um.progress = (um.progress || 0) + 1;
          if (um.progress >= def.target) await complete(um, account, def, results);
          else await db.update('user_missions', um.id, { progress: um.progress });
        }
        break;

      case 'proryv_blokady':
        if (type === 'death') {
          await db.update('user_missions', um.id, { progress: 0 });
        } else if (type === 'arena_step' && data.enemyZone && data.influenceGained > 0) {
          um.progress = (um.progress || 0) + data.influenceGained;
          if (um.progress >= def.target) await complete(um, account, def, results);
          else await db.update('user_missions', um.id, { progress: um.progress });
        }
        break;

      case 'kiber_inzhener':
        if (type === 'mine_neutralized') {
          await complete(um, account, def, results);
        }
        break;

      case 'sindikat':
        if (type === 'zone_captured' && (data.onlineSumLevel || 0) > 50) {
          await complete(um, account, def, results);
        }
        break;

      case 'ekspansiya':
        // Checked lazily on any arena step: 5+ zones held continuously for 24h
        if ((type === 'arena_step' || type === 'zone_captured') && account.factionId) {
          const zones = await db.load('zones');
          const dayAgo = Date.now() - 24 * 3600000;
          const held = zones.filter(z =>
            z.controllingFaction === account.factionId &&
            z.capturedAt && new Date(z.capturedAt).getTime() <= dayAgo
          );
          um.progress = held.length;
          if (held.length >= def.target) await complete(um, account, def, results);
          else await db.update('user_missions', um.id, { progress: um.progress });
        }
        break;
    }
  }
  return results;
}

module.exports = { MISSIONS, getMissionDef, listForUser, accept, handleEvent };
