const db = require('../common/db');
const defs = require('./achievement_defs');

function check(userId) {
  const account = db.findById('accounts', userId);
  if (!account) return { unlocked: [], errors: [] };

  const allLocs = db.query('locations', l => l.user_id === userId)
    .sort((a, b) => a.timestamp - b.timestamp);
  const checkins = db.query('checkins', c => c.user_id === userId);
  const userAchievements = db.query('achievements', a => a.user_id === userId);

  const earnedIds = new Set(userAchievements.map(a => a.achievement_id));
  const stats = computeStats(account, allLocs, checkins);
  const newlyUnlocked = [];
  const errors = [];

  for (const def of defs) {
    if (earnedIds.has(def.id)) continue;
    try {
      const met = checkCondition(def.condition, stats, account, allLocs, checkins);
      if (met) {
        const reward = def.reward || {};
        if (reward.xp) account.xp = (account.xp || 0) + reward.xp;
        if (reward.gold) account.gold = (account.gold || 0) + reward.gold;
        const ach = db.insert('achievements', {
          user_id: userId,
          achievement_id: def.id,
          unlocked_at: Date.now(),
          category: def.category || 'general',
        });
        newlyUnlocked.push({ ...def, unlocked_at: ach.unlocked_at });
      }
    } catch (e) {
      errors.push({ id: def.id, error: e.message });
    }
  }

  if (newlyUnlocked.length > 0) {
    db.update('accounts', userId, account);
  }

  return { unlocked: newlyUnlocked, errors };
}

function computeStats(account, locs, checkins) {
  const trips = buildTrips(locs);
  let totalDistance = 0;
  const distByVehicle = {};
  const tripCount = trips.length;
  let maxSpeed = 0;
  let nightTripCount = 0;
  let arenaTripCount = 0;
  let totalTripTime = 0;

  for (const trip of trips) {
    const pts = trip.points;
    let tripDist = 0;
    for (let i = 1; i < pts.length; i++) {
      tripDist += haversine(pts[i-1].latitude, pts[i-1].longitude, pts[i].latitude, pts[i].longitude);
      const speed = pts[i].speed || 0;
      if (speed > maxSpeed) maxSpeed = speed;
    }
    totalDistance += tripDist;
    const vehicle = trip.vehicle_id || pts[0]?.vehicle_id || 'unknown';
    distByVehicle[vehicle] = (distByVehicle[vehicle] || 0) + tripDist;

    const startH = new Date(trip.startTime || pts[0]?.timestamp).getHours();
    if (startH < 6 || startH >= 22) nightTripCount++;
    if (trip.isArenaMode || pts.some(p => p.isArenaMode)) arenaTripCount++;

    const dur = (trip.endTime || pts[pts.length-1]?.timestamp) - (trip.startTime || pts[0]?.timestamp);
    totalTripTime += dur > 0 ? dur : 0;
  }

  return {
    totalDistance: round(totalDistance),
    distByVehicle,
    tripCount,
    checkinCount: checkins.length,
    maxSpeed: round(maxSpeed),
    nightTripCount,
    arenaTripCount,
    totalTripTime,
    level: account.level || 1,
    xp: account.xp || 0,
    gold: account.gold || 0,
    vip: !!account.vip,
    trapsHit: account.traps_hit || 0,
  };
}

function buildTrips(locs) {
  const trips = [];
  let current = [];
  for (let i = 0; i < locs.length; i++) {
    if (current.length === 0) {
      current.push(locs[i]);
    } else {
      const gap = locs[i].timestamp - current[current.length - 1].timestamp;
      if (gap > 300000) {
        trips.push({ points: [...current], vehicle_id: current[0]?.vehicle_id });
        current = [locs[i]];
      } else {
        current.push(locs[i]);
      }
    }
  }
  if (current.length > 0) trips.push({ points: [...current], vehicle_id: current[0]?.vehicle_id });
  return trips;
}

function checkCondition(cond, stats, account, locs, checkins) {
  if (!cond) return false;

  switch (cond.type) {
    case 'distance_total':
      return stats.totalDistance >= (cond.target || 0);

    case 'distance_vehicle':
      return (stats.distByVehicle[cond.vehicle] || 0) >= (cond.target || 0);

    case 'single_trip_distance':
      return buildTrips(locs).some(t => {
        let d = 0;
        for (let i = 1; i < t.points.length; i++) {
          d += haversine(t.points[i-1].latitude, t.points[i-1].longitude, t.points[i].latitude, t.points[i].longitude);
        }
        return d >= (cond.target || 0);
      });

    case 'trip_count':
      return stats.tripCount >= (cond.target || 0);

    case 'checkin_count':
      return stats.checkinCount >= (cond.target || 0);

    case 'checkin_category':
      return checkins.filter(c => c.category === cond.category).length >= (cond.target || 0);

    case 'night_trip':
      return stats.nightTripCount >= (cond.target || 0);

    case 'max_speed':
      return stats.maxSpeed >= (cond.target || 0);

    case 'arena_trip':
      return stats.arenaTripCount >= (cond.target || 0);

    case 'traps_survived':
      return (account.traps_hit || 0) >= (cond.target || 0);

    case 'level_reached':
      return (account.level || 1) >= (cond.target || 0);

    case 'distance_day':
      return getTodayDistance(locs) >= (cond.target || 0);

    case 'vip':
      return !!account.vip;

    case 'weather_trip':
      return hasWeatherTrip(locs, cond.weather);

    case 'distance_total_hours':
      // total trip time in ms must exceed target hours
      return stats.totalTripTime >= (cond.hours || 0) * 3600000;

    default:
      return false;
  }
}

function getTodayDistance(locs) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayLocs = locs.filter(l => l.timestamp >= todayStart.getTime());
  let d = 0;
  for (let i = 1; i < todayLocs.length; i++) {
    d += haversine(todayLocs[i-1].latitude, todayLocs[i-1].longitude, todayLocs[i].latitude, todayLocs[i].longitude);
  }
  return d;
}

function hasWeatherTrip(locs, weatherType) {
  // Weather is stored per-location if available; fallback to false
  return locs.some(l => l.weather === weatherType);
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function round(v) { return Math.round(v * 100) / 100; }

module.exports = { check, computeStats };
