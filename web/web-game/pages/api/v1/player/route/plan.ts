import type { NextApiRequest, NextApiResponse } from 'next';
import type { RoutePlanRequest, RoutePlanResponse, Place, BucketKey, Vehicle, PlacePref } from '../../../../../src/lib/route-planner/types';
import { SPEEDS, MAX_RADIUS_KM, VISIT_TIMES, DEFAULT_VISIT_TIME, PREF_TAGS, VEHICLE_TAGS, haversineKm, estimateRouteTime, CATEGORY_LABELS } from '../../../../../src/lib/route-planner/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = req.body as RoutePlanRequest;
  const { lat, lng, vehicle, duration, prefs } = body;

  if (!lat || !lng || !vehicle || !duration) {
    return res.status(400).json({ error: 'Missing required fields: lat, lng, vehicle, duration' });
  }

  try {
    // === СТАДИЯ 1: Геокодинг ===
    const city = await reverseGeocode(lat, lng);

    // === СТАДИЯ 2: Поиск и фильтрация локаций ===
    const places = await searchPlaces(city, lat, lng, vehicle as Vehicle, prefs as PlacePref[] | undefined);

    // === СТАДИЯ 3: Тайм-менеджмент и сортировка по бакетам ===
    const speed = SPEEDS[vehicle as Vehicle] || 5;
    const maxRadius = MAX_RADIUS_KM[vehicle as Vehicle] || 5;

    const scored = places
      .map(p => {
        const distance = haversineKm(lat, lng, p.lat, p.lng);
        if (distance > maxRadius) return null;
        const routeTime = estimateRouteTime(distance, speed);
        const visitTime = VISIT_TIMES[p.category] || DEFAULT_VISIT_TIME;
        const totalTime = routeTime + visitTime;
        return { ...p, distance: Math.round(distance * 10) / 10, routeTime, visitTime, totalTime };
      })
      .filter((p): p is Place & { distance: number; routeTime: number; visitTime: number; totalTime: number } => p !== null && p.totalTime <= duration)
      .sort((a, b) => a.totalTime - b.totalTime);

    const bucketKeys: BucketKey[] = ['30_min', '60_min', '120_min'];

    const buckets: Record<BucketKey, Place[]> = { '30_min': [], '60_min': [], '120_min': [] };

    for (const p of scored) {
      if (p.totalTime <= 45) buckets['30_min'].push(p);
      else if (p.totalTime <= 90) buckets['60_min'].push(p);
      else if (p.totalTime <= 150) buckets['120_min'].push(p);
    }

    const response: RoutePlanResponse = {
      city,
      vehicle: vehicle as Vehicle,
      duration,
      places: scored.slice(0, 30),
      buckets,
    };

    res.status(200).json(response);
  } catch (err: any) {
    console.error('Route plan error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
}

// -- Стадия 1 --
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`;
  const r = await fetch(url, { headers: { 'User-Agent': 'GridRunner/1.0' } });
  const data = await r.json();
  return data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || 'Москва';
}

// -- Стадия 2: Nominatim search (быстрее Overpass) --
async function searchPlaces(city: string, lat: number, lng: number, vehicle: Vehicle, prefs?: PlacePref[]): Promise<Place[]> {
  const queryTerms = prefs && prefs.length > 0
    ? prefs.map(p => PREF_TAGS[p]?.join(' OR ') || p)
    : (VEHICLE_TAGS[vehicle] || VEHICLE_TAGS['Пешком']);

  if (queryTerms.length === 0) return fallbackPlaces(city, lat, lng, vehicle, prefs);

  const maxRadius = Math.round((MAX_RADIUS_KM[vehicle] || 5) * 1000);
  const seen = new Set<string>();
  const places: Place[] = [];

  // делаем несколько запросов — по одному на каждый тип места
  for (const term of queryTerms) {
    try {
      const q = term.includes('=')
        ? term.split('=').pop()
        : term;
      if (!q || q.length < 2) continue;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ' ' + city)}&format=json&limit=5&lat=${lat}&lon=${lng}&radius=${maxRadius}&accept-language=ru`;
      const r = await fetch(url, { headers: { 'User-Agent': 'GridRunner/1.0' } });
      if (!r.ok) continue;
      const results = await r.json();
      for (const el of results || []) {
        const id = `nom_${el.osm_type}_${el.osm_id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        if (!el.lat || !el.lon) continue;
        const pLat = parseFloat(el.lat);
        const pLng = parseFloat(el.lon);
        if (isNaN(pLat) || isNaN(pLng)) continue;
        places.push({
          id, name: el.display_name?.split(',')[0] || el.name || q,
          lat: pLat, lng: pLng, osmType: el.osm_type || 'node',
          category: el.type || q,
          tags: el.class ? [`${el.class}=${el.type || ''}`] : [],
          visitTime: 0, routeTime: 0, totalTime: 0, distance: 0,
        });
      }
      // задержка между запросами из вежливости к Nominatim
      await new Promise(r => setTimeout(r, 200));
    } catch {}
  }

  return places.length > 0 ? places : fallbackPlaces(city, lat, lng, vehicle, prefs);
}



// -- Fallback: если Overpass недоступен, генерируем точки вокруг пользователя --
function fallbackPlaces(city: string, lat: number, lng: number, vehicle: Vehicle, prefs?: PlacePref[]): Place[] {
  const count = 6;
  const radiusKm = (MAX_RADIUS_KM[vehicle] || 5) * 0.6;
  const deg = radiusKm / 111;
  const places: Place[] = [];
  const names = prefs && prefs.length > 0
    ? prefs
    : ['park', 'cafe', 'attraction', 'viewpoint', 'museum', 'park'];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.5;
    const dLat = deg * Math.cos(angle) * (0.5 + Math.random() * 0.5);
    const dLng = (deg / Math.cos(lat * Math.PI / 180)) * Math.sin(angle) * (0.5 + Math.random() * 0.5);
    const pref = names[i % names.length];
    const label = CATEGORY_LABELS[pref] || pref;

    places.push({
      id: `fallback_${i}`,
      name: `${label} — ${city}`,
      lat: lat + dLat,
      lng: lng + dLng,
      osmType: 'node',
      category: pref,
      tags: [],
      visitTime: 0,
      routeTime: 0,
      totalTime: 0,
      distance: 0,
    });
  }
  return places;
}
