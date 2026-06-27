import type { Track, Playlist, Vehicle, PlacePref } from './types';
import { DEMO_TRACKS } from './demo-tracks';
import { getGenresForVehicle, getVibeForPlace } from './vehicle-genres';

export interface RouteContextCheckpoint {
  name: string; coords: [number, number]; icon?: string;
}

interface RouteContext {
  vehicle: Vehicle;
  durationMin: number;
  checkpoints: RouteContextCheckpoint[];
  placePrefs: PlacePref[];
}

export function generatePlaylist(ctx: RouteContext): Playlist {
  const { vehicle, durationMin, checkpoints, placePrefs } = ctx;

  // сколько треков влезет (средняя длина трека ~3.5 мин)
  const avgTrackLen = 210; // 3.5 min in seconds
  const targetTracks = Math.max(4, Math.min(15, Math.round((durationMin * 60) / avgTrackLen)));

  // собираем пул жанров от vehicle + вайб от точек
  const genrePool = getGenresForVehicle(vehicle);
  const moodSet = new Set<string>();
  for (const pref of placePrefs) {
    const vibe = getVibeForPlace(pref);
    moodSet.add(vibe.mood);
    genrePool.push(vibe.subGenre);
  }

  const selected: Track[] = [];
  const used = new Set<string>();

  // фаза 1: подбираем треки под вайб каждой точки по порядку
  for (let i = 0; i < checkpoints.length && selected.length < targetTracks; i++) {
    const pref = placePrefs[i] || placePrefs[0] || 'park';
    const vibe = getVibeForPlace(pref);

    const candidates = DEMO_TRACKS.filter(t =>
      !used.has(t.id) &&
      (t.genre === vibe.subGenre || t.mood === vibe.mood)
    );

    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      selected.push(pick);
      used.add(pick.id);
    }
  }

  // фаза 2: добиваем остатком из пула жанров
  const shuffled = shuffleArray(
    DEMO_TRACKS.filter(t =>
      !used.has(t.id) && genrePool.includes(t.genre)
    )
  );

  for (const t of shuffled) {
    if (selected.length >= targetTracks) break;
    if (!used.has(t.id)) {
      selected.push(t);
      used.add(t.id);
    }
  }

  // фаза 3: если всё ещё мало — добиваем random
  if (selected.length < targetTracks) {
    for (const t of shuffleArray(DEMO_TRACKS.filter(t => !used.has(t.id)))) {
      if (selected.length >= targetTracks) break;
      selected.push(t);
      used.add(t.id);
    }
  }

  // составляем порядок: warmup → checkpoint-vibe → cooldown
  const warmup = selected.splice(0, Math.min(2, Math.floor(selected.length * 0.15)));
  const cooldown = selected.splice(-Math.min(2, Math.floor(selected.length * 0.15)));
  // середина — треки, подобранные под чекпоинты, + остальное — перемешиваем
  const middle = shuffleArray(selected);

  const ordered = [...warmup, ...middle, ...cooldown];

  const totalDuration = ordered.reduce((sum, t) => sum + t.duration, 0);

  const vehicleLabel = vehicle;
  const placeLabels = placePrefs.map(p => p).join(', ');

  return {
    id: `pl_${Date.now()}`,
    name: `${vehicleLabel} · ${ctx.durationMin} мин`,
    tracks: ordered,
    duration: totalDuration,
    description: `Маршрут на ${ctx.durationMin} мин · ${vehicle} · ${placeLabels || 'без предпочтений'}`,
  };
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
