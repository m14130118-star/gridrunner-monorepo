export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string;
  genre: string;
  mood: string;
  spotifyId?: string;
  yandexId?: string;
  appleId?: string;
  previewUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  duration: number;
  description: string;
}

export interface MusicProvider {
  id: string;
  name: string;
  icon: string;
  buildTrackUrl(track: Track): string;
  buildPlaylistUrl(playlistId: string): string;
  embedUrl?: string;
}

export type Vehicle = 'Пешком' | 'Скейтборд' | 'Велосипед' | 'Автомобиль';
export type PlacePref = 'embankment' | 'sunset' | 'bakery' | 'coffee' | 'park' | 'history' | 'shopping' | 'nature' | 'food';
