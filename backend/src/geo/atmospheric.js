const db = require('../common/db');
const { optimizeRoute, scoreRoute, calcDifficultyMultiplier } = require('../engine/routeOptimizer');

const VIBE_TAGS = {
  scenic: ['#scenic', '#view', '#panorama', '#embankment', '#bridge'],
  urban_underground: ['#urban_underground', '#abandoned', '#factory', '#graffiti', '#courtyard'],
  smooth_flow: ['#smooth_flow', '#pavement', '#asphalt', '#pedestrian', '#square'],
  dark_vibe: ['#dark_vibe', '#alley', '#industrial', '#tunnel', '#night'],
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Score for a POI given transport, weather, and music vibe
function computeScore(poi, transport, weather, vibe) {
  let score = poi.base_rating || 50;

  // Transport modifier
  const transportMod = getTransportMod(poi.vibe_tags || [], transport);
  score *= transportMod;

  // Weather modifier
  const weatherMod = getWeatherMod(poi.vibe_tags || [], weather);
  score += weatherMod;

  // Vibe sync modifier
  const vibeMod = getVibeMod(poi.vibe_tags || [], vibe);
  score += vibeMod;

  // Voting boost
  const votes = poi.votes || { up: 0, down: 0 };
  const voteRatio = votes.up + votes.down > 0 ? votes.up / (votes.up + votes.down) : 0.5;
  score *= (0.8 + voteRatio * 0.4);

  return Math.max(0, Math.round(score));
}

function getTransportMod(tags, transport) {
  if (transport === 'skateboard') {
    if (tags.includes('#smooth_flow') || tags.includes('#pavement')) return 3.0;
    if (tags.includes('#gravel') || tags.includes('#broken_asphalt')) return 0.0;
    return 1.0;
  }
  if (transport === 'bicycle') {
    if (tags.includes('#smooth_flow') || tags.includes('#pavement')) return 2.0;
    if (tags.includes('#stairs')) return 0.0;
    return 1.0;
  }
  if (transport === 'car') {
    if (tags.includes('#road') || tags.includes('#highway')) return 2.5;
    if (tags.includes('#pedestrian') || tags.includes('#stairs')) return 0.0;
    return 1.0;
  }
  return 1.0; // feet - universal
}

function getWeatherMod(tags, weather) {
  if (!weather) return 0;
  if (weather === 'rain' || weather === 'thunderstorm') {
    if (tags.includes('#dark_vibe') || tags.includes('#industrial') || tags.includes('#abandoned')) return 30;
    if (tags.includes('#scenic') || tags.includes('#view')) return -30;
  }
  if (weather === 'snow') {
    if (tags.includes('#scenic')) return 40;
    if (tags.includes('#smooth_flow')) return -20;
  }
  if (weather === 'clear' || weather === 'cloudy') {
    if (tags.includes('#scenic')) return 20;
  }
  return 0;
}

function getVibeMod(tags, userVibes) {
  if (!userVibes || userVibes.length === 0) return 0;
  let mod = 0;
  for (const uv of userVibes) {
    const vibeTagMap = {
      aggressive: ['#urban_underground', '#factory', '#graffiti'],
      cruise: ['#smooth_flow', '#embankment', '#road'],
      dark: ['#dark_vibe', '#industrial', '#tunnel', '#night', '#abandoned'],
      scenic: ['#scenic', '#view', '#panorama', '#bridge'],
      urban: ['#urban_underground', '#graffiti', '#courtyard'],
      explore: ['#abandoned', '#alley', '#courtyard', '#bridge'],
    };
    const matchingTags = vibeTagMap[uv] || [];
    if (matchingTags.some(t => tags.includes(t))) mod += 25;
  }
  return mod;
}

// Generate a route with waypoints using TSP optimization
function generateRoute(params) {
  const { lat, lng, transport, userVibes, weather, radius = 2, waypointCount = 3 } = params;
  let pois = db.load('pois').filter(p => p.is_active !== false && p.approved !== false);

  // Compute scores
  const scored = pois.map(p => ({
    ...p,
    _score: computeScore(p, transport, weather, userVibes),
    _dist: haversine(lat, lng, p.lat, p.lng),
  })).filter(p => p._dist <= radius && p._score > 0);

  if (scored.length === 0) return { waypoints: [], finish: null, totalDistance: 0 };

  // Pick finish (highest score, but furthest from start)
  const finish = scored.reduce((best, p) => {
    const distW = p._dist * 0.3;
    const scoreW = p._score * 0.7;
    const val = scoreW + distW;
    return val > (best._val || 0) ? { ...p, _val: val } : best;
  }, scored[0]);

  // Pick candidates for waypoints (highest score, excluding finish)
  const candidates = scored.filter(p => p.id !== finish.id);
  const topN = Math.min(waypointCount + 4, candidates.length);
  const pool = candidates.sort((a, b) => b._score - a._score).slice(0, topN);

  const poolClean = pool.map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, score: p._score, vibe_tags: p.vibe_tags }));

  // Optimize route order with TSP solver
  const optimized = optimizeRoute(poolClean, lat, lng, transport);

  // Take first N waypoints from optimized route
  const limit = Math.min(waypointCount, optimized.ordered.length);
  const waypointIds = new Set();
  const waypoints = [];
  for (const wp of optimized.ordered) {
    if (waypointIds.size >= limit) break;
    if (!waypointIds.has(wp.id)) {
      const original = pool.find(p => p.id === wp.id);
      if (original) {
        waypoints.push(original);
        waypointIds.add(wp.id);
      }
    }
  }

  // Score the final route
  const routeScore = scoreRoute(waypoints, transport);

  return { waypoints, finish, totalDistance: routeScore.totalDistance, estimatedDuration: routeScore.estimatedDuration, difficulty: routeScore.difficulty };
}

module.exports = { computeScore, generateRoute, VIBE_TAGS };
