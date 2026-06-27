import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useT } from '../src/lib/i18n';
import { getApiUrl } from '../src/lib/api';

interface Trip {
  id: number; user_id: number; latitude: number; longitude: number;
  vehicle_id: number; isArenaMode: boolean; timestamp: number;
}

export default function TripsPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [replayProgress, setReplayProgress] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('gridrunner_token');
    if (!token) { router.push('/auth/login'); return; }
    fetch(getApiUrl() + '/api/v1/player/trips', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      if (d.success) setTrips(d.trips);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Group trips by proximity (simplified)
  const tripGroups = trips.reduce((acc, t) => {
    const key = new Date(t.timestamp).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, Trip[]>);

  useEffect(() => {
    if (!selectedTrip) return;
    const interval = setInterval(() => {
      setReplayProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [selectedTrip]);

  const speedColor = (speed: number) => {
    if (speed < 5) return '#00e676';
    if (speed < 15) return '#f59e0b';
    return '#ff5252';
  };

  if (loading) {
    return (
      <div className="trips-page">
        <div className="trips-container">
          <div className="skeleton-scan-container">
            <div className="skeleton-scan-line" />
            {[1,2,3].map(i => <div key={i} className="skeleton-block" style={{height:80}}><div className="skeleton-shine"/></div>)}
          </div>
        </div>
        <style jsx>{`
          .trips-page { min-height: calc(100vh - var(--header-h)); padding: 24px 16px; color: var(--text); }
          .trips-container { max-width: 600px; margin: 0 auto; }
          .skeleton-scan-container { position:relative; overflow:hidden; border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:12px; background:var(--card-bg); }
          .skeleton-scan-line { position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(0,230,118,0.6) 20%,rgba(0,230,118,0.9) 50%,rgba(0,230,118,0.6) 80%,transparent); animation:scan 2.5s infinite; z-index:2; }
          @keyframes scan { 0%{top:0;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
          .skeleton-block { background:var(--card-bg); border-radius:8px; overflow:hidden; position:relative; }
          .skeleton-shine { position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent); animation:shine 1.5s infinite; }
          @keyframes shine { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        `}</style>
      </div>
    );
  }

  return (
    <div className="trips-page">
      <div className="trips-container">
        <h1 className="trips-title">
          <i className="fa-solid fa-clock-rotate-left"></i>
          {lang === 'ru' ? ' История поездок' : ' Trip History'}
        </h1>

        {selectedTrip ? (
          <div className="trip-replay">
            <button className="trip-back" onClick={() => { setSelectedTrip(null); setReplayProgress(0); }}>
              <i className="fa-solid fa-arrow-left"></i> {lang === 'ru' ? 'Назад' : 'Back'}
            </button>

            <div className="replay-map">
              <div className="replay-track">
                <div className="replay-trail" style={{ width: `${replayProgress}%` }} />
              </div>
              <div className="replay-hud">
                <div className="replay-stat">
                  <span className="r-label">{lang === 'ru' ? 'Скорость' : 'Speed'}</span>
                  <span className="r-value" style={{ color: speedColor(replayProgress * 0.3) }}>
                    {(replayProgress * 0.3).toFixed(1)} км/ч
                  </span>
                </div>
                <div className="replay-stat">
                  <span className="r-label">{lang === 'ru' ? 'Прогресс' : 'Progress'}</span>
                  <span className="r-value">{replayProgress}%</span>
                </div>
              </div>

              <div className="replay-timeline">
                <button className="replay-btn" onClick={() => setReplayProgress(0)}>
                  <i className="fa-solid fa-rotate-left"></i>
                </button>
                <div className="replay-track-full">
                  <div className="replay-fill" style={{ width: `${replayProgress}%`, background: speedColor(replayProgress * 0.3) }} />
                  {[25, 50, 75].map(p => (
                    <div key={p} className="replay-checkpoint" style={{ left: `${p}%` }}
                      onClick={() => setReplayProgress(p)}
                    >
                      <div className="cp-dot" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="replay-info">
              <p><strong>{lang === 'ru' ? 'Режим' : 'Mode'}:</strong> {selectedTrip.isArenaMode ? '⚔️ Arena' : '🌿 Chill'}</p>
              <p><strong>Time:</strong> {new Date(selectedTrip.timestamp).toLocaleString()}</p>
              <p><strong>Lat/Lng:</strong> {selectedTrip.latitude?.toFixed(4)}, {selectedTrip.longitude?.toFixed(4)}</p>
            </div>
          </div>
        ) : (
          Object.entries(tripGroups).length === 0 ? (
            <div className="trips-empty">
              <i className="fa-solid fa-road" style={{ fontSize: 48, opacity: 0.2 }}></i>
              <p>{lang === 'ru' ? 'Пока нет поездок' : 'No trips yet'}</p>
            </div>
          ) : (
            Object.entries(tripGroups).reverse().map(([date, group]) => (
              <div key={date} className="trip-day">
                <h3 className="trip-date">{date}</h3>
                {group.slice(0, 1).map(t => (
                  <div key={t.id} className="trip-card" onClick={() => setSelectedTrip(t)}>
                    <div className="trip-icon">{t.isArenaMode ? '⚔️' : '🌿'}</div>
                    <div className="trip-details">
                      <span className="trip-mode">{t.isArenaMode ? 'Arena' : 'Chill'}</span>
                      <span className="trip-time">{new Date(t.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <i className="fa-solid fa-play trip-play"></i>
                  </div>
                ))}
              </div>
            ))
          )
        )}
      </div>

      <style jsx>{`
        .trips-page {
          min-height: calc(100vh - var(--header-h));
          padding: 24px 16px;
          color: var(--text);
        }
        .trips-container { max-width: 600px; margin: 0 auto; }
        .trips-title { font-size: 22px; font-weight: 700; margin-bottom: 24px; }
        .trip-day { margin-bottom: 20px; }
        .trip-date { font-size: 13px; opacity: 0.4; margin-bottom: 8px; font-weight: 600; }
        .trip-card {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px; border-radius: 12px;
          background: var(--card-bg); border: 1px solid var(--border);
          cursor: pointer; transition: all 0.2s;
        }
        .trip-card:hover { border-color: var(--primary); }
        .trip-icon { font-size: 24px; }
        .trip-details { flex: 1; }
        .trip-mode { display: block; font-size: 14px; font-weight: 600; }
        .trip-time { font-size: 12px; opacity: 0.4; }
        .trip-play { opacity: 0.3; transition: all 0.2s; }
        .trip-card:hover .trip-play { opacity: 1; color: var(--primary); }
        .trips-empty {
          text-align: center; padding: 60px 0; opacity: 0.5;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .trip-back {
          background: none; border: 1px solid var(--border); color: var(--text);
          padding: 8px 16px; border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; gap: 6px; margin-bottom: 16px;
          font-size: 13px; transition: all 0.2s;
        }
        .trip-back:hover { border-color: var(--primary); }
        .replay-map {
          background: var(--card-bg); border: 1px solid var(--border);
          border-radius: 12px; padding: 20px; margin-bottom: 16px;
        }
        .replay-track {
          height: 4px; background: var(--border); border-radius: 2px;
          margin-bottom: 16px; overflow: hidden;
        }
        .replay-trail {
          height: 100%; background: linear-gradient(90deg, #00e676, #f59e0b, #ff5252);
          border-radius: 2px; transition: width 0.1s linear;
        }
        .replay-hud {
          display: flex; gap: 24px; justify-content: center; margin-bottom: 16px;
        }
        .r-label { display: block; font-size: 11px; opacity: 0.4; }
        .r-value { font-size: 18px; font-weight: 700; }
        .replay-timeline {
          display: flex; align-items: center; gap: 12px;
        }
        .replay-btn {
          background: none; border: none; color: var(--text); cursor: pointer;
          font-size: 16px; opacity: 0.5; padding: 4px;
        }
        .replay-btn:hover { opacity: 1; }
        .replay-track-full {
          flex: 1; height: 6px; background: var(--border); border-radius: 3px; position: relative;
        }
        .replay-fill { height: 100%; border-radius: 3px; transition: width 0.1s linear; }
        .replay-checkpoint {
          position: absolute; top: 50%; transform: translate(-50%, -50%); cursor: pointer;
        }
        .cp-dot {
          width: 10px; height: 10px; border-radius: 50%; background: var(--primary);
          border: 2px solid var(--bg); animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }
        .replay-info {
          background: var(--card-bg); border: 1px solid var(--border);
          border-radius: 12px; padding: 16px; font-size: 13px; display: flex; flex-direction: column; gap: 6px;
        }
        .replay-info p { margin: 0; }
      `}</style>
    </div>
  );
}
