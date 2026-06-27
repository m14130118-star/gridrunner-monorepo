import { useEffect, useState, useRef } from 'react';
import { fetchWeather, getWeatherTheme, getSeason, WeatherData, HUDTheme } from '../lib/weather';

const MOCK_TRACKS = [
  { title: 'Empty Screen', artist: 'Dark Prince', bpm: 140 },
  { title: 'Nightcall', artist: 'Kavinsky', bpm: 120 },
  { title: 'The Less I Know The Better', artist: 'Tame Impala', bpm: 130 },
  { title: 'In the End', artist: 'Linkin Park', bpm: 110 },
  { title: 'Blinding Lights', artist: 'The Weeknd', bpm: 171 },
  { title: 'ЛЮДИ', artist: 'IC3PEAK', bpm: 150 },
  { title: 'Gimme Shelter', artist: 'The Rolling Stones', bpm: 120 },
];

interface HUDProps {
  speed: number;
  distance: number;
  time: number;
  checkpointTotal: number;
  checkpointVisited: number;
  targetBearing?: number;
  earnedXp: number;
  earnedGold: number;
  onEnd: () => void;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export default function TripHUD({
  speed, distance, time, checkpointTotal, checkpointVisited,
  targetBearing, earnedXp, earnedGold, onEnd,
}: HUDProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [theme, setTheme] = useState<HUDTheme | null>(null);
  const [trackIdx, setTrackIdx] = useState(0);
  const [battery, setBattery] = useState<number>(85);
  const compassRef = useRef<HTMLDivElement>(null);

  // Mock music rotation
  useEffect(() => {
    const i = setInterval(() => setTrackIdx(prev => (prev + 1) % MOCK_TRACKS.length), 15000);
    return () => clearInterval(i);
  }, []);

  // Battery
  useEffect(() => {
    setBattery(Math.floor(Math.random() * 30 + 60));
    const i = setInterval(() => setBattery(prev => Math.max(5, prev - Math.floor(Math.random() * 3))), 30000);
    return () => clearInterval(i);
  }, []);

  // Fetch weather
  useEffect(() => {
    const fetch = async () => {
      try {
        const w = await fetchWeather(55.75, 37.62);
        setWeather(w);
        setTheme(getWeatherTheme(w).hudTheme);
      } catch {}
    };
    fetch();
    const i = setInterval(fetch, 600000);
    return () => clearInterval(i);
  }, []);

  // Compass rotation
  useEffect(() => {
    if (!compassRef.current || targetBearing == null) return;
    compassRef.current.style.transform = `rotate(${targetBearing}deg)`;
  }, [targetBearing]);

  const track = MOCK_TRACKS[trackIdx];
  const bpmPulse = track.bpm / 60; // pulses per second
  const progress = checkpointTotal > 0 ? (checkpointVisited / checkpointTotal) * 100 : 0;
  const delta = speed - 15; // assuming target speed is 15

  const hudColor = theme?.hudAccent || '#00c8a0';
  const hudBg = theme?.hudBg || 'rgba(15,20,25,0.85)';
  const hudText = theme?.hudText || '#d0e0e8';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column',
      background: weather ? undefined : 'rgba(10,15,20,0.95)',
      color: hudText, fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Top info bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', fontSize: 12,
        background: hudBg, borderBottom: `1px solid ${hudColor}22`,
        backdropFilter: `blur(${theme?.blurIntensity || 2}px)`,
      }}>
        <span>
          {weather ? `${weather.temp}°C` : '--°C'}
        </span>
        <span>
          <i className="fa-regular fa-clock"></i> {formatTime(time)}
        </span>
        <span>
          <i className="fa-solid fa-battery-three-quarters"></i> {battery}%
        </span>
      </div>

      {/* Music bar */}
      <div style={{
        textAlign: 'center', padding: '8px 16px', fontSize: 12,
        background: `${hudColor}08`, borderBottom: `1px solid ${hudColor}15`,
        letterSpacing: '0.02em', opacity: 0.7,
      }}>
        🎵 {track.artist} — {track.title} · {track.bpm} BPM
      </div>

      {/* Speedometer area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative' }}>
        {/* Rain overlay effect */}
        <div className="hud-rain" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
          opacity: weather && getWeatherTheme(weather).rainIntensity > 0 ? 0.3 : 0,
        }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="rain-drop" style={{
              position: 'absolute', width: 1, height: `${20 + Math.random() * 30}px`,
              background: 'rgba(180,200,255,0.3)', left: `${Math.random() * 100}%`,
              animation: `rainDrop ${0.5 + Math.random() * 0.5}s linear infinite`,
              animationDelay: `${Math.random() * 2}s`, bottom: '100%',
            }} />
          ))}
        </div>

        {/* Speed */}
        <div style={{ fontSize: 12, opacity: 0.4, letterSpacing: '0.1em' }}>
          КМ/Ч · {weather?.description || 'clear'}
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: hudColor }}>
          {speed.toFixed(1)}
        </div>
        <div style={{ fontSize: 11, opacity: 0.4, display: 'flex', gap: 24 }}>
          <span>{distance.toFixed(2)} км</span>
          <span>{formatTime(time)}</span>
        </div>

        {/* Speed delta */}
        <div style={{
          padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: delta >= 0 ? 'rgba(0,200,0,0.1)' : 'rgba(200,0,0,0.1)',
          color: delta >= 0 ? '#4aff4a' : '#ff4a4a', marginTop: 8,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className={`fa-solid fa-arrow-${delta >= 0 ? 'up' : 'down'}`}></i>
          DELTA: {delta >= 0 ? '+' : ''}{delta.toFixed(1)} км/ч
        </div>
      </div>

      {/* Compass + checkpoint info */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        background: hudBg, borderTop: `1px solid ${hudColor}22`,
        backdropFilter: `blur(${theme?.blurIntensity || 2}px)`,
      }}>
        <div ref={compassRef} style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${hudColor}40`, background: `${hudColor}10`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.3s ease', fontSize: 18,
        }}>
          🧭
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
            <span>{checkpointVisited}/{checkpointTotal} чекпоинтов</span>
            <span>+{earnedXp} XP · +{earnedGold} G</span>
          </div>
          <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{
              width: `${progress}%`, height: '100%', borderRadius: 2,
              background: hudColor, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: hudBg, backdropFilter: `blur(${theme?.blurIntensity || 2}px)` }}>
        <button onClick={onEnd} style={{
          flex: 1, padding: '16px 0', borderRadius: 12, fontWeight: 700, fontSize: 15,
          background: 'rgba(255,50,50,0.15)', border: '1px solid rgba(255,50,50,0.3)',
          color: '#ff5050', cursor: 'pointer', transition: 'all 0.2s',
        }}>
          ⏹ {time > 0 ? 'Завершить' : 'Отмена'}
        </button>
      </div>

      <style>{`
        @keyframes rainDrop {
          0% { transform: translateY(0); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
    </div>
  );
}
