import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useT } from '../../src/lib/i18n';
import { getApiUrl } from '../../src/lib/api';
import { useTrip, TripData } from '../../src/lib/trip-context';
import GpsGuard from '../../src/components/GpsGuard';
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

export default function ActiveTrip() {
  const { t, lang } = useT();
  const router = useRouter();
  const { trip: contextTrip } = useTrip();

  // Derived from context/localStorage
  const [tripData, setTripData] = useState<TripData | null>(null);

  // GPS tracking mode vs manual simulation
  const [mode, setMode] = useState<'gps' | 'simulate'>('gps');

  // GPS tracking state
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
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Waypoint state (works for both modes)
  const [visitedOrder, setVisitedOrder] = useState<Set<number>>(new Set());
  const [justCheckedIn, setJustCheckedIn] = useState<number | null>(null);
  const [simulateIdx, setSimulateIdx] = useState(0);

  // Result state
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const watchRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkpoints = tripData?.checkpoints || [];
  const totalCp = checkpoints.length;
  const visitedCount = visitedOrder.size;
  const plannedPath: [number, number][] = (() => {
    if (tripData?.routeGeometry?.coordinates) {
      return tripData.routeGeometry.coordinates.map(c => [c[1], c[0]] as [number, number]);
    }
    return [];
  })();

  useEffect(() => {
    const tok = localStorage.getItem('gridrunner_token');
    if (!tok) { router.push('/auth/login'); return; }
    setToken(tok);

    let td: TripData | null = null;
    if (contextTrip) {
      td = contextTrip;
      localStorage.setItem('gridrunner_trip_waypoints', JSON.stringify(contextTrip));
    } else {
      const raw = localStorage.getItem('gridrunner_trip_waypoints');
      if (raw) {
        try { td = JSON.parse(raw) as TripData; } catch {}
      }
    }

    if (!td || td.checkpoints.length === 0) {
      router.push('/trip/new');
      return;
    }

    setTripData(td);

    const veh = localStorage.getItem('gridrunner_vehicle') || 'feet';
    setVehicleId(veh);

    // Determine mode: if we have real GPS, use it; otherwise simulate
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMode('gps');
          const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCurrentPos(p);
          beginTracking(p);
        },
        () => {
          setMode('simulate');
          setTracking(true);
          setStartTime(Date.now());
          tickRef.current = setInterval(() => { setTripTime(prev => prev + 1); }, 1000);
          // Start at first checkpoint position
          const first = td!.checkpoints[0];
          setCurrentPos([first.lat, first.lng]);
          setPath([[first.lat, first.lng]]);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setMode('simulate');
      setTracking(true);
      setStartTime(Date.now());
      tickRef.current = setInterval(() => { setTripTime(prev => prev + 1); }, 1000);
      const first = td.checkpoints[0];
      setCurrentPos([first.lat, first.lng]);
      setPath([[first.lat, first.lng]]);
    }
  }, []);

  const checkWaypointProximity = (pos: [number, number]) => {
    if (checkpoints.length === 0) return;
    let newSize = visitedOrder.size;
    for (const cp of checkpoints) {
      if (visitedOrder.has(cp.order)) continue;
      const dist = haversineKm(pos, [cp.lat, cp.lng]);
      if (dist <= 0.05) {
        setJustCheckedIn(cp.order);
        setVisitedOrder(prev => { const next = new Set(prev); next.add(cp.order); return next; });
        newSize++;
        if (token) {
          fetch(getApiUrl() + '/api/v1/player/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ checkpoint_id: cp.id || cp.order, latitude: pos[0], longitude: pos[1] }),
          }).then(r => r.json()).then(data => {
            if (data.success) {
              setEarnedXp(prev => prev + (data.reward?.xp || 25));
              setEarnedGold(prev => prev + (data.reward?.gold || 5));
            }
          }).catch(() => {});
        } else {
          setEarnedXp(prev => prev + 25);
          setEarnedGold(prev => prev + 5);
        }
        setTimeout(() => setJustCheckedIn(null), 2000);
      }
    }
    // Auto-complete when all checkpoints visited
    if (newSize >= totalCp) {
      setTimeout(() => endTrip(), 1500);
    }
  };

  const simulateStep = () => {
    const next = simulateIdx + 1;
    if (next >= checkpoints.length) return;
    setSimulateIdx(next);
    const cp = checkpoints[next];
    const newPos: [number, number] = [cp.lat, cp.lng];
    setCurrentPos(newPos);
    setPath(prev => {
      const last = prev[prev.length - 1];
      const d = haversineKm(last, newPos);
      if (d > 0.001) setTripDist(prevDist => Number((prevDist + d).toFixed(3)));
      return [...prev, newPos];
    });
    checkWaypointProximity(newPos);
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
        setGpsAccuracy(pos.coords.accuracy ?? null);
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

    if (tripDist < 0.1 && mode === 'gps') {
      // Clear the death-protection flag on the backend even without rewards
      if (token) {
        fetch(getApiUrl() + '/api/v1/player/trip/abort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
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
          trip_id: tripData?.tripId,
          distance: tripDist, duration: tripTime,
          waypoints_total: totalCp, waypoints_visited: visitedCount,
          transport: vehicleId,
        }),
      });
      const data = await r.json();
      if (data.success) {
        setResult(data);
        const xpGain = data.totalXp || earnedXp;
        const goldGain = data.totalGold || earnedGold;
        setEarnedXp(xpGain);
        setEarnedGold(goldGain);
        const stored = JSON.parse(localStorage.getItem('gridrunner_user') || '{}');
        stored.xp = (stored.xp || 0) + xpGain;
        stored.gold = (stored.gold || 0) + goldGain;
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

  // Tactical HUD derived values
  const WEAR_PER_KM: Record<string, number> = { feet: 2, skateboard: 3, bicycle: 4, car: 6 };
  const systemWear = Math.min(100, Math.round(tripDist * (WEAR_PER_KM[vehicleId] ?? 2) * 10) / 10);
  const systemHealth = Math.max(0, 100 - systemWear);
  // Signal strength from GPS accuracy: <=10m strong, <=25m ok, <=60m weak
  const signalBars = gpsAccuracy === null ? 0 : gpsAccuracy <= 10 ? 4 : gpsAccuracy <= 25 ? 3 : gpsAccuracy <= 60 ? 2 : 1;

  if (finished) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {visitedCount === totalCp
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
          <div className="card" style={{ padding: 14, marginBottom: 16, fontSize: 13, textAlign: 'left', maxWidth: 320, margin: '0 auto 16px', fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, marginBottom: 6 }}>
              <span>{lang === 'ru' ? 'Чекпоинты' : 'Checkpoints'}</span>
              <span>{result.waypoints_visited || visitedCount}/{result.waypoints_total || totalCp}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, marginBottom: 6 }}>
              <span>{lang === 'ru' ? 'База' : 'Base'}</span>
              <span>+{result.breakdown?.baseXp ?? result.baseXp ?? 0} XP</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, marginBottom: 6 }}>
              <span>{lang === 'ru' ? 'Дистанция' : 'Distance'}</span>
              <span>+{result.breakdown?.distXp ?? result.distXp ?? 0} XP</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, marginBottom: 6 }}>
              <span>{lang === 'ru' ? 'Чекины' : 'Check-ins'}</span>
              <span>+{result.breakdown?.cpXp ?? result.wpXp ?? 0} XP</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, marginBottom: 6 }}>
              <span>{lang === 'ru' ? 'Время в пути' : 'Time on route'}</span>
              <span>+{result.breakdown?.timeXp ?? 0} XP</span>
            </div>
            {(result.breakdown?.foodBonus || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffd54f', marginBottom: 6 }}>
                <span>{lang === 'ru' ? 'Кибер-дозаправка' : 'Cyber refuel'}</span>
                <span>+{result.breakdown.foodBonus} GC</span>
              </div>
            )}
            {(result.breakdown?.targetMultiplier || 1) > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00e5ff', marginBottom: 6 }}>
                <span>{lang === 'ru' ? 'Точка B' : 'Point B'}</span>
                <span>×{result.breakdown.targetMultiplier}</span>
              </div>
            )}
            {(result.breakdown?.vipMultiplier || 1) > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffd740', marginBottom: 6 }}>
                <span>VIP DOUBLE DROP</span>
                <span>×{result.breakdown.vipMultiplier}</span>
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
    <GpsGuard>
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#0a0f0d', color: '#e0f0e0', display: 'flex', flexDirection: 'column' }}>
      {/* Tactical HUD */}
      <div style={{
        position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 12, right: 12, zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
        fontFamily: 'monospace',
      }}>
        <div style={{
          background: 'rgba(4, 16, 10, 0.88)', backdropFilter: 'blur(14px)',
          borderRadius: 14, padding: '10px 14px',
          border: '1px solid rgba(0,230,118,0.25)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.5), 0 0 16px rgba(0,230,118,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          {/* Speed */}
          <div style={{ textAlign: 'center', minWidth: 74 }}>
            {mode === 'gps' ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#00e676', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, textShadow: '0 0 10px rgba(0,230,118,0.5)' }}>
                  {displaySpeed.toFixed(1)}
                </div>
                <div style={{ fontSize: 8, color: '#5a7d6a', letterSpacing: 1 }}>{lang === 'ru' ? 'КМ/Ч' : 'KM/H'}</div>
              </>
            ) : (
              <div style={{ fontSize: 11, fontWeight: 700, color: '#00e5ff' }}>
                <i className="fa-solid fa-gamepad"></i><br />SIM
              </div>
            )}
          </div>
          {/* Signal */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 18, justifyContent: 'center' }}>
              {[1, 2, 3, 4].map(b => (
                <div key={b} style={{
                  width: 4, height: 4 + b * 3.5, borderRadius: 1,
                  background: b <= signalBars ? '#00e676' : 'rgba(255,255,255,0.12)',
                  boxShadow: b <= signalBars ? '0 0 6px rgba(0,230,118,0.6)' : 'none',
                }} />
              ))}
            </div>
            <div style={{ fontSize: 8, color: '#5a7d6a', letterSpacing: 1, marginTop: 3 }}>
              {lang === 'ru' ? 'СИГНАЛ' : 'SIGNAL'}{gpsAccuracy !== null ? ` ±${Math.round(gpsAccuracy)}м` : ''}
            </div>
          </div>
          {/* Data collected */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#00e5ff', lineHeight: 1.2 }}>
              {visitedCount}<span style={{ color: '#40606f', fontSize: 14 }}>/{totalCp}</span>
            </div>
            <div style={{ fontSize: 8, color: '#5a7d6a', letterSpacing: 1 }}>{lang === 'ru' ? 'ДАННЫЕ' : 'DATA'}</div>
          </div>
          {/* System integrity (vehicle wear) */}
          <div style={{ textAlign: 'center', minWidth: 60 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: systemHealth > 60 ? '#00e676' : systemHealth > 30 ? '#ffd54f' : '#ff5252', lineHeight: 1.2 }}>
              {Math.round(systemHealth)}%
            </div>
            <div style={{ fontSize: 8, color: '#5a7d6a', letterSpacing: 1 }}>{lang === 'ru' ? 'СИСТЕМЫ' : 'SYSTEMS'}</div>
          </div>
        </div>
        {/* distance + time strip */}
        <div style={{
          alignSelf: 'center',
          background: 'rgba(4, 16, 10, 0.8)', backdropFilter: 'blur(10px)',
          borderRadius: 10, padding: '4px 14px',
          border: '1px solid rgba(0,230,118,0.15)',
          fontSize: 11, color: '#9fd4b4', display: 'flex', gap: 14,
        }}>
          <span>{tripDist.toFixed(2)} {lang === 'ru' ? 'км' : 'km'}</span>
          <span style={{ color: '#3a5d4a' }}>|</span>
          <span>{formatTime(tripTime)}</span>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <TripMap path={path} currentPos={currentPos} plannedPath={plannedPath} checkpoints={checkpoints} visited={visitedOrder} />
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
          <div style={{ fontSize: 40, marginBottom: 8 }}>
            <i className="fa-solid fa-satellite-dish" style={{ color: '#00e676' }}></i>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#00e676', fontFamily: 'monospace', letterSpacing: 1 }}>
            {lang === 'ru' ? 'ДАННЫЕ СОБРАНЫ' : 'DATA CAPTURED'}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>+25 XP</div>
        </div>
      )}

      {/* Bottom panel */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          maxHeight: 120, overflowY: 'auto', padding: '8px 12px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {checkpoints.map((cp, i) => {
            const done = visitedOrder.has(cp.order);
            const accent = done ? '#00e676' : cp.kind === 'food' ? '#ffd54f' : cp.kind === 'finish' ? '#00e5ff' : '#76ff8f';
            return (
              <div key={cp.order} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 8,
                background: done ? 'rgba(0,230,118,0.08)' : 'rgba(255,255,255,0.03)',
                borderLeft: `3px solid ${accent}`,
                fontSize: 12, opacity: done ? 0.7 : 1,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: `${accent}26`,
                  color: accent, fontWeight: 700, fontSize: 10, fontFamily: 'monospace',
                }}>
                  {done ? <i className="fa-solid fa-check"></i>
                    : cp.kind === 'food' ? <i className="fa-solid fa-utensils"></i>
                    : cp.kind === 'finish' ? <i className="fa-solid fa-flag-checkered"></i>
                    : cp.order}
                </div>
                <span style={{ flex: 1 }}>{cp.name}</span>
                <span style={{ opacity: 0.4, fontSize: 10, fontFamily: 'monospace' }}>
                  {done ? 'OK'
                    : cp.kind === 'food' ? (lang === 'ru' ? 'еда' : 'food')
                    : cp.kind === 'finish' ? 'B'
                    : (cp as any).real === false ? (lang === 'ru' ? 'чекни' : 'check')
                    : cp.vibe}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '8px 16px 16px', display: 'flex', gap: 8 }}>
          {mode === 'simulate' && simulateIdx < checkpoints.length - 1 && (
            <button onClick={simulateStep} style={{
              flex: 1, padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
              background: 'rgba(0,170,255,0.12)', border: '1px solid rgba(0,170,255,0.25)',
              color: '#00aaff', cursor: 'pointer', transition: 'all 0.2s',
            }}>
              <i className="fa-solid fa-forward-step"></i> {lang === 'ru' ? 'На чекпоинт' : 'Next checkpoint'}
            </button>
          )}
          <button onClick={endTrip} style={{
            flex: 1, padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
            background: 'rgba(255,50,50,0.12)', border: '1px solid rgba(255,50,50,0.25)',
            color: '#ff5050', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <i className="fa-solid fa-stop"></i> {lang === 'ru' ? 'Завершить' : 'End'}
          </button>
        </div>
      </div>

      <style>{`@keyframes fadeInOut { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.8)} 15%{opacity:1;transform:translate(-50%,-50%) scale(1)} 85%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(-50%,-50%) scale(0.8)} }`}</style>
    </div>
    </GpsGuard>
  );
}
