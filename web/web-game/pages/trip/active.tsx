import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useT } from '../../src/lib/i18n';
import { getApiUrl } from '../../src/lib/api';
import dynamic from 'next/dynamic';

const TripMap = dynamic(() => import('../../src/components/TripMap'), { ssr: false });

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

interface Waypoint {
  id: number; name: string; lat: number; lng: number;
  score: number; vibe_tags?: string[];
}

interface TripData {
  waypoints: Waypoint[]; finish: Waypoint | null;
  totalScore: number; transport: string; userVibes: string[];
}

export default function ActiveTrip() {
  const { t, lang } = useT();
  const router = useRouter();

  const [tracking, setTracking] = useState(false);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [path, setPath] = useState<[number, number][]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [tripTime, setTripTime] = useState(0);
  const [tripDist, setTripDist] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [earnedGold, setEarnedGold] = useState(0);
  const [noGps, setNoGps] = useState(false);
  const [finished, setFinished] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState('feet');

  const [tripData, setTripData] = useState<TripData | null>(null);
  const [visitedWp, setVisitedWp] = useState<Set<number>>(new Set());
  const [justCheckedIn, setJustCheckedIn] = useState<number | null>(null);

  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const watchRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalWp = (tripData?.waypoints.length || 0) + (tripData?.finish ? 1 : 0);
  const visitedCount = visitedWp.size;

  useEffect(() => {
    const tok = localStorage.getItem('gridrunner_token');
    if (!tok) { router.push('/auth/login'); return; }
    setToken(tok);

    const raw = localStorage.getItem('gridrunner_trip_waypoints');
    if (raw) {
      try {
        const parsed: TripData = JSON.parse(raw);
        setTripData(parsed);
      } catch {}
    }

    const veh = localStorage.getItem('gridrunner_vehicle') || 'feet';
    setVehicleId(veh);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCurrentPos(p);
          beginTracking(p);
        },
        () => { setNoGps(true); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setNoGps(true);
    }
  }, []);

  const checkWaypointProximity = (pos: [number, number]) => {
    if (!tripData) return;
    for (const wp of tripData.waypoints) {
      if (visitedWp.has(wp.id)) continue;
      const dist = haversineKm(pos, [wp.lat, wp.lng]);
      if (dist <= 0.05) {
        setJustCheckedIn(wp.id);
        setVisitedWp(prev => new Set(prev).add(wp.id));
        if (token) {
          fetch(getApiUrl() + '/api/v1/player/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ checkpoint_id: wp.id, latitude: pos[0], longitude: pos[1] }),
          }).then(r => r.json()).then(data => {
            if (data.success) {
              setEarnedXp(prev => prev + data.reward.xp);
              setEarnedGold(prev => prev + data.reward.gold);
            }
          }).catch(() => {});
        }
        setTimeout(() => setJustCheckedIn(null), 2000);
      }
    }
    if (tripData.finish) {
      const dist = haversineKm(pos, [tripData.finish.lat, tripData.finish.lng]);
      if (dist <= 0.05) {
        setJustCheckedIn(-1);
        setVisitedWp(prev => new Set(prev).add(-1));
        setTimeout(() => setJustCheckedIn(null), 2000);
      }
    }
  };

  const beginTracking = (initialPos: [number, number]) => {
    setTracking(true);
    setStartTime(Date.now());
    setPath([initialPos]);
    checkWaypointProximity(initialPos);

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCurrentPos(p);
        setCurrentSpeed(pos.coords.speed !== null ? pos.coords.speed * 3.6 : 0);
        checkWaypointProximity(p);
        setPath(prev => {
          const last = prev[prev.length - 1];
          const d = haversineKm(last, p);
          if (d > 0.001) {
            setTripDist(prevDist => Number((prevDist + d).toFixed(3)));
            return [...prev, p];
          }
          return prev;
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    );

    tickRef.current = setInterval(() => {
      setTripTime(prev => prev + 1);
    }, 1000);
  };

  const endTrip = async () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    if (tickRef.current !== null) clearInterval(tickRef.current);
    setTracking(false);

    if (tripDist < 0.1 || !token) {
      setFinished(true);
      setStatusMsg(lang === 'ru' ? 'Слишком короткий трип' : 'Trip too short');
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch(getApiUrl() + '/api/v1/player/trip/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          distance: tripDist, duration: tripTime,
          waypoints_total: totalWp, waypoints_visited: visitedCount,
          transport: vehicleId,
        }),
      });
      const data = await r.json();
      if (data.success) {
        setResult(data);
        setEarnedXp(prev => prev + data.totalXp);
        setEarnedGold(prev => prev + data.totalGold);
        const stored = JSON.parse(localStorage.getItem('gridrunner_user') || '{}');
        stored.xp = (stored.xp || 0) + data.totalXp;
        stored.gold = (stored.gold || 0) + data.totalGold;
        stored.totalDistance = (stored.totalDistance || 0) + tripDist;
        stored.totalTrips = (stored.totalTrips || 0) + 1;
        if (data.levelUp) stored.level = data.newLevel;
        localStorage.setItem('gridrunner_user', JSON.stringify(stored));
      }
    } catch {}
    setSubmitting(false);
    setFinished(true);
    setStatusMsg(lang === 'ru' ? 'Трип завершён!' : 'Trip completed!');
  };

  const avgSpeed = tripTime > 0 ? (tripDist / (tripTime / 3600)) : 0;
  const displaySpeed = currentSpeed > 0 ? currentSpeed : avgSpeed;

  if (noGps) {
    return (
      <div className="page page-center" style={{ textAlign: 'center', flexDirection: 'column', gap: 16 }}>
        <i className="fa-solid fa-location-crosshairs" style={{ fontSize: 48, opacity: 0.3 }}></i>
        <p style={{ opacity: 0.5 }}>{lang === 'ru' ? 'Нет доступа к GPS' : 'No GPS access'}</p>
        <button onClick={() => router.push('/profile')} className="btn btn-secondary">{t('common.close')}</button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {tripDist > 0.1
            ? <i className="fa-solid fa-circle-check" style={{ color: '#00e676' }}></i>
            : <i className="fa-solid fa-circle-exclamation" style={{ color: '#ff1744' }}></i>}
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{statusMsg}</h2>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="card" style={{ textAlign: 'center', padding: '14px 18px', minWidth: 90 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#00e676' }}>{tripDist.toFixed(2)}</div>
            <div style={{ fontSize: 11, opacity: 0.4 }}>{t('trip.km')}</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '14px 18px', minWidth: 90 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{formatTime(tripTime)}</div>
            <div style={{ fontSize: 11, opacity: 0.4 }}>{t('trip.time')}</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '14px 18px', minWidth: 90 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ffd740' }}>+{earnedXp}</div>
            <div style={{ fontSize: 11, opacity: 0.4 }}>XP</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '14px 18px', minWidth: 90 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ff9100' }}>+{earnedGold}</div>
            <div style={{ fontSize: 11, opacity: 0.4 }}>G</div>
          </div>
        </div>
        {result && (
          <div className="card" style={{ padding: 14, marginBottom: 16, fontSize: 13, textAlign: 'left', maxWidth: 320, margin: '0 auto 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, marginBottom: 6 }}>
              <span>{lang === 'ru' ? 'Чекпоинты' : 'Checkpoints'}</span>
              <span>{result.waypoints_visited}/{result.waypoints_total}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, marginBottom: 6 }}>
              <span>{lang === 'ru' ? 'База' : 'Base'}</span>
              <span>+{result.baseXp} XP</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, marginBottom: 6 }}>
              <span>{lang === 'ru' ? 'Дистанция' : 'Distance'}</span>
              <span>+{result.distXp} XP</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, marginBottom: 6 }}>
              <span>{lang === 'ru' ? 'Чекины' : 'Check-ins'}</span>
              <span>+{result.wpXp} XP</span>
            </div>
            {result.durationBonus > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, marginBottom: 6 }}>
                <span>{lang === 'ru' ? 'Бонус времени' : 'Duration bonus'}</span>
                <span>+{result.durationBonus} XP</span>
              </div>
            )}
            {result.levelUp && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,215,0,0.12)', color: '#ffd740', fontWeight: 700, textAlign: 'center' }}>
                <i className="fa-solid fa-arrow-up"></i> LVL UP! {result.oldLevel} → {result.newLevel}
              </div>
            )}
          </div>
        )}
        <button onClick={() => router.push('/profile')} className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          {lang === 'ru' ? 'В профиль' : 'To profile'}
        </button>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="page page-center" style={{ textAlign: 'center', flexDirection: 'column', gap: 12 }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, opacity: 0.4 }}></i>
        <p style={{ opacity: 0.5 }}>{lang === 'ru' ? 'Завершаем трип...' : 'Completing trip...'}</p>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="page page-center" style={{ textAlign: 'center', flexDirection: 'column', gap: 12 }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, opacity: 0.4 }}></i>
        <p style={{ opacity: 0.5 }}>{lang === 'ru' ? 'Получаем GPS...' : 'Getting GPS...'}</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#0a0f0d', color: '#e0f0e0', display: 'flex', flexDirection: 'column' }}>
      {/* Speedometer bar top */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
        borderRadius: 16, padding: '12px 28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {lang === 'ru' ? 'Текущая скорость' : 'Current speed'}
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, color: '#00ff66', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
          {displaySpeed.toFixed(1)}
          <span style={{ fontSize: 16, color: '#fff', fontWeight: 400, marginLeft: 4 }}>км/ч</span>
        </div>
        <div style={{ fontSize: 10, color: '#666', marginTop: 4, display: 'flex', gap: 16 }}>
          <span>{tripDist.toFixed(2)} км</span>
          <span>{formatTime(tripTime)}</span>
          <span>{visitedCount}/{totalWp} {lang === 'ru' ? 'чек' : 'wp'}</span>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <TripMap path={path} waypoints={tripData?.waypoints || []} finish={tripData?.finish || undefined} currentPos={currentPos} />
      </div>

      {/* Checkin overlay */}
      {justCheckedIn !== null && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 200,
          background: 'rgba(0,230,118,0.15)', backdropFilter: 'blur(12px)',
          borderRadius: 16, padding: '20px 28px', textAlign: 'center',
          border: '1px solid rgba(0,230,118,0.3)',
          animation: 'fadeInOut 2s ease-in-out',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {justCheckedIn === -1
              ? <span style={{ fontSize: 40 }}>🏁</span>
              : <i className="fa-solid fa-location-dot" style={{ color: '#00e676' }}></i>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#00e676' }}>
            {justCheckedIn === -1
              ? (lang === 'ru' ? 'Финиш!' : 'Finish!')
              : (lang === 'ru' ? 'Чекин!' : 'Check-in!')}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>+25 XP</div>
        </div>
      )}

      {/* Waypoint list + End trip */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          maxHeight: 120, overflowY: 'auto', padding: '8px 12px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {tripData?.waypoints.map((wp, i) => {
            const done = visitedWp.has(wp.id);
            return (
              <div key={wp.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 8,
                background: done ? 'rgba(0,230,118,0.08)' : 'rgba(255,255,255,0.03)',
                borderLeft: `3px solid ${done ? '#00e676' : '#7c3aed'}`,
                fontSize: 12, opacity: done ? 0.7 : 1,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: done ? 'rgba(0,230,118,0.2)' : 'rgba(124,58,237,0.2)',
                  color: done ? '#00e676' : '#7c3aed', fontWeight: 700, fontSize: 10,
                }}>
                  {done ? <i className="fa-solid fa-check"></i> : i + 1}
                </div>
                <span style={{ flex: 1 }}>{wp.name}</span>
                <span style={{ opacity: 0.4, fontSize: 10 }}>
                  {done ? (lang === 'ru' ? 'Чекин' : 'Done') : `${wp.score} XP`}
                </span>
              </div>
            );
          })}
          {tripData?.finish && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 8,
              background: visitedWp.has(-1) ? 'rgba(0,230,118,0.08)' : 'rgba(255,215,64,0.08)',
              borderLeft: `3px solid ${visitedWp.has(-1) ? '#00e676' : '#ffd740'}`,
              fontSize: 12, opacity: visitedWp.has(-1) ? 0.7 : 1,
            }}>
              <span style={{ fontSize: 14 }}>🏁</span>
              <span style={{ flex: 1 }}>{tripData.finish.name}</span>
              <span style={{ opacity: 0.4, fontSize: 10 }}>
                {visitedWp.has(-1) ? (lang === 'ru' ? 'Чекин' : 'Done') : `${tripData.finish.score} XP`}
              </span>
            </div>
          )}
        </div>
        <div style={{ padding: '8px 16px 16px' }}>
          <button onClick={endTrip} style={{
            width: '100%', padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
            background: 'rgba(255,50,50,0.12)', border: '1px solid rgba(255,50,50,0.25)',
            color: '#ff5050', cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,50,50,0.2)')}
            onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,50,50,0.12)')}>
            <i className="fa-solid fa-stop"></i> {lang === 'ru' ? 'Завершить трип' : 'End trip'}
          </button>
        </div>
      </div>

      <style>{`@keyframes fadeInOut { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.8)} 15%{opacity:1;transform:translate(-50%,-50%) scale(1)} 85%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(-50%,-50%) scale(0.8)} }`}</style>
    </div>
  );
}
