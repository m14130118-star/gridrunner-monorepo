import type { Vehicle, PlacePref } from './types';

// vehicle → список базовых жанров
export const VEHICLE_GENRES: Record<Vehicle, { genre: string; weight: number }[]> = {
  'Пешком': [
    { genre: 'chill', weight: 4 },
    { genre: 'jazz', weight: 3 },
    { genre: 'indie folk', weight: 2 },
    { genre: 'ambient', weight: 1 },
  ],
  'Скейтборд': [
    { genre: 'rock', weight: 4 },
    { genre: 'punk', weight: 3 },
    { genre: 'hiphop', weight: 2 },
    { genre: 'alternative', weight: 1 },
  ],
  'Велосипед': [
    { genre: 'electronic', weight: 3 },
    { genre: 'indie rock', weight: 3 },
    { genre: 'pop', weight: 2 },
    { genre: 'drum&bass', weight: 2 },
  ],
  'Автомобиль': [
    { genre: 'electronic', weight: 3 },
    { genre: 'house', weight: 3 },
    { genre: 'hiphop', weight: 2 },
    { genre: 'pop', weight: 2 },
  ],
};

// checkpoint → поджанр / настроение
export const CHECKPOINT_VIBE: Record<PlacePref, { mood: string; subGenre: string; weight: number }> = {
  embankment: { mood: 'breezy', subGenre: 'lofi', weight: 2 },
  sunset: { mood: 'dreamy', subGenre: 'dream pop', weight: 3 },
  bakery: { mood: 'cozy', subGenre: 'acoustic', weight: 2 },
  coffee: { mood: 'warm', subGenre: 'bossa nova', weight: 2 },
  park: { mood: 'calm', subGenre: 'indie folk', weight: 2 },
  history: { mood: 'epic', subGenre: 'classical', weight: 1 },
  shopping: { mood: 'energetic', subGenre: 'electro pop', weight: 1 },
  nature: { mood: 'serene', subGenre: 'ambient', weight: 2 },
  food: { mood: 'chill', subGenre: 'lounge', weight: 1 },
};

export function getGenresForVehicle(vehicle: Vehicle): string[] {
  const entries = VEHICLE_GENRES[vehicle];
  if (!entries) return ['chill', 'pop'];
  const pool: string[] = [];
  for (const e of entries) for (let i = 0; i < e.weight; i++) pool.push(e.genre);
  return pool;
}

export function getVibeForPlace(place: PlacePref): { mood: string; subGenre: string } {
  return CHECKPOINT_VIBE[place] || { mood: 'neutral', subGenre: 'pop' };
}
