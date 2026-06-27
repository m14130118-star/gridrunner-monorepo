function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildDistanceMatrix(points) {
  const n = points.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversine(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }
  return matrix;
}

function totalRouteDistance(route, matrix) {
  let dist = 0;
  for (let i = 0; i < route.length - 1; i++) {
    dist += matrix[route[i]][route[i + 1]];
  }
  return dist;
}

function nearestNeighbor(matrix, startIdx) {
  const n = matrix.length;
  const visited = new Array(n).fill(false);
  visited[startIdx] = true;
  const route = [startIdx];
  for (let step = 1; step < n; step++) {
    let best = -1;
    let bestDist = Infinity;
    const last = route[route.length - 1];
    for (let i = 0; i < n; i++) {
      if (!visited[i] && matrix[last][i] < bestDist) {
        bestDist = matrix[last][i];
        best = i;
      }
    }
    visited[best] = true;
    route.push(best);
  }
  return route;
}

function twoOpt(route, matrix, maxIterations) {
  let best = route.slice();
  let bestDist = totalRouteDistance(best, matrix);
  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const newRoute = reverseSegment(best, i, k);
        const newDist = totalRouteDistance(newRoute, matrix);
        if (newDist < bestDist) {
          best = newRoute;
          bestDist = newDist;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
    if (!improved) break;
  }
  return best;
}

function reverseSegment(route, i, k) {
  const n = route.length;
  const newRoute = route.slice(0, i);
  for (let j = k; j >= i; j--) {
    newRoute.push(route[j]);
  }
  for (let j = k + 1; j < n; j++) {
    newRoute.push(route[j]);
  }
  return newRoute;
}

const TRANSPORT_SPEEDS = {
  walk: 5,
  bike: 15,
  car: 40,
  e_bike: 25,
  scooter: 20,
};

function estimateDuration(totalDistanceKm, transport) {
  const speed = TRANSPORT_SPEEDS[transport] || TRANSPORT_SPEEDS.walk;
  return (totalDistanceKm / speed) * 60;
}

function computeBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return Math.atan2(y, x);
}

function countTurns(ordered) {
  let turns = 0;
  for (let i = 1; i < ordered.length - 1; i++) {
    const b1 = computeBearing(ordered[i - 1].lat, ordered[i - 1].lng, ordered[i].lat, ordered[i].lng);
    const b2 = computeBearing(ordered[i].lat, ordered[i].lng, ordered[i + 1].lat, ordered[i + 1].lng);
    const diff = Math.abs(b2 - b1);
    if (diff > 0.3) turns++;
  }
  return turns;
}

function estimateElevationChange(ordered) {
  let elev = 0;
  for (let i = 1; i < ordered.length; i++) {
    const d = haversine(ordered[i - 1].lat, ordered[i - 1].lng, ordered[i].lat, ordered[i].lng);
    if (d > 0) elev += d * 0.02;
  }
  return elev;
}

function computeVarietyScore(ordered) {
  const tagCounts = {};
  for (const wp of ordered) {
    if (!wp.vibe) continue;
    const tags = Array.isArray(wp.vibe) ? wp.vibe : [wp.vibe];
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const uniqueTags = Object.keys(tagCounts);
  if (uniqueTags.length === 0) return 0;
  const total = Object.values(tagCounts).reduce((s, v) => s + v, 0);
  const shannon = -Object.values(tagCounts).reduce((s, c) => {
    const p = c / total;
    return s + (p > 0 ? p * Math.log(p) : 0);
  }, 0);
  return Math.min(shannon / Math.log(uniqueTags.length), 1);
}

function optimizeRoute(waypoints, startLat, startLng, transport) {
  if (!waypoints || waypoints.length === 0) {
    return { ordered: [], totalDistance: 0, estimatedDuration: 0 };
  }

  const matrix = buildDistanceMatrix(waypoints);

  const startDists = waypoints.map((wp, i) => ({
    idx: i,
    dist: haversine(startLat, startLng, wp.lat, wp.lng),
  }));
  startDists.sort((a, b) => a.dist - b.dist);
  const startIdx = startDists[0].idx;

  const nnRoute = nearestNeighbor(matrix, startIdx);
  const optimized = twoOpt(nnRoute, matrix, 100);

  const ordered = optimized.map(i => waypoints[i]);
  const totalDistance = totalRouteDistance(optimized, matrix);
  const estimatedDuration = estimateDuration(totalDistance, transport);

  return { ordered, totalDistance: Math.round(totalDistance * 100) / 100, estimatedDuration: Math.round(estimatedDuration * 100) / 100 };
}

function scoreRoute(ordered, transport) {
  if (!ordered || ordered.length === 0) {
    return { totalDistance: 0, duration: 0, difficulty: 1, scoreEfficiency: 0, varietyScore: 0 };
  }

  let totalDistance = 0;
  for (let i = 1; i < ordered.length; i++) {
    totalDistance += haversine(ordered[i - 1].lat, ordered[i - 1].lng, ordered[i].lat, ordered[i].lng);
  }
  totalDistance = Math.round(totalDistance * 100) / 100;

  const duration = Math.round(estimateDuration(totalDistance, transport) * 100) / 100;

  const turns = countTurns(ordered);
  const elevation = estimateElevationChange(ordered);

  let diffScore = 1;
  if (ordered.length > 1) {
    diffScore += Math.min(totalDistance / 10, 3);
    diffScore += Math.min(turns / 5, 2);
    diffScore += Math.min(elevation / 200, 2);
    diffScore += Math.min(ordered.length / 20, 2);
  }
  const difficulty = Math.max(1, Math.min(10, Math.round(diffScore)));

  const totalScore = ordered.reduce((s, wp) => s + (wp.score || 0), 0);
  const scoreEfficiency = totalDistance > 0 ? Math.round((totalScore / totalDistance) * 100) / 100 : 0;

  const varietyScore = Math.round(computeVarietyScore(ordered) * 100) / 100;

  return { totalDistance, duration, difficulty, scoreEfficiency, varietyScore };
}

function calcDifficultyMultiplier(userStats) {
  const base = 1.0;
  const levelFactor = ((userStats.level || 1) / 50) * 0.5;
  const tripFactor = Math.min((userStats.totalTrips || 0) / 100, 1) * 0.3;
  const prefFactor = userStats.preferredDifficulty === 'hard' ? 0.3
    : userStats.preferredDifficulty === 'easy' ? -0.2
    : 0;
  const multiplier = base + levelFactor + tripFactor + prefFactor;
  return Math.max(0.5, Math.min(2.0, multiplier));
}

function balanceReward(reward, economyStats) {
  const { userLevel, totalUsers, avgGoldPerUser, inflationRate } = economyStats;
  if (totalUsers <= 0 || avgGoldPerUser == null) return reward;

  const targetGold = userLevel * 100;
  const ratio = avgGoldPerUser / Math.max(targetGold, 1);

  const mid = 1.5;
  const steepness = 2.5;
  const sigmoid = 1 / (1 + Math.exp(steepness * (ratio - mid)));
  const adjustment = 0.5 + 0.5 * sigmoid;

  const inflAdj = Math.max(0.8, 1 - (inflationRate || 0) * 0.5);

  return Math.round(reward * adjustment * inflAdj);
}

module.exports = {
  optimizeRoute,
  scoreRoute,
  calcDifficultyMultiplier,
  balanceReward,
};
