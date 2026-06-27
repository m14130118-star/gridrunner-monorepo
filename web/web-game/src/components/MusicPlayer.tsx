'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { VibeId } from '../lib/useMusic';
import { MUSIC_ACTION, MUSIC_STATE, VIBE_BPM } from '../lib/useMusic';

interface VibeDef {
  label: string;
  icon: string;
  tracks: string[];
  bassFreq: number;
  bassType: OscillatorType;
  padFreq?: number;
  padType?: OscillatorType;
  patterns: { kick: number; hihat: number; bass: number }[];
}

const VIBE_DEFS: Record<VibeId, VibeDef> = {
  aggressive: {
    label: 'Aggressive', icon: 'fa-bolt',
    tracks: ['Rage Pulse', 'Neon Fury', 'Cyber Strike', 'Dark Voltage', 'Speed Demon'],
    bassFreq: 60, bassType: 'sawtooth',
    patterns: [
      { kick: 0b1000100010001000, hihat: 0b1111111111111111, bass: 0b1000000000000000 },
      { kick: 0b1000100010101000, hihat: 0b1010101010101010, bass: 0b1000100000000000 },
    ],
  },
  cruise: {
    label: 'Cruise', icon: 'fa-sun',
    tracks: ['Sunset Glide', 'Coastal Drift', 'Mellow Waves', 'Golden Hour', 'Ocean Breeze'],
    bassFreq: 110, bassType: 'triangle', padFreq: 220, padType: 'sine',
    patterns: [
      { kick: 0b1000000010000000, hihat: 0b0010001000100010, bass: 0b1000000010000000 },
      { kick: 0b1000000000001000, hihat: 0b0000100000001000, bass: 0b1000000010000000 },
    ],
  },
  dark: {
    label: 'Dark', icon: 'fa-moon',
    tracks: ['Shadow Realm', 'Void Walker', 'Night Terror', 'Abyssal Dive', 'Gothic Rain'],
    bassFreq: 55, bassType: 'sawtooth',
    patterns: [
      { kick: 0b1000100000001000, hihat: 0b0000001000000010, bass: 0b1000000010000000 },
      { kick: 0b1000000010000000, hihat: 0b0000001000000010, bass: 0b1000000000001000 },
    ],
  },
  scenic: {
    label: 'Scenic', icon: 'fa-mountain',
    tracks: ['Mountain Hymn', 'River Flow', 'Windwalker', 'Starlight Path', 'Forest Echo'],
    bassFreq: 130, bassType: 'sine', padFreq: 260, padType: 'sine',
    patterns: [
      { kick: 0b1000000000000000, hihat: 0b0000000010000000, bass: 0b1000000010000000 },
      { kick: 0b1000000010000000, hihat: 0b0000000000000000, bass: 0b1000000010000000 },
    ],
  },
  urban: {
    label: 'Urban', icon: 'fa-city',
    tracks: ['Street Dreams', 'Concrete Jungle', 'Late Night Ride', 'Block Party', 'Roof Top'],
    bassFreq: 70, bassType: 'sine',
    patterns: [
      { kick: 0b1000000000100000, hihat: 0b0000100000001000, bass: 0b1000000010000000 },
      { kick: 0b1000000000001000, hihat: 0b0010001000100010, bass: 0b1010000010000000 },
    ],
  },
  explore: {
    label: 'Explore', icon: 'fa-compass',
    tracks: ['Unknown Path', 'Wanderer', 'Discovery', 'Frontier', 'New Horizon'],
    bassFreq: 90, bassType: 'square',
    patterns: [
      { kick: 0b1010001000001000, hihat: 0b1000100000100010, bass: 0b1000000010000000 },
      { kick: 0b1000001010000000, hihat: 0b0000100000001000, bass: 0b1000100000000000 },
    ],
  },
};

const VIBE_IDS: VibeId[] = ['aggressive', 'cruise', 'dark', 'scenic', 'urban', 'explore'];

function bitAt(mask: number, pos: number): boolean {
  return !!(mask & (1 << (15 - pos)));
}

function playKick(ctx: AudioContext, time: number, vol: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
  gain.gain.setValueAtTime(vol * 0.5, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.15);
}

let _noiseBuf: AudioBuffer | null = null;

function getNoiseBuf(ctx: AudioContext): AudioBuffer {
  if (_noiseBuf && _noiseBuf.sampleRate === ctx.sampleRate) return _noiseBuf;
  const len = Math.floor(ctx.sampleRate * 0.05);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  _noiseBuf = buf;
  return buf;
}

function playHihat(ctx: AudioContext, time: number, vol: number) {
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuf(ctx);
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(5000, time);
  gain.gain.setValueAtTime(vol * 0.25, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(time);
  src.stop(time + 0.05);
}

function playBass(ctx: AudioContext, time: number, freq: number, vol: number, type: OscillatorType) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(vol * 0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.2);
}

function createPad(ctx: AudioContext, freq: number, vol: number, type: OscillatorType) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(vol * 0.1, ctx.currentTime + 1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  return { osc, gain };
}

export default function MusicPlayer() {
  const [expanded, setExpanded] = useState(false);

  const [currentVibe, setCurrentVibe] = useState<VibeId>('cruise');
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(90);
  const [volume, setVolume] = useState(0.3);
  const [trackIndex, setTrackIndex] = useState(0);
  const [patternIndex, setPatternIndex] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const schedulerRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const padRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isPlayingRef = useRef(isPlaying);
  const volumeRef = useRef(volume);
  const vibeRef = useRef(currentVibe);
  const bpmRef = useRef(bpm);
  const patternIdxRef = useRef(patternIndex);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { vibeRef.current = currentVibe; }, [currentVibe]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { patternIdxRef.current = patternIndex; }, [patternIndex]);

  const stopPad = useCallback(() => {
    if (padRef.current) {
      try {
        const ctx = audioCtxRef.current;
        if (ctx) {
          padRef.current.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
        }
        const p = padRef.current;
        setTimeout(() => { try { p.osc.stop(); } catch {} }, 200);
      } catch {}
      padRef.current = null;
    }
  }, []);

  const startPadIfNeeded = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const def = VIBE_DEFS[vibeRef.current];
    if (def.padFreq && def.padType) {
      stopPad();
      padRef.current = createPad(ctx, def.padFreq, volumeRef.current, def.padType);
    }
  }, [stopPad]);

  const scheduleStep = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !isPlayingRef.current) return;

    const _bpm = bpmRef.current;
    const stepDur = 60 / _bpm / 4;
    const vol = volumeRef.current;
    const vibe = vibeRef.current;
    const def = VIBE_DEFS[vibe];
    const pat = def.patterns[patternIdxRef.current % def.patterns.length];

    while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
      const beat = currentBeatRef.current % 16;

      if (bitAt(pat.kick, beat)) playKick(ctx, nextNoteTimeRef.current, vol);
      if (bitAt(pat.hihat, beat)) playHihat(ctx, nextNoteTimeRef.current, vol);
      if (bitAt(pat.bass, beat)) playBass(ctx, nextNoteTimeRef.current, def.bassFreq, vol, def.bassType);

      nextNoteTimeRef.current += stepDur;
      currentBeatRef.current++;
    }
  }, []);

  const startScheduler = useCallback(() => {
    if (schedulerRef.current !== null) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    currentBeatRef.current = 0;
    schedulerRef.current = window.setInterval(scheduleStep, 25);
  }, [scheduleStep]);

  const stopScheduler = useCallback(() => {
    if (schedulerRef.current !== null) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (isPlaying) {
      if (ctx.state === 'suspended') ctx.resume();
      startScheduler();
      startPadIfNeeded();
    } else {
      stopScheduler();
      stopPad();
    }
  }, [isPlaying, startScheduler, stopScheduler, startPadIfNeeded, stopPad]);

  useEffect(() => {
    stopScheduler();
    stopPad();
    if (isPlayingRef.current && audioCtxRef.current) {
      startScheduler();
      startPadIfNeeded();
    }
  }, [bpm, currentVibe, patternIndex, startScheduler, stopScheduler, startPadIfNeeded, stopPad]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    return () => {
      stopScheduler();
      stopPad();
      ctx.close();
      audioCtxRef.current = null;
    };
  }, [stopScheduler, stopPad]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const action = (e as CustomEvent<{ type: string; value?: unknown }>).detail;
      switch (action.type) {
        case 'setVibe': {
          const v = action.value as VibeId;
          const def = VIBE_DEFS[v];
          if (def) {
            setCurrentVibe(v);
            setBpm(VIBE_BPM[v]);
            setTrackIndex(0);
            setPatternIndex(0);
          }
          break;
        }
        case 'play': setIsPlaying(true); break;
        case 'pause': setIsPlaying(false); break;
        case 'toggle': setIsPlaying(p => !p); break;
        case 'next': {
          setTrackIndex(i => {
            const def = VIBE_DEFS[vibeRef.current];
            return (i + 1) % def.tracks.length;
          });
          setPatternIndex(i => (i + 1) % 2);
          break;
        }
        case 'setVolume': setVolume(Math.max(0, Math.min(1, action.value as number))); break;
      }
    };
    window.addEventListener(MUSIC_ACTION, handler);
    return () => window.removeEventListener(MUSIC_ACTION, handler);
  }, []);

  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent(MUSIC_STATE, {
        detail: { currentVibe, bpm, isPlaying, volume },
      }));
    } catch {}
  }, [currentVibe, bpm, isPlaying, volume]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gridrunner_music');
      if (raw) {
        const p = JSON.parse(raw);
        const cv = p.currentVibe as string;
        const vibe = cv in VIBE_BPM ? (cv as VibeId) : 'cruise';
        setCurrentVibe(vibe);
        setBpm(VIBE_BPM[vibe]);
        if (typeof p.volume === 'number') setVolume(p.volume);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  const def = VIBE_DEFS[currentVibe];
  const trackTitle = def.tracks[trackIndex % def.tracks.length];

  const btn = (icon: string, onClick: () => void, title: string, extraStyle?: React.CSSProperties) => (
    <button onClick={onClick} title={title}
      style={{
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', color: 'var(--text)',
        fontSize: 13, transition: 'all 0.15s', flexShrink: 0, ...extraStyle,
      }}>
      <i className={`fa-solid ${icon}`} />
    </button>
  );

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)} title="Music Player"
        style={{
          position: 'fixed', top: 10, right: 10, zIndex: 999,
          width: 40, height: 40, borderRadius: 12,
          background: `rgba(15,20,25,0.8)`, backdropFilter: 'blur(12px)',
          border: `1px solid ${isPlaying ? 'var(--green)' : 'rgba(255,255,255,0.08)'}`,
          color: isPlaying ? 'var(--green)' : 'var(--text)',
          fontSize: 18, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
        <i className="fa-solid fa-music" />
      </button>
    );
  }

  const sliderStyle: Record<string, string | number> = {
    width: '100%', height: 4, appearance: 'none', outline: 'none',
    borderRadius: 2, background: 'rgba(255,255,255,0.12)',
    cursor: 'pointer',
  };

  return (
    <div ref={panelRef}
      style={{
        position: 'fixed', top: 10, right: 10, zIndex: 999, width: 280,
        background: 'rgba(15,20,25,0.88)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        padding: 16, color: 'var(--text)', fontFamily: "'Segoe UI', system-ui, sans-serif",
        fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10,
      }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa-solid fa-music" style={{ color: 'var(--green)', fontSize: 14 }} />
          Music Player
        </span>
        <button onClick={() => setExpanded(false)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, padding: 0 }}>
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      {/* Track info */}
      <div style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {trackTitle}
        </div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
          {currentVibe.charAt(0).toUpperCase() + currentVibe.slice(1)} · {bpm} BPM
        </div>
      </div>

      {/* BPM bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.5, width: 30 }}>BPM</span>
        <div style={{
          flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            height: '100%',             width: `${Math.max(0, Math.min(100, ((bpm - 60) / 100) * 100))}%`,
            background: 'var(--green)', borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', width: 36, textAlign: 'right' }}>
          {bpm}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {btn('fa-backward-step', () => {
          window.dispatchEvent(new CustomEvent(MUSIC_ACTION, { detail: { type: 'next' } }));
        }, 'Prev')}
        {btn(
          isPlaying ? 'fa-pause' : 'fa-play',
          () => {
            const action = isPlaying ? 'pause' : 'play';
            window.dispatchEvent(new CustomEvent(MUSIC_ACTION, { detail: { type: action } }));
          },
          isPlaying ? 'Pause' : 'Play',
          isPlaying ? { borderColor: 'var(--green)', color: 'var(--green)', width: 40, height: 40, fontSize: 15 } : { width: 40, height: 40, fontSize: 15 },
        )}
        {btn('fa-forward-step', () => {
          window.dispatchEvent(new CustomEvent(MUSIC_ACTION, { detail: { type: 'next' } }));
        }, 'Next')}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className={`fa-solid ${volume > 0.5 ? 'fa-volume-high' : volume > 0 ? 'fa-volume-low' : 'fa-volume-xmark'}`}
            style={{ fontSize: 12, opacity: 0.5, width: 14 }} />
          <input type="range" min={0} max={1} step={0.05} value={volume}
            onChange={e => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              window.dispatchEvent(new CustomEvent(MUSIC_ACTION, { detail: { type: 'setVolume', value: v } }));
            }}
            style={sliderStyle} />
        </div>
      </div>

      {/* Vibe selector */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
        paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {VIBE_IDS.map(v => {
          const vd = VIBE_DEFS[v];
          const active = v === currentVibe;
          return (
            <button key={v} onClick={() => {
              window.dispatchEvent(new CustomEvent(MUSIC_ACTION, { detail: { type: 'setVibe', value: v } }));
              window.dispatchEvent(new CustomEvent(MUSIC_ACTION, { detail: { type: 'play' } }));
            }}
              style={{
                background: active ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.04)',
                border: active ? '1px solid rgba(0,230,118,0.3)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8, padding: '5px 4px', cursor: 'pointer',
                color: active ? 'var(--green)' : 'rgba(255,255,255,0.6)',
                fontSize: 10, fontWeight: 600, transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                lineHeight: 1.2,
              }}>
              <i className={`fa-solid ${vd.icon}`} style={{ fontSize: 14 }} />
              <span>{vd.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
