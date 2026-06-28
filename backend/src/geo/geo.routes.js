const { Router } = require('express');
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

// Suggest a new POI (crowdsourcing)
router.post('/poi/suggest', authenticate, async (req, res) => {
  const { name, lat, lng, vibe_tags, photo_url, comment } = req.body;
  if (!name || !lat || !lng) return res.status(400).json({ success: false, message: 'name, lat, lng required' });

  const poi = await db.insert('pois', {
    osm_id: 'suggested_' + Date.now(),
    name, lat: parseFloat(lat), lng: parseFloat(lng),
    category: 'suggested',
    vibe_tags: vibe_tags || [],
    tags: {},
    is_active: true,
    approved: false,
    suggested_by: req.user.id,
    suggested_at: new Date().toISOString(),
    photo_url: photo_url || null,
    comment: comment || null,
    base_rating: 50,
    votes: { up: 1, down: 0 },
    voters: { [req.user.id]: 'up' },
    check_in_radius: 30, gold_reward: 30, xp_reward: 15,
  });

  // Reward suggester
  const account = await db.findById('accounts', req.user.id);
  if (account) {
    account.xp = (account.xp || 0) + 50;
    await db.update('accounts', req.user.id, account);
  }

  res.json({ success: true, poi, reward: { xp: 50 } });
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
router.get('/poi/pending', authenticate, requireRole('admin'), async (req, res) => {
  const pending = await db.query('pois', { approved: false, is_active: { $ne: false } });
  res.json({ success: true, pois: pending, count: pending.length });
});

// Generate atmospheric route
router.post('/route/generate', authenticate, (req, res) => {
  const { lat, lng, transport = 'feet', userVibes = [], weather, radius = 2, waypointCount = 3 } = req.body;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng required' });

  const result = generateRoute({ lat: parseFloat(lat), lng: parseFloat(lng), transport, userVibes, weather, radius: parseFloat(radius), waypointCount: parseInt(waypointCount) });

  let totalScore = 0;
  const allPoints = [result.finish, ...result.waypoints].filter(Boolean);
  allPoints.forEach(p => { totalScore += p._score || 0; });

  res.json({
    success: true,
    waypoints: result.waypoints.map(w => ({ id: w.id, name: w.name, lat: w.lat, lng: w.lng, vibe_tags: w.vibe_tags, score: w._score })),
    finish: result.finish ? { id: result.finish.id, name: result.finish.name, lat: result.finish.lat, lng: result.finish.lng, vibe_tags: result.finish.vibe_tags, score: result.finish._score } : null,
    totalScore,
    transport,
    userVibes,
  });
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
router.get('/osm/fetch', authenticate, requireRole('admin'), async (req, res) => {
  const { lat, lng, radius = 2000 } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng required' });

  try {
    const overpassQuery = `[out:json][timeout:25];
    (node["amenity"~"cafe|restaurant|fast_food|bar|pub"](around:${radius},${lat},${lng});
     way["amenity"~"cafe|restaurant|fast_food|bar|pub"](around:${radius},${lat},${lng}););
    out center;`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', body: overpassQuery,
      headers: { 'Content-Type': 'text/plain' },
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
