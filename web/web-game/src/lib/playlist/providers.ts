import type { MusicProvider, Track } from './types';

export const SPOTIFY: MusicProvider = {
  id: 'spotify',
  name: 'Spotify',
  icon: '🎧',
  buildTrackUrl: (t: Track) => t.spotifyId ? `https://open.spotify.com/track/${t.spotifyId}` : '',
  buildPlaylistUrl: (id: string) => `https://open.spotify.com/playlist/${id}`,
  embedUrl: 'https://open.spotify.com/embed/playlist/',
};

export const YANDEX_MUSIC: MusicProvider = {
  id: 'yandex',
  name: 'Яндекс Музыка',
  icon: '🎵',
  buildTrackUrl: (t: Track) => t.yandexId ? `https://music.yandex.ru/track/${t.yandexId}` : '',
  buildPlaylistUrl: (id: string) => `https://music.yandex.ru/users/${id}/playlists/1`,
};

export const APPLE_MUSIC: MusicProvider = {
  id: 'apple',
  name: 'Apple Music',
  icon: '🍎',
  buildTrackUrl: (t: Track) => t.appleId ? `https://music.apple.com/track/${t.appleId}` : '',
  buildPlaylistUrl: (id: string) => `https://music.apple.com/playlist/${id}`,
};

export const ALL_PROVIDERS: MusicProvider[] = [SPOTIFY, YANDEX_MUSIC, APPLE_MUSIC];

export function getProvider(id: string): MusicProvider {
  return ALL_PROVIDERS.find(p => p.id === id) || SPOTIFY;
}
