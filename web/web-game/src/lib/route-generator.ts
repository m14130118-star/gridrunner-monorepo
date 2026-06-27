export interface Checkpoint {
  name: string; coords: [number, number]; icon: string;
}

const PREF_QUERIES: Record<string, string> = {
  embankment: 'набережная', sunset: 'смотровая площадка', bakery: 'пекарня',
  coffee: 'кофейня', park: 'парк', history: 'достопримечательность',
  shopping: 'торговый центр', nature: 'природный парк', food: 'ресторан',
};

const PREF_ICONS: Record<string, string> = {
  embankment: '🌊', sunset: '🌅', bakery: '🥐', coffee: '☕',
  park: '🌳', history: '🏛️', shopping: '🛍️', nature: '🌿', food: '🍜',
};

function waitForYmaps(maxMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).ymaps) return resolve();
    const start = Date.now();
    const check = setInterval(() => {
      if ((window as any).ymaps) { clearInterval(check); resolve(); }
      else if (Date.now() - start > maxMs) { clearInterval(check); reject(new Error('ymaps timeout')); }
    }, 200);
  });
}

export async function generateRoute(
  start: [number, number],
  prefs: string[],
  durationMin: number,
  speedKmh: number,
): Promise<{ path: [number, number][]; checkpoints: Checkpoint[] } | null> {
  try {
    await waitForYmaps();
    const ymaps = (window as any).ymaps;
    const usedPrefs = prefs.length > 0 ? prefs : ['park', 'coffee', 'food'];
    // берём не больше 4 точек, плюс старт
    const maxPoints = Math.min(usedPrefs.length, 4);
    const chosen = usedPrefs.slice(0, maxPoints);

    // радиус поиска — от времени и скорости
    const radiusKm = ((durationMin / 60) * speedKmh * 0.7) / 3;
    const deg = radiusKm / 111;

    const bounds = [
      [start[0] - deg, start[1] - deg],
      [start[0] + deg, start[1] + deg],
    ];

    // ищем реальные места
    const checkpoints: Checkpoint[] = [];

    for (const pref of chosen) {
      const query = PREF_QUERIES[pref] || pref;
      const result = await ymaps.search(query, {
        type: 'geo',
        boundedBy: bounds,
        results: 3,
      });

      let found = false;
      if (result && result.geoObjects && result.geoObjects.getLength) {
        const len = result.geoObjects.getLength();
        for (let i = 0; i < Math.min(len, 3); i++) {
          const obj = result.geoObjects.get(i);
          const coords = obj.geometry?.getCoordinates();
          const name = obj.properties?.get('name') || obj.properties?.get('description') || PREF_QUERIES[pref];
          if (coords && Array.isArray(coords) && coords.length === 2) {
            checkpoints.push({ coords: [coords[0], coords[1]], name: String(name), icon: PREF_ICONS[pref] || '📍' });
            found = true;
            break;
          }
        }
      }
      if (!found) {
        // fallback — рандомная точка рядом
        const angle = Math.random() * 2 * Math.PI;
        const lat = start[0] + deg * Math.cos(angle) * (0.5 + Math.random() * 0.5);
        const lng = start[1] + (deg / Math.cos(start[0] * Math.PI / 180)) * Math.sin(angle) * (0.5 + Math.random() * 0.5);
        checkpoints.push({ coords: [lat, lng], name: PREF_QUERIES[pref] || pref, icon: PREF_ICONS[pref] || '📍' });
      }
    }

    if (checkpoints.length === 0) return null;

    // строим маршрут через все точки + обратно к старту
    const routePoints = [start, ...checkpoints.map(c => c.coords), start];
    let path: [number, number][] = [];

    try {
      const route = await ymaps.route(routePoints, {
        multiRoute: false,
        routingMode: speedKmh > 20 ? 'auto' : 'pedestrian',
      });
      const paths = route.getPaths();
      if (paths && paths.getLength && paths.getLength() > 0) {
        for (let i = 0; i < paths.getLength(); i++) {
          const seg = paths.get(i);
          const coords = seg.geometry?.getCoordinates();
          if (coords && Array.isArray(coords)) {
            path = path.concat(coords.map((c: number[]) => [c[0], c[1]] as [number, number]));
          }
        }
      }
    } catch {
      // fallback — прямая линия через точки
      const fallbackPath: [number, number][] = [start];
      for (const cp of checkpoints) fallbackPath.push(cp.coords);
      fallbackPath.push(start);
      path = fallbackPath;
    }

    return { path: path.length > 1 ? path : [start, ...checkpoints.map(c => c.coords), start], checkpoints };
  } catch {
    return null;
  }
}
