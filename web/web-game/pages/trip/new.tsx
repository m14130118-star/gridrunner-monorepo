import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useT } from '../../src/lib/i18n';
import { getApiUrl } from '../../src/lib/api';

const VIBES = [
  { id: 'aggressive', icon: 'fa-bolt', ru: 'Агрессивный', en: 'Aggressive' },
  { id: 'cruise', icon: 'fa-road', ru: 'Круиз', en: 'Cruise' },
  { id: 'dark', icon: 'fa-moon', ru: 'Ночной', en: 'Dark' },
  { id: 'scenic', icon: 'fa-mountain', ru: 'Панорамный', en: 'Scenic' },
  { id: 'urban', icon: 'fa-city', ru: 'Урбан', en: 'Urban' },
  { id: 'explore', icon: 'fa-compass', ru: 'Исследователь', en: 'Explorer' },
];

export default function TripNew() {
  const { t, lang } = useT();
  const router = useRouter();
  const [step, setStep] = useState<'generating' | 'ready' | 'gps'>('generating');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [route, setRoute] = useState<any>(null);
  const [error, setError] = useState('');
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    const savedVibes = localStorage.getItem('gridrunner_vibes');
    if (savedVibes) {
      try { setSelectedVibes(JSON.parse(savedVibes)); } catch {}
    }
    if (!navigator.geolocation) { setError(lang === 'ru' ? 'GPS недоступен' : 'GPS unavailable'); setStep('gps'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentPos([pos.coords.latitude, pos.coords.longitude]);
        generateRoute(pos.coords.latitude, pos.coords.longitude);
      },
      () => { setError(lang === 'ru' ? 'Включи GPS для генерации маршрута' : 'Enable GPS to generate route'); setStep('gps'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);
  const [vehicle, setVehicle] = useState('feet');
  useEffect(() => { setVehicle(localStorage.getItem('gridrunner_vehicle') || 'feet'); }, []);
  const generateRoute = async (lat: number, lng: number) => {
    const token = localStorage.getItem('gridrunner_token');
    const savedVibes = localStorage.getItem('gridrunner_vibes');
    let userVibes: string[] = [];
    if (savedVibes) { try { userVibes = JSON.parse(savedVibes); } catch {} }

    try {
      const r = await fetch(getApiUrl() + '/api/v1/geo/route/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ lat, lng, transport: vehicle, userVibes, waypointCount: 3 }),
      });
      const data = await r.json();
      if (data.success) {
        setRoute(data);
        setStep('ready');
      } else {
        setError(data.message || 'Route generation failed');
        setStep('gps');
      }
    } catch (e: any) {
      setError(e.message || 'Connection to server failed');
      setStep('gps');
    }
  };

  const startTrip = () => {
    if (route) {
      localStorage.setItem('gridrunner_trip_waypoints', JSON.stringify({
        waypoints: route.waypoints,
        finish: route.finish,
        totalScore: route.totalScore,
        transport: route.transport,
        userVibes: route.userVibes,
      }));
    }
    router.push('/trip/active');
  };

  const retryGps = () => {
    setError('');
    setStep('generating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentPos([pos.coords.latitude, pos.coords.longitude]);
        generateRoute(pos.coords.latitude, pos.coords.longitude);
      },
      () => { setError(lang === 'ru' ? 'Включи GPS' : 'Enable GPS'); setStep('gps'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const vehicleIcon: Record<string, string> = { feet: '🦶', skateboard: '🛹', bicycle: '🚲', car: '🚗' };

  if (step === 'generating') {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 20, animation: 'pulse 1.5s ease-in-out infinite' }}>
          <i className="fa-solid fa-map-location-dot" style={{ color: 'var(--green)' }}></i>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          {lang === 'ru' ? 'Генерируем маршрут...' : 'Generating route...'}
        </h2>
        <p style={{ fontSize: 13, opacity: 0.4 }}>
          {lang === 'ru' ? 'Подбираем атмосферные точки под твой вайб' : 'Finding atmospheric spots matching your vibe'}
        </p>
        <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.1)} }`}</style>
      </div>
    );
  }

  if (step === 'gps') {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>
          <i className="fa-solid fa-location-crosshairs" style={{ opacity: 0.3 }}></i>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          {lang === 'ru' ? 'Нужен GPS' : 'GPS required'}
        </h2>
        <p style={{ fontSize: 13, opacity: 0.4, marginBottom: 20 }}>{error}</p>
        <button onClick={retryGps} className="btn btn-primary">
          <i className="fa-solid fa-rotate"></i> {lang === 'ru' ? 'Повторить' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.back()} className="btn btn-secondary btn-icon" style={{ fontSize: 18, width: 40, height: 40 }}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            {lang === 'ru' ? 'Новый трип' : 'New trip'}
          </h1>
          {route && (
            <div style={{ fontSize: 12, opacity: 0.4, marginTop: 2 }}>
              {lang === 'ru' ? `Рейтинг маршрута: ${route.totalScore}` : `Route score: ${route.totalScore}`}
            </div>
          )}
        </div>
      </div>

      {/* Vehicle + Vibe info */}
      <div className="card" style={{ padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28 }}>{vehicleIcon[vehicle] || '🦶'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{vehicle}</div>
          <div style={{ fontSize: 11, opacity: 0.4 }}>
            {selectedVibes.length > 0
              ? selectedVibes.map((v: string) => VIBES.find((x: any) => x.id === v)).filter(Boolean).map((v: any) => lang === 'ru' ? v!.ru : v!.en).join(', ')
              : (lang === 'ru' ? 'Без вайба' : 'No vibe')}
          </div>
        </div>
      </div>

      {/* Route map placeholder */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16, height: 240, background: 'rgba(0,0,0,0.2)' }}>
        {currentPos && (
          <div style={{ width: '100%', height: '100%', position: 'relative', padding: 16 }}>
            {/* Simplified route visualization */}
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
              <svg viewBox="0 0 300 120" style={{ width: '100%', height: 120 }}>
                <line x1="20" y1="100" x2="80" y2="60" stroke="var(--green)" strokeWidth="3" strokeDasharray="6,4" opacity="0.6" />
                <line x1="80" y1="60" x2="170" y2="40" stroke="var(--green)" strokeWidth="3" strokeDasharray="6,4" opacity="0.6" />
                <line x1="170" y1="40" x2="280" y2="50" stroke="var(--green)" strokeWidth="3" strokeDasharray="6,4" opacity="0.6" />
                <circle cx="20" cy="100" r="8" fill="var(--green)" />
                <circle cx="80" cy="60" r="6" fill="#7c3aed" />
                <circle cx="170" cy="40" r="6" fill="#7c3aed" />
                <circle cx="280" cy="50" r="10" fill="#ffd740" />
                <text x="14" y="118" fill="var(--text)" fontSize="8" opacity="0.6">A</text>
                {route?.waypoints.map((w: any, i: number) => (
                  <text key={i} x={i === 0 ? 74 : 164} y={i === 0 ? 54 : 34} fill="var(--text)" fontSize="7" opacity="0.4">{i + 1}</text>
                ))}
                <text x="274" y="40" fill="var(--text)" fontSize="8" opacity="0.6">Б</text>
              </svg>
            </div>
            {route?.finish && (
              <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '6px 10px', fontSize: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 11 }}>🏁 {route.finish.name}</div>
                <div style={{ opacity: 0.5, marginTop: 1 }}>⭐ {route.finish.score}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Waypoints */}
      {route && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, opacity: 0.4, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <i className="fa-solid fa-flag"></i> {lang === 'ru' ? 'Чекпоинты' : 'Checkpoints'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Start */}
            <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, borderLeft: '3px solid var(--green)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,230,118,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12 }}>
                A
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{lang === 'ru' ? 'Старт' : 'Start'}</div>
                <div style={{ fontSize: 10, opacity: 0.4 }}>
                  {currentPos ? `${currentPos[0].toFixed(4)}, ${currentPos[1].toFixed(4)}` : ''}
                </div>
              </div>
            </div>
            {/* Waypoints */}
            {route.waypoints.map((wp: any, i: number) => (
              <div key={wp.id || i} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, borderLeft: `3px solid #7c3aed` }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: '#7c3aed', fontWeight: 700 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{wp.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.4 }}>
                    ⭐ {wp.score} {(wp.vibe_tags || []).join(' ')}
                  </div>
                </div>
                <span style={{ fontSize: 18, opacity: 0.3 }}>📍</span>
              </div>
            ))}
            {/* Finish */}
            {route.finish && (
              <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, borderLeft: '3px solid #ffd740' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,215,64,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                  🏁
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{route.finish.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.4 }}>
                    ⭐ {route.finish.score} {(route.finish.vibe_tags || []).join(' ')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Start button */}
      <button onClick={startTrip} className="btn btn-primary"
        style={{ width: '100%', padding: '18px 0', fontSize: 17, fontWeight: 800, borderRadius: 16 }}
      >
        <i className="fa-solid fa-play"></i> {lang === 'ru' ? 'Начать трип' : 'Start trip'}
      </button>
    </div>
  );
}
