import type { Vehicle, PlacePref } from './types';

export const SPEEDS: Record<Vehicle, number> = {
  'Пешком': 5,
  'Скейтборд': 12,
  'Велосипед': 20,
  'Автомобиль': 60,
};

export const MAX_RADIUS_KM: Record<Vehicle, number> = {
  'Пешком': 5,
  'Скейтборд': 10,
  'Велосипед': 20,
  'Автомобиль': 70,
};

// среднее время осмотра/чилла для каждого типа места
export const VISIT_TIMES: Record<string, number> = {
  cafe: 30,
  restaurant: 45,
  fast_food: 20,
  pub: 45,
  bar: 45,
  bakery: 15,
  pastry_shop: 15,
  park: 40,
  skate_park: 60,
  pitch: 60,
  beach: 30,
  viewpoint: 20,
  attraction: 40,
  museum: 60,
  historic: 50,
  monument: 20,
  castle: 90,
  mall: 60,
  shop: 30,
  nature_reserve: 90,
  garden: 40,
  fountain: 10,
  gallery: 45,
  theatre: 90,
  library: 30,
  cinema: 120,
};

export const DEFAULT_VISIT_TIME = 30;

// маппинг преференсов → OSM теги
export const PREF_TAGS: Record<PlacePref, string[]> = {
  embankment: ['natural=beach', 'leisure=park', 'amenity=pub'],
  sunset: ['tourism=viewpoint', 'natural=peak', 'man_made=lookout_tower'],
  bakery: ['shop=bakery', 'shop= pastry_shop'],
  coffee: ['amenity=cafe'],
  park: ['leisure=park', 'leisure=garden'],
  history: ['historic~.', 'tourism=museum', 'tourism=attraction'],
  shopping: ['shop=mall', 'shop=department_store'],
  nature: ['leisure=nature_reserve', 'natural=wood', 'leisure=park'],
  food: ['amenity=restaurant', 'amenity=fast_food'],
};

// теги по транспорту (когда преференсов нет)
export const VEHICLE_TAGS: Record<Vehicle, string[]> = {
  'Пешком': ['tourism=attraction', 'tourism=viewpoint', 'amenity=cafe', 'leisure=park', 'historic~.', 'amenity=restaurant'],
  'Скейтборд': ['leisure=skate_park', 'leisure=pitch', 'natural=beach', 'leisure=park', 'amenity=pub'],
  'Велосипед': ['tourism=attraction', 'leisure=park', 'leisure=nature_reserve', 'amenity=cafe', 'tourism=viewpoint'],
  'Автомобиль': ['tourism=attraction', 'tourism=museum', 'tourism=viewpoint', 'shop=mall', 'amenity=restaurant', 'leisure=nature_reserve'],
};

// категория → человекочитаемое название
export const CATEGORY_LABELS: Record<string, string> = {
  cafe: 'Кофейня', restaurant: 'Ресторан', fast_food: 'Фастфуд',
  pub: 'Паб', bar: 'Бар', bakery: 'Пекарня',
  park: 'Парк', skate_park: 'Скейт-парк', beach: 'Пляж',
  viewpoint: 'Смотровая площадка', attraction: 'Достопримечательность',
  museum: 'Музей', historic: 'Историческое место', monument: 'Памятник',
  castle: 'Замок', mall: 'Торговый центр', shop: 'Магазин',
  nature_reserve: 'Природный парк', garden: 'Сад', gallery: 'Галерея',
};

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateRouteTime(distanceKm: number, speedKmh: number): number {
  return Math.round((distanceKm / speedKmh) * 60 * 1.3);
}
