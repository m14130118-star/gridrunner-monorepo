const { Router } = require('express');
const axios = require('axios');
const db = require('../common/db');
const { authenticate, requireRole } = require('../common/middleware');
const { computeScore, generateRoute } = require('./atmospheric');

const router = Router();

// Public POI endpoints
router.get('/poi', async (req, res) => {
  const { lat, lng, radius = 2, category, vibe } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng required' });

  let pois = await db.load('pois');
  if (category) pois = pois.filter(p => p.category === category);
  if (vibe) pois = pois.filter(p => (p.vibe_tags || []).includes('#' + vibe));

  const latNum = parseFloat(lat), lngNum = parseFloat(lng), r = parseFloat(radius);
  pois = pois.filter(p => haversine(latNum, lngNum, p.lat, p.lng) <= r);

  res.json({ success: true, pois, count: pois.length });
});

// Suggest a new POI (crowdsourcing). No instant reward — that was an XP
// exploit. The point stays pending moderation; XP is granted on approval.
const SUGGEST_DAILY_LIMIT = 10;
router.post('/poi/suggest', authenticate, async (req, res) => {
  const { name, lat, lng, vibe_tags, photo_url, comment } = req.body;
  if (!name || !lat || !lng) return res.status(400).json({ success: false, message: 'name, lat, lng required' });
  const cleanName = String(name).trim().slice(0, 80);
  if (cleanName.length < 2) return res.status(400).json({ success: false, message: 'Название слишком короткое' });
  const latN = parseFloat(lat), lngN = parseFloat(lng);
  if (!isFinite(latN) || !isFinite(lngN) || latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
    return res.status(400).json({ success: false, message: 'Неверные координаты' });
  }

  // Anti-spam: cap suggestions per user per day
  const dayAgo = Date.now() - 86400000;
  const mine = await db.query('pois', { suggested_by: req.user.id });
  const recent = mine.filter(p => p.suggested_at && new Date(p.suggested_at).getTime() > dayAgo);
  if (recent.length >= SUGGEST_DAILY_LIMIT) {
    return res.status(429).json({ success: false, message: 'Лимit на сегодня исчерпан (10 точек)' });
  }
  // Dedupe: reject a near-duplicate suggestion within 40 m
  const dup = mine.find(p => haversine(latN, lngN, p.lat, p.lng) * 1000 < 40);
  if (dup) return res.status(409).json({ success: false, message: 'Такая точка уже предложена рядом' });

  const poi = await db.insert('pois', {
    osm_id: 'suggested_' + Date.now(),
    name: cleanName, lat: latN, lng: lngN,
    category: 'suggested',
    vibe_tags: Array.isArray(vibe_tags) ? vibe_tags.slice(0, 4) : [],
    tags: {},
    is_active: true,
    approved: false,           // stays pending until a moderator approves
    suggested_by: req.user.id,
    suggested_at: new Date().toISOString(),
    photo_url: photo_url || null,
    comment: comment ? String(comment).slice(0, 200) : null,
    base_rating: 50,
    votes: { up: 0, down: 0 },
    voters: {},
    check_in_radius: 30, gold_reward: 30, xp_reward: 15,
  });

  res.json({ success: true, poi: { id: poi.id, name: poi.name }, pending: true, message: 'Точка отправлена на модерацию' });
});

// Vote on a POI
router.post('/poi/:id/vote', authenticate, async (req, res) => {
  const { vote } = req.body; // 'up' or 'down'
  if (!['up', 'down'].includes(vote)) return res.status(400).json({ success: false, message: 'vote must be up or down' });

  const pois = await db.load('pois');
  const idx = pois.findIndex(p => p.id === parseInt(req.params.id) || p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'POI not found' });

  const poi = pois[idx];
  if (!poi.voters) poi.voters = {};
  if (!poi.votes) poi.votes = { up: 0, down: 0 };

  const userIdStr = String(req.user.id);
  const prevVote = poi.voters[userIdStr];

  if (prevVote) {
    poi.votes[prevVote] = Math.max(0, poi.votes[prevVote] - 1);
  }

  poi.votes[vote] = (poi.votes[vote] || 0) + 1;
  poi.voters[userIdStr] = vote;

  // Auto-approve: 5 net upvotes
  const netVotes = (poi.votes.up || 0) - (poi.votes.down || 0);
  if (netVotes >= 5 && poi.approved === false) {
    poi.approved = true;
    poi.approved_at = new Date().toISOString();
  }
  // Auto-reject: 3 net downvotes
  if (netVotes <= -3) {
    poi.approved = false;
    poi.is_active = false;
  }

  await db.update('pois', poi.id, poi);
  res.json({ success: true, votes: poi.votes, approved: poi.approved });
});

// Get pending suggestions (for mod view)
router.get('/poi/pending', authenticate, requireRole('admin', 'SUPER_ADMIN'), async (req, res) => {
  const pending = await db.query('pois', { approved: false, is_active: { $ne: false } });
  res.json({ success: true, pois: pending, count: pending.length });
});

// Moderate a suggested POI. Approve → activate it and reward the author with
// XP (this is where the reward lives now, not at submission time). Reject →
// deactivate. Admin only.
const APPROVE_XP = 30;
router.post('/poi/:id/moderate', authenticate, requireRole('admin', 'SUPER_ADMIN'), async (req, res) => {
  const { action } = req.body; // 'approve' | 'reject'
  const pois = await db.load('pois');
  const poi = pois.find(p => String(p.id) === String(req.params.id));
  if (!poi) return res.status(404).json({ success: false, message: 'POI not found' });

  if (action === 'approve') {
    await db.update('pois', poi.id, { approved: true, is_active: true, approved_at: new Date().toISOString(), approved_by: req.user.id });
    if (poi.suggested_by && !poi.reward_paid) {
      const author = await db.findById('accounts', poi.suggested_by);
      if (author) await db.update('accounts', author.id, { xp: (author.xp || 0) + APPROVE_XP });
      await db.update('pois', poi.id, { reward_paid: true });
    }
    return res.json({ success: true, approved: true, rewardedXp: APPROVE_XP });
  }
  if (action === 'reject') {
    await db.update('pois', poi.id, { approved: false, is_active: false, rejected_at: new Date().toISOString() });
    return res.json({ success: true, approved: false });
  }
  res.status(400).json({ success: false, message: 'action must be approve or reject' });
});

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const VIBE_NAMES = {
  aggressive: ['Гаражный кооператив', 'Промышленная зона', 'Граффити-стена', 'Заброшенный цех', 'Ж/д переезд'],
  cruise: ['Набережная реки', 'Городской парк', 'Центральная площадь', 'Тенистый сквер', 'Липовая аллея'],
  dark: ['Тёмный переулок', 'Подземный переход', 'Старый тоннель', 'Заводской двор', 'Крыша высотки'],
  scenic: ['Смотровая площадка', 'Пешеходный мост', 'Холм за рекой', 'Панорамный вид', 'Старый квартал'],
  urban: ['Двор-колодец', 'Пешеходная улица', 'Аркада', 'Мурал на стене', 'Торговый центр'],
  explore: ['Заброшенный дом', 'Лесная тропа', 'Пустырь за заводом', 'Секретный дворик', 'Лесопарковая зона'],
};

function generateCirclePoints(centerLat, centerLng, durationMinutes, vibe, needEat, speedMpm = 80, roundTrip = true) {
  const totalDistMeters = durationMinutes * speedMpm;
  const pointsCount = Math.max(3, Math.min(6, Math.floor(durationMinutes / 15)));
  const segments = roundTrip ? pointsCount : Math.max(1, pointsCount - 1);
  // chord = 2 * R * sin(π / n), total = segments * chord => R = totalDist / (segments * 2 * sin(π / n))
  const angleStep = Math.PI / pointsCount;
  const chordFactor = 2 * Math.sin(angleStep);
  let radiusMeters = segments > 0 ? totalDistMeters / (segments * chordFactor) : totalDistMeters / 2;
  radiusMeters = Math.min(8000, Math.max(200, radiusMeters));

  const pool = VIBE_NAMES[vibe] || VIBE_NAMES.cruise;
  const points = [];

  for (let i = 0; i < pointsCount; i++) {
    const angle = (i * 2 * Math.PI) / pointsCount + (Math.random() - 0.5) * 0.4;
    const distance = radiusMeters * (0.4 + Math.random() * 0.6);
    const latOffset = (distance * Math.cos(angle)) / 111111;
    const lngOffset = (distance * Math.sin(angle)) / (111111 * Math.cos(centerLat * Math.PI / 180));
    const isEat = needEat && i === Math.floor(pointsCount / 2);

    points.push({
      name: isEat ? 'Локальный стритфуд' : (pool[i % pool.length]),
      vibe: isEat ? 'eat' : vibe,
      lat: +(centerLat + latOffset).toFixed(6),
      lng: +(centerLng + lngOffset).toFixed(6),
    });
  }
  return points;
}

const OSRM_MAP = { feet: 'foot', bicycle: 'cycling', car: 'driving', skateboard: 'foot' };

const SPEED_MAP = { feet: 80, skateboard: 200, bicycle: 350, car: 800 };

// ── Trip engine v2: real POI hunting ────────────────────────────────
// Each vibe maps to OSM selectors for genuinely interesting places,
// not just whatever cafe happens to be nearby.
// Always-searched high-value places, merged into every vibe so even quiet
// areas (e.g. small towns in Krasnodar region) surface something real.
const BASE_OSM = [
  'tourism=viewpoint', 'tourism=attraction', 'tourism=artwork', 'tourism=museum', 'tourism=gallery',
  'historic=monument', 'historic=memorial', 'historic=castle', 'historic=fort', 'historic=ruins',
  'leisure=park', 'leisure=garden', 'leisure=nature_reserve',
  'natural=peak', 'natural=beach', 'natural=waterfall', 'waterway=waterfall',
  'amenity=fountain', 'place=square',
];
const VIBE_OSM = {
  scenic: ['tourism=viewpoint', 'natural=peak', 'natural=beach', 'natural=waterfall', 'leisure=park', 'leisure=nature_reserve', 'tourism=attraction'],
  cruise: ['leisure=park', 'leisure=garden', 'amenity=fountain', 'tourism=attraction', 'natural=beach'],
  urban: ['tourism=artwork', 'historic=memorial', 'place=square', 'amenity=marketplace', 'tourism=gallery', 'tourism=museum'],
  dark: ['historic=ruins', 'historic=fort', 'historic=memorial', 'tourism=artwork', 'amenity=nightclub'],
  explore: ['historic=ruins', 'historic=archaeological_site', 'historic=castle', 'tourism=attraction', 'natural=peak', 'leisure=nature_reserve'],
  aggressive: ['leisure=pitch', 'leisure=track', 'tourism=artwork', 'amenity=marketplace', 'natural=peak'],
};
const FOOD_OSM = ['amenity=cafe', 'amenity=restaurant', 'amenity=fast_food', 'amenity=bar', 'amenity=food_court'];

// How valuable a POI category is for a route (higher = more "meta")
const CATEGORY_SCORE = {
  waterfall: 44, viewpoint: 40, peak: 38, attraction: 32, castle: 34, artwork: 28,
  museum: 26, gallery: 24, ruins: 26, monument: 24, fort: 26, nature_reserve: 30,
  memorial: 20, square: 22, park: 20, garden: 18, fountain: 16,
  marketplace: 14, beach: 30, archaeological_site: 26, nightclub: 14,
  pitch: 10, track: 10, cafe: 12, restaurant: 12, fast_food: 8, bar: 10, food_court: 8,
};

function osmCategory(tags) {
  if (!tags) return null;
  for (const key of ['tourism', 'historic', 'leisure', 'amenity', 'natural', 'waterway', 'place']) {
    if (tags[key] && CATEGORY_SCORE[tags[key]] !== undefined) return tags[key];
  }
  return null;
}

function scorePoi(p, vibe) {
  let s = CATEGORY_SCORE[p.category] || 5;
  if (p.name) s += 25; else s -= 15;
  if ((VIBE_OSM[vibe] || []).some(sel => sel.endsWith('=' + p.category))) s += 15;
  if (p.base_rating) s += (p.base_rating - 50) / 5;
  const net = (p.votes?.up || 0) - (p.votes?.down || 0);
  s += net * 3;
  return s;
}

const CATEGORY_FALLBACK_NAME = {
  viewpoint: 'Смотровая точка', artwork: 'Стрит-арт', fountain: 'Фонтан',
  park: 'Парк', garden: 'Сквер', square: 'Площадь', pitch: 'Спортплощадка',
  track: 'Трек', memorial: 'Мемориал', monument: 'Монумент',
  waterfall: 'Водопад', peak: 'Вершина', beach: 'Пляж', nature_reserve: 'Заповедник',
  museum: 'Музей', gallery: 'Галерея', castle: 'Замок', fort: 'Крепость', ruins: 'Руины',
};

// Fetch a pool of real POIs around a center via Overpass (with tile cache)
async function fetchOsmPool(lat, lng, radiusM, vibe, includeFood) {
  // Vibe-specific selectors first, then the always-on base set, deduped
  const selectors = [...new Set([...(VIBE_OSM[vibe] || VIBE_OSM.cruise), ...BASE_OSM])];
  if (includeFood) selectors.push(...FOOD_OSM);

  const tileKey = `v2_${vibe}${includeFood ? '_f' : ''}_${Math.round(lat / 0.02)}_${Math.round(lng / 0.02)}`;
  const OSM_TILE_TTL = 7 * 86400000;
  try {
    const tile = await db.findOne('osm_tiles', { key: tileKey });
    if (tile && Date.now() - tile.fetched_at < OSM_TILE_TTL) return null; // pool already in DB
  } catch {}

  const parts = selectors.map(sel => {
    const [k, v] = sel.split('=');
    return `nwr["${k}"="${v}"](around:${Math.round(radiusM)},${lat},${lng});`;
  }).join('\n');
  const query = `[out:json][timeout:8];(${parts});out center 80;`;

  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8500);
    // Overpass rejects requests without a proper User-Agent (406)
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GridRunner/2.0 (https://gridrunner.duckdns.org; route generator)',
      },
      signal: ac.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const data = await r.json();
    const seen = new Set();
    const pois = [];
    for (const el of (data.elements || [])) {
      const c = el.center || el;
      if (!c.lat || !c.lon) continue;
      const cat = osmCategory(el.tags);
      if (!cat) continue;
      // Only keep places with a REAL name. Unnamed geometry never becomes a
      // named checkpoint — those slots fall back to a neutral "Точка N".
      const name = (el.tags?.name || '').trim();
      if (!name) continue;
      const key = `${c.lat.toFixed(4)}_${c.lon.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pois.push({
        osm_id: 'osm_' + el.type + '_' + el.id,
        name, lat: c.lat, lng: c.lon, category: cat,
        tags: el.tags || {}, is_active: true, approved: true,
        base_rating: 50, check_in_radius: 30, gold_reward: 30, xp_reward: 15,
        vibe_tags: ['#' + vibe],
        created_at: new Date().toISOString(),
      });
    }
    // Persist pool + mark tile fetched (empty result counts too)
    for (const p of pois) {
      const exists = await db.findOne('pois', { osm_id: p.osm_id });
      if (!exists) await db.insert('pois', p);
    }
    const existingTile = await db.findOne('osm_tiles', { key: tileKey });
    if (existingTile) await db.update('osm_tiles', existingTile.id, { fetched_at: Date.now() });
    else await db.insert('osm_tiles', { key: tileKey, fetched_at: Date.now() });
    return pois;
  } catch (e) {
    console.warn('[trip-v2] Overpass failed:', e.message);
    return null;
  }
}

// Ideal slot positions the route should pass through.
// radiusScale tweaks only the circle size on the duration-fit retry,
// keeping the checkpoint count stable.
function buildSlots(start, end, durationMinutes, speedMpm, roundTrip, radiusScale = 1) {
  const n = Math.max(3, Math.min(6, Math.floor(durationMinutes / 15)));
  const slots = [];
  if (end) {
    // Corridor A→B: intermediate slots on the straight line, last slot is B
    for (let i = 1; i < n; i++) {
      const f = i / n;
      slots.push({ lat: start.lat + (end.lat - start.lat) * f, lng: start.lng + (end.lng - start.lng) * f, isFinish: false });
    }
    slots.push({ lat: end.lat, lng: end.lng, isFinish: true });
    return slots;
  }
  const totalDist = durationMinutes * speedMpm * radiusScale;
  const segments = roundTrip ? n : Math.max(1, n - 1);
  const chord = 2 * Math.sin(Math.PI / n);
  let radius = segments > 0 ? totalDist / (segments * chord) : totalDist / 2;
  radius = Math.min(8000, Math.max(250, radius));
  const rot = Math.random() * 2 * Math.PI;
  const count = roundTrip ? n : n - 1;
  for (let i = 0; i < Math.max(2, count); i++) {
    const angle = rot + (i * 2 * Math.PI) / n;
    slots.push({
      lat: start.lat + (radius * Math.cos(angle)) / 111111,
      lng: start.lng + (radius * Math.sin(angle)) / (111111 * Math.cos(start.lat * Math.PI / 180)),
      isFinish: false,
      radius,
    });
  }
  return slots;
}

// Assign the best real POI to each slot. If none is nearby, emit an honest
// "unknown" checkpoint (no invented name) so the client can label it neutrally.
function assignPois(slots, pool, vibe, eat) {
  const used = new Set();
  const slotRadiusM = (slot) => Math.min(1400, Math.max(500, (slot.radius || 1000) * 0.55));
  const foodIdx = eat ? Math.floor(slots.length / 2) : -1;

  return slots.map((slot, i) => {
    if (slot.isFinish) {
      return { name: 'Точка B', vibe, lat: slot.lat, lng: slot.lng, kind: 'finish', real: true };
    }
    const wantFood = i === foodIdx;
    const candidates = pool
      .filter(p => !used.has(p.osm_id || p.id))
      .filter(p => wantFood
        ? FOOD_OSM.some(s => s.endsWith('=' + p.category))
        : !FOOD_OSM.some(s => s.endsWith('=' + p.category)))
      .map(p => ({ p, d: haversine(slot.lat, slot.lng, p.lat, p.lng) * 1000 }))
      .filter(x => x.d <= slotRadiusM(slot))
      .sort((a, b) => (scorePoi(b.p, vibe) - b.d / 100) - (scorePoi(a.p, vibe) - a.d / 100));

    if (candidates.length > 0) {
      const best = candidates[0].p;
      used.add(best.osm_id || best.id);
      return {
        name: best.name, vibe: wantFood ? 'eat' : vibe,
        lat: best.lat, lng: best.lng,
        kind: wantFood ? 'food' : 'poi', real: true,
      };
    }
    // No real named place here — do NOT invent a name and do NOT fake a food
    // stop. name:null → frontend shows a neutral "Точка N" / "чекин".
    return {
      name: null,
      vibe,
      lat: +slot.lat.toFixed(6), lng: +slot.lng.toFixed(6),
      kind: 'poi', real: false,
    };
  });
}

async function osrmRoute(profile, coords) {
  const coordsStr = coords.map(c => `${c.lng},${c.lat}`).join(';');
  const r = await axios.get(
    `https://router.project-osrm.org/route/v1/${profile}/${encodeURIComponent(coordsStr)}?overview=full&geometries=geojson&steps=false`,
    { timeout: 10000 }
  );
  const route = r.data.routes[0];
  return { geometry: route.geometry, distanceM: route.distance, durationS: route.duration };
}

// Trip engine v2: hunts real interesting places (viewpoints, parks, street
// art, historic spots) via Overpass, spreads them along the route shape,
// supports A→B target trips and fits the requested duration via OSRM.
router.post('/route/generate', authenticate, async (req, res) => {
  try {
    const {
      lat, lng, transport = 'feet', userVibes = [], durationMinutes = 30,
      eat = false, roundTrip = true, endPoint = null,
    } = req.body;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng required' });

    const vibe = (userVibes && userVibes.length > 0) ? userVibes[0] : 'cruise';
    const start = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const end = endPoint && endPoint.lat && endPoint.lng
      ? { lat: parseFloat(endPoint.lat), lng: parseFloat(endPoint.lng) }
      : null;
    const speedMpm = SPEED_MAP[transport] || 80;
    const targetDistM = durationMinutes * speedMpm;

    // POI pool: DB first, then Overpass for uncached tiles
    const poolCenter = end
      ? { lat: (start.lat + end.lat) / 2, lng: (start.lng + end.lng) / 2 }
      : start;
    const poolRadiusM = end
      ? Math.max(1500, haversine(start.lat, start.lng, end.lat, end.lng) * 1000 * 0.6 + 800)
      : Math.min(6000, targetDistM * 0.5 + 500);

    // Density check: if we already have plenty of real POIs saved around here,
    // prefer them and skip the external map call (saves API quota). Threshold
    // ≈ 35 named POIs per ~10 km² scaled to the search area.
    let allPois = await db.load('pois');
    const areaKm2 = Math.PI * Math.pow(poolRadiusM / 1000, 2);
    const densityTarget = Math.max(12, Math.round(3.5 * areaKm2)); // ~35 per 10km²
    const localCount = allPois.filter(p =>
      p.is_active !== false && p.approved !== false && p.name && p.lat && p.lng &&
      haversine(poolCenter.lat, poolCenter.lng, p.lat, p.lng) * 1000 <= poolRadiusM
    ).length;

    if (localCount < densityTarget) {
      // Not enough saved points — fetch fresh real places and persist them
      await fetchOsmPool(poolCenter.lat, poolCenter.lng, poolRadiusM, vibe, eat);
      allPois = await db.load('pois');
    }

    const pool = allPois
      .filter(p => p.is_active !== false && p.approved !== false && p.lat && p.lng)
      .filter(p => haversine(poolCenter.lat, poolCenter.lng, p.lat, p.lng) * 1000 <= poolRadiusM * 1.2);

    // Build route: slots → real POIs → OSRM, with one duration-fit retry
    const osrmProfile = OSRM_MAP[transport] || 'foot';
    let checkpoints = null;
    let routeGeometry = null;
    let routeDistanceM = null;
    let routeDurationS = null;

    let radiusScale = 1;
    for (let attempt = 0; attempt < 2; attempt++) {
      const slots = buildSlots(start, end, durationMinutes, speedMpm, roundTrip, radiusScale);
      const cps = assignPois(slots, pool, vibe, eat);
      const coords = [start, ...cps];
      if (roundTrip && !end) coords.push(start);

      try {
        const r = await osrmRoute(osrmProfile, coords);
        checkpoints = cps;
        routeGeometry = r.geometry;
        routeDistanceM = r.distanceM;
        routeDurationS = r.durationS;
        // Fit: if the real road distance strays >35% from target, retry once
        // with scaled radius (only for free-form trips, not A→B)
        const ratio = r.distanceM / targetDistM;
        if (!end && attempt === 0 && (ratio > 1.35 || ratio < 0.6)) {
          radiusScale = Math.min(2, Math.max(0.45, 1 / ratio));
          continue;
        }
        break;
      } catch (osrmErr) {
        console.warn('OSRM failed:', osrmErr.message);
        checkpoints = cps; // keep checkpoints even without road geometry
        break;
      }
    }

    // Persist checkpoints so check-in can validate them
    const tripId = 'trip_' + Date.now();
    const savedCheckpoints = [];
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      // Synthetic points get an honest neutral label — never a fake place name
      const label = cp.name || `Точка ${i + 1}`;
      const saved = await db.insert('checkpoints', {
        trip_id: tripId,
        order: i + 1,
        name: label,
        vibe: cp.vibe,
        kind: cp.kind || 'poi',
        latitude: cp.lat,
        longitude: cp.lng,
        restore_hp: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      });
      savedCheckpoints.push({
        id: saved.id, order: i + 1, name: label, vibe: cp.vibe,
        kind: cp.kind || 'poi', real: !!cp.real, lat: cp.lat, lng: cp.lng,
      });
    }

    // Trip record + death protection while the trip is active
    await db.insert('trips', {
      id: tripId,
      user_id: req.user.id,
      status: 'active',
      transport, vibe, eat,
      roundTrip: !!roundTrip,
      isTargetTrip: !!end,
      target_minutes: durationMinutes,
      route_distance_m: routeDistanceM,
      checkpoint_count: savedCheckpoints.length,
      started_at: new Date().toISOString(),
      start: { lat: start.lat, lng: start.lng },
      end: end || null,
    });
    await db.update('accounts', req.user.id, { is_in_trip: true, active_trip_id: tripId });

    return res.json({
      success: true,
      tripId,
      routeGeometry,
      checkpoints: savedCheckpoints,
      isTargetTrip: !!end,
      stats: {
        targetMinutes: durationMinutes,
        routeKm: routeDistanceM ? Math.round(routeDistanceM / 100) / 10 : null,
        estimatedMinutes: routeDistanceM ? Math.round(routeDistanceM / speedMpm) : null,
        osrmMinutes: routeDurationS ? Math.round(routeDurationS / 60) : null,
        realPoiCount: savedCheckpoints.filter(c => c.real).length,
      },
    });
  } catch (err) {
    console.error('Route generation error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

function mapOsmCategory(tags) {
  if (!tags) return 'other';
  const a = tags.amenity;
  if (['cafe', 'restaurant', 'fast_food'].includes(a)) return 'food';
  if (a === 'bar' || a === 'pub') return 'nightlife';
  if (tags.leisure === 'park') return 'park';
  if (tags.tourism === 'attraction' || tags.tourism === 'viewpoint') return 'view';
  if (tags.shop) return 'shop';
  return 'other';
}

// OSM Overpass proxy — fetch real POI data
router.get('/osm/fetch', authenticate, requireRole('admin', 'SUPER_ADMIN'), async (req, res) => {
  const { lat, lng, radius = 2000 } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng required' });

  try {
    const overpassQuery = `[out:json][timeout:25];
    (node["amenity"~"cafe|restaurant|fast_food|bar|pub"](around:${radius},${lat},${lng});
     way["amenity"~"cafe|restaurant|fast_food|bar|pub"](around:${radius},${lat},${lng}););
    out center;`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', body: 'data=' + encodeURIComponent(overpassQuery),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GridRunner/2.0 (https://gridrunner.duckdns.org; admin poi fetch)',
      },
    });
    const data = await response.json();

    const pois = [];
    for (const el of (data.elements || [])) {
        const c = el.center || el;
        const existing = await db.findOne('pois', { osm_id: el.id.toString() });
        if (existing) continue;

        const poi = {
            osm_id: el.id.toString(),
            name: el.tags?.name || el.tags?.amenity || 'Unknown',
            lat: c.lat, lng: c.lon,
            category: mapOsmCategory(el.tags),
            tags: el.tags || {},
            is_active: true,
            restore_hp: 35, check_in_radius: 30, gold_reward: 50, xp_reward: 25,
            created_at: new Date().toISOString(),
        };
        pois.push(await db.insert('pois', poi));
    }

    res.json({ success: true, fetched: pois.length, pois });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Traps (Arena mode only)
router.post('/traps', authenticate, requireRole('player'), async (req, res) => {
  const { latitude, longitude, radius_km, damage_hp, name, clan_id } = req.body;
  const trap = await db.insert('traps', {
    user_id: req.user.id, latitude, longitude, radius_km: radius_km || 0.015,
    damage_hp: damage_hp || 10, name: name || 'Mine', clan_id, is_active: true,
    created_at: new Date().toISOString(),
  });
  res.json({ success: true, trap });
});

router.get('/traps', authenticate, async (req, res) => {
  const traps = await db.query('traps', { is_active: true });
  res.json({ success: true, traps });
});

router.delete('/traps/:id', authenticate, async (req, res) => {
  await db.remove('traps', parseInt(req.params.id));
  res.json({ success: true });
});

// Districts (PostGIS polygon data) - simplified with center point + radius
router.get('/districts', async (req, res) => {
  const districts = await db.load('districts');
  res.json({ success: true, districts });
});

router.get('/districts/:id/capture', authenticate, async (req, res) => {
  const history = await db.query('capture_history', { district_id: parseInt(req.params.id) });
  res.json({ success: true, history });
});

module.exports = router;
