import { useEffect, useRef, ReactNode } from 'react';

export interface Checkpoint {
  coords: [number, number];
  name: string;
  visited?: boolean;
  icon?: string;
}

interface MapWrapperProps {
  center?: [number, number];
  zoom?: number;
  height?: number;
  checkpoints?: Checkpoint[];
  path?: [number, number][];
  currentPos?: [number, number];
  onClick?: (coords: [number, number]) => void;
  children?: ReactNode;
}

export default function MapWrapper({ center, zoom = 14, height = 300, checkpoints = [], path = [], currentPos, onClick }: MapWrapperProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const pathRef = useRef<any>(null);
  const checkpointRefs = useRef<any[]>([]);
  const posMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;
    let destroyed = false;

    (async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      if (destroyed || !mapRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, {
        center: center || [55.75, 37.62],
        zoom,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      if (onClick) map.on('click', (e: any) => onClick([e.latlng.lat, e.latlng.lng]));

      instanceRef.current = map;
    })();

    return () => { destroyed = true; if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; } };
  }, []);

  useEffect(() => {
    if (instanceRef.current && center) instanceRef.current.setView(center, instanceRef.current.getZoom());
  }, [center?.[0], center?.[1]]);

  useEffect(() => {
    (async () => {
      const L = await import('leaflet');
      const map = instanceRef.current;
      if (!map) return;
      checkpointRefs.current.forEach((m: any) => m.remove());
      checkpointRefs.current = checkpoints.map((cp, i) => {
        const color = cp.visited ? '#00e676' : '#ff9100';
        const icon = L.divIcon({
          html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid #000;display:flex;align-items:center;justify-content:center;color:#000;font-size:11px;font-weight:800;box-shadow:0 0 8px ${color}66">${i + 1}</div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        return L.marker(cp.coords, { icon }).addTo(map);
      });
    })();
  }, [checkpoints]);

  useEffect(() => {
    (async () => {
      const L = await import('leaflet');
      const map = instanceRef.current;
      if (!map) return;
      if (pathRef.current) { pathRef.current.remove(); pathRef.current = null; }
      if (path.length > 1) {
        pathRef.current = L.polyline(path as [number, number][], {
          color: '#00e676', weight: 4, opacity: 0.8,
        }).addTo(map);
        const allCoords = [...(checkpoints.length ? checkpoints.map(c => c.coords) : []), ...(currentPos ? [currentPos] : [])];
        const bounds = L.latLngBounds(path.map(p => L.latLng(p[0], p[1])));
        if (allCoords.length) allCoords.forEach(c => bounds.extend(L.latLng(c[0], c[1])));
        try { map.fitBounds(bounds.pad(0.15)); } catch {}
      }
    })();
  }, [path]);

  useEffect(() => {
    (async () => {
      const L = await import('leaflet');
      const map = instanceRef.current;
      if (!map) return;
      if (posMarkerRef.current) { posMarkerRef.current.remove(); posMarkerRef.current = null; }
      if (currentPos) {
        posMarkerRef.current = L.circleMarker(currentPos as [number, number], {
          radius: 8, color: '#00e676', fillColor: '#00e676', fillOpacity: 1, weight: 2,
        }).addTo(map);
      }
    })();
  }, [currentPos]);

  return <div ref={mapRef} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', zIndex: 1 }} />;
}

/* ---- Scenic Routing Engine ---- */

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371; const dLat = (b[0] - a[0]) * Math.PI / 180; const dLng = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

interface ScenicSpot {
  lat: number; lng: number; name: string; type: string;
}

// find scenic spots near a location via Nominatim
async function findScenicSpots(lat: number, lng: number, radiusKm: number): Promise<ScenicSpot[]> {
  const tags = ['park', 'garden', 'viewpoint', 'water', 'fountain', 'square', 'pedestrian'];
  const results: ScenicSpot[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${tag}&format=json&limit=3&lat=${lat}&lon=${lng}&radius=${Math.round(radiusKm * 1000)}&accept-language=ru`;
      const r = await fetch(url, { headers: { 'User-Agent': 'GridRunner/1.0' } });
      if (!r.ok) continue;
      const data = await r.json();
      for (const el of data || []) {
        const id = `sc_${el.osm_type}_${el.osm_id}`;
        if (seen.has(id) || !el.lat || !el.lon) continue;
        seen.add(id);
        results.push({ lat: parseFloat(el.lat), lng: parseFloat(el.lon), name: el.display_name?.split(',')[0] || el.name || tag, type: el.type || tag });
      }
      await new Promise(r => setTimeout(r, 150));
    } catch {}
  }
  return results;
}

// get OSRM alternatives and pick the most scenic one
function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return Math.atan2(y, x) * 180 / Math.PI;
}

function scenicScore(coords: number[][], from: [number, number], to: [number, number]): number {
  const directDist = haversineKm(from, to);
  if (directDist < 0.01) return 0;
  let turns = 0;
  for (let i = 2; i < coords.length; i++) {
    const a = bearing(coords[i - 2][1], coords[i - 2][0], coords[i - 1][1], coords[i - 1][0]);
    const b = bearing(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
    let diff = Math.abs(a - b);
    if (diff > 180) diff = 360 - diff;
    turns += diff;
  }
  const routeLen = routeLengthKm(coords);
  return routeLen > 0 ? (turns / routeLen) : 0;
}

function routeLengthKm(coords: number[][]): number {
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    len += haversineKm([coords[i-1][1], coords[i-1][0]], [coords[i][1], coords[i][0]]);
  }
  return len;
}

async function pickScenicAlternative(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  const url = `https://router.project-osrm.org/route/v1/foot/${from[1]},${from[0]};${to[1]},${to[0]}?alternatives=3&overview=full&geometries=geojson`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (data.code !== 'Ok' || !data.routes?.length) return [from, to];
    let best = data.routes[0];
    let bestScore = -1;
    for (const rt of data.routes) {
      if (!rt.geometry?.coordinates || rt.geometry.coordinates.length < 2) continue;
      const score = scenicScore(rt.geometry.coordinates, from, to);
      if (score > bestScore) { bestScore = score; best = rt; }
    }
    return best.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
  } catch { return [from, to]; }
}

// OSRM direct route (fallback)
async function osrmRoute(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  const url = `https://router.project-osrm.org/route/v1/foot/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
    }
  } catch {}
  return [from, to];
}

/**
 * Build a scenic multi-point route.
 *
 * For each segment A→B:
 *   - Search scenic spots along the whole corridor (at N interpolation points between A and B)
 *   - Chain them: A → spot1 → spot2 → ... → spotN → B
 *   - Number of spots scales with distance and duration (more time/km = more stops)
 *   - Each sub-segment uses OSRM alternatives + scenic scoring
 */
export async function buildScenicMultiRoute(
  from: [number, number],
  waypoints: [number, number][],
  durationMin: number = 60
): Promise<[number, number][]> {
  const allPoints = [from, ...waypoints];
  let result: [number, number][] = [];

  for (let i = 0; i < allPoints.length - 1; i++) {
    const a = result.length === 0 ? allPoints[i] : result[result.length - 1];
    const b = allPoints[i + 1];
    const dist = haversineKm(a, b);

    // how many scenic stops on this segment (scale with duration and distance)
    const maxStops = Math.min(
      Math.max(0, Math.floor(durationMin / 20) - 1),
      Math.floor(dist / 0.8)
    );

    let segmentPoints: [number, number][] = [];

    if (maxStops > 0 && dist > 0.3) {
      // search scenic spots at multiple points along the corridor
      const searchPoints = Math.min(maxStops + 2, 5);
      const allSpots: ScenicSpot[] = [];
      const seen = new Set<string>();

      for (let s = 0; s < searchPoints; s++) {
        const t = (s + 1) / (searchPoints + 1);
        const pLat = a[0] + (b[0] - a[0]) * t;
        const pLng = a[1] + (b[1] - a[1]) * t;
        const searchRadius = Math.max(0.3, dist * 0.3);
        try {
          const spots = await findScenicSpots(pLat, pLng, searchRadius);
          for (const spot of spots) {
            const key = `${spot.lat.toFixed(4)}_${spot.lng.toFixed(4)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            // skip if too close to A or B
            if (haversineKm(a, [spot.lat, spot.lng]) < 0.05) continue;
            if (haversineKm(b, [spot.lat, spot.lng]) < 0.05) continue;
            allSpots.push(spot);
          }
        } catch {}
      }

      // pick up to maxStops, preferring diverse types
      const picked: ScenicSpot[] = [];
      const usedTypes = new Set<string>();
      for (const spot of allSpots) {
        if (picked.length >= maxStops) break;
        if (!usedTypes.has(spot.type) || picked.length < maxStops / 2) {
          usedTypes.add(spot.type);
          picked.push(spot);
        }
      }
      // if still need more, take any remaining
      if (picked.length < maxStops) {
        for (const spot of allSpots) {
          if (picked.length >= maxStops) break;
          if (!picked.includes(spot)) picked.push(spot);
        }
      }

      if (picked.length > 0) {
        // order picked spots by proximity (nearest-first from current position)
        picked.sort((x, y) => haversineKm(a, [x.lat, x.lng]) - haversineKm(a, [y.lat, y.lng]));

        // route: a → spot1 → spot2 → ... → spotN → b
        let prev = a;
        for (const spot of picked) {
          const seg = await pickScenicAlternative(prev, [spot.lat, spot.lng]);
          if (seg.length > 1) {
            if (segmentPoints.length === 0) segmentPoints.push(...seg);
            else for (let j = 1; j < seg.length; j++) segmentPoints.push(seg[j]);
          }
          prev = [spot.lat, spot.lng];
        }
        const lastSeg = await pickScenicAlternative(prev, b);
        if (lastSeg.length > 1) {
          if (segmentPoints.length === 0) segmentPoints.push(...lastSeg);
          else for (let j = 1; j < lastSeg.length; j++) segmentPoints.push(lastSeg[j]);
        }
      }
    }

    if (segmentPoints.length < 2) {
      segmentPoints = await pickScenicAlternative(a, b);
    }

    if (segmentPoints.length > 1) {
      if (result.length === 0) result.push(...segmentPoints);
      else for (let j = 1; j < segmentPoints.length; j++) result.push(segmentPoints[j]);
    } else {
      result.push(b);
    }
  }

  return result.length > 1 ? result : [from, ...waypoints];
}
