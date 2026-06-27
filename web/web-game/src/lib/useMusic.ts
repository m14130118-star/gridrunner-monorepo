'use client';

import { useState, useEffect, useCallback } from 'react';

export type VibeId = 'aggressive' | 'cruise' | 'dark' | 'scenic' | 'urban' | 'explore';

export interface MusicState {
  currentVibe: VibeId;
  bpm: number;
  isPlaying: boolean;
  volume: number;
}

export const MUSIC_ACTION = 'music:action';
export const MUSIC_STATE = 'music:state';

type MusicAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'next' }
  | { type: 'setVibe'; value: VibeId }
  | { type: 'setVolume'; value: number };

export const VIBE_BPM: Record<VibeId, number> = {
  aggressive: 150,
  cruise: 90,
  dark: 110,
  scenic: 70,
  urban: 90,
  explore: 120,
};

const STORAGE_KEY = 'gridrunner_music';

function loadState(): MusicState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const cv = p.currentVibe as string;
      const vibe = cv in VIBE_BPM ? (cv as VibeId) : 'cruise';
      return {
        currentVibe: vibe,
        bpm: p.bpm || VIBE_BPM[vibe],
        isPlaying: false,
        volume: typeof p.volume === 'number' ? p.volume : 0.3,
      };
    }
  } catch {}
  return { currentVibe: 'cruise', bpm: 90, isPlaying: false, volume: 0.3 };
}

function saveState(s: MusicState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentVibe: s.currentVibe,
      bpm: s.bpm,
      volume: s.volume,
    }));
  } catch {}
}

let _state = loadState();
const _stateListeners = new Set<(s: MusicState) => void>();

function emitState() {
  saveState(_state);
  _stateListeners.forEach(fn => fn(_state));
  try {
    window.dispatchEvent(new CustomEvent(MUSIC_STATE, { detail: { ..._state } }));
  } catch {}
}

function dispatchAction(action: MusicAction) {
  try {
    window.dispatchEvent(new CustomEvent(MUSIC_ACTION, { detail: action }));
  } catch {}
}

export function playVibe(vibeId: VibeId) {
  dispatchAction({ type: 'setVibe', value: vibeId });
  dispatchAction({ type: 'play' });
}

export function playMusic() {
  dispatchAction({ type: 'play' });
}

export function pauseMusic() {
  dispatchAction({ type: 'pause' });
}

export function toggleMusic() {
  dispatchAction({ type: 'toggle' });
}

export function nextTrack() {
  dispatchAction({ type: 'next' });
}

export function setVolume(volume: number) {
  dispatchAction({ type: 'setVolume', value: Math.max(0, Math.min(1, volume)) });
}

if (typeof window !== 'undefined') {
  window.addEventListener(MUSIC_ACTION, ((e: Event) => {
    const action = (e as CustomEvent<MusicAction>).detail;
    switch (action.type) {
      case 'play': _state = { ..._state, isPlaying: true }; break;
      case 'pause': _state = { ..._state, isPlaying: false }; break;
      case 'toggle': _state = { ..._state, isPlaying: !_state.isPlaying }; break;
      case 'setVibe': {
        const vibe = action.value;
        if (VIBE_BPM[vibe]) _state = { ..._state, currentVibe: vibe, bpm: VIBE_BPM[vibe] };
        break;
      }
      case 'setVolume': _state = { ..._state, volume: Math.max(0, Math.min(1, action.value)) }; break;
    }
    emitState();
  }) as EventListener);
}

export function useMusic() {
  const [state, setState] = useState<MusicState>({ ..._state });

  useEffect(() => {
    const handler = (s: MusicState) => setState({ ...s });
    _stateListeners.add(handler);
    handler(_state);
    return () => { _stateListeners.delete(handler); };
  }, []);

  const _setVibe = useCallback((v: VibeId) => playVibe(v), []);
  const _play = useCallback(() => playMusic(), []);
  const _pause = useCallback(() => pauseMusic(), []);
  const _next = useCallback(() => nextTrack(), []);

  return {
    currentVibe: state.currentVibe,
    bpm: state.bpm,
    isPlaying: state.isPlaying,
    volume: state.volume,
    setVibe: _setVibe,
    play: _play,
    pause: _pause,
    nextTrack: _next,
  };
}
