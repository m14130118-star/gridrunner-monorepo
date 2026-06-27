export type Vehicle = 'Пешком' | 'Скейтборд' | 'Велосипед' | 'Автомобиль';
export type PlacePref = 'embankment' | 'sunset' | 'bakery' | 'coffee' | 'park' | 'history' | 'shopping' | 'nature' | 'food';
export type BucketKey = '30_min' | '60_min' | '120_min';

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  osmType: string;
  category: string;
  tags: string[];
  rating?: number;
  visitTime: number;
  routeTime: number;
  totalTime: number;
  distance: number;
}

export interface RoutePlanRequest {
  lat: number;
  lng: number;
  vehicle: Vehicle;
  duration: number;
  prefs?: PlacePref[];
}

export interface RoutePlanResponse {
  city: string;
  vehicle: Vehicle;
  duration: number;
  places: Place[];
  buckets: Record<BucketKey, Place[]>;
}
