import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/router';
import { BackButton } from '../src/components/BackButton';
import { useT } from '../src/lib/i18n';
import { getApiUrl } from '../src/lib/api';
import dynamic from 'next/dynamic';
import { fetchWeather, getWeatherTheme, getHUDTheme, getSeason } from '../src/lib/weather';

const Vehicle3D = dynamic(() => import('../src/components/Vehicle3D'), { ssr: false });

const VEHICLES = [
  { id: 'feet', name: 'Ноги', nameEn: 'Walk', fa: 'fa-person-walking', color: '#00e676', desc: 'Размеренный темп', descEn: 'Relaxed pace', speed: '≤12 км/ч', speedEn: '≤12 km/h' },
  { id: 'skateboard', name: 'Скейтборд', nameEn: 'Skateboard', fa: 'fa-snowboarding', color: '#7c3aed', desc: 'Драйв и адреналин', descEn: 'Drive & adrenaline', speed: '≤25 км/ч', speedEn: '≤25 km/h' },
  { id: 'bicycle', name: 'Велосипед', nameEn: 'Bicycle', fa: 'fa-bicycle', color: '#3b82f6', desc: 'Скорость и выносливость', descEn: 'Speed & endurance', speed: '≤45 км/ч', speedEn: '≤45 km/h' },
  { id: 'car', name: 'Машина', nameEn: 'Car', fa: 'fa-car', color: '#f59e0b', desc: 'Дальние поездки (VIP)', descEn: 'Road trips (VIP)', speed: '≤160 км/ч', speedEn: '≤160 km/h', vip: true },
];

function xpRequired(level: number) {
  return Math.round(1000 * Math.pow(level, 1.3) + 500);
}

// SVG noise texture as base64
const NOISE_SVG = 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'5\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.4\'/%3E%3C/svg%3E")';
const STAIN_SVG = 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'s\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.03\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23s)\' opacity=\'0.3\'/%3E%3C/svg%3E")';

const GARAGE_STYLES = {
  concrete: `
    linear-gradient(180deg,
      rgba(35,37,41,1) 0%, rgba(40,43,48,1) 8%, rgba(37,40,44,1) 16%,
      rgba(42,45,50,1) 25%, rgba(38,40,44,1) 35%, rgba(44,47,52,1) 45%,
      rgba(36,39,43,1) 55%, rgba(41,44,48,1) 65%, rgba(34,37,41,1) 75%,
      rgba(40,42,46,1) 85%, rgba(32,35,39,1) 100%
    )
  `,
  wallJoint: `
    repeating-linear-gradient(0deg,
      transparent 0px, transparent 150px,
      rgba(0,0,0,0.06) 150px, rgba(0,0,0,0.06) 152px
    ),
    repeating-linear-gradient(90deg,
      transparent 0px, transparent 200px,
      rgba(0,0,0,0.04) 200px, rgba(0,0,0,0.04) 202px
    )
  `,
  waterStain: `
    radial-gradient(ellipse at 30% 25%, rgba(60,55,50,0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 40%, rgba(50,55,50,0.06) 0%, transparent 40%)
  `,
  floorConcrete: `
    linear-gradient(180deg,
      rgba(45,47,51,1) 0%, rgba(42,44,48,1) 20%, rgba(48,50,54,1) 40%,
      rgba(40,42,46,1) 60%, rgba(46,48,52,1) 80%, rgba(38,40,44,1) 100%
    )
  `,
  floorLine: `
    repeating-linear-gradient(90deg,
      transparent 0px, transparent 160px,
      rgba(220,180,55,0.12) 160px, rgba(220,180,55,0.08) 164px
    )
  `,
  oilStain: `
    radial-gradient(ellipse at 45% 55%, rgba(15,10,5,0.12) 0%, transparent 40%),
    radial-gradient(ellipse at 60% 70%, rgba(10,8,5,0.08) 0%, transparent 30%)
  `,
  tireStack: `
    radial-gradient(ellipse at 50% 50%, rgba(20,20,20,0.25) 0%, rgba(30,30,35,0.1) 60%, transparent 100%)
  `,
};

export default function GaragePage() {
  const { t, lang } = useT();
  const router = useRouter();
  const [simple, setSimple] = useState(false);
  const [activeIdx, setActiveIdx] = useState(1);
  const [inspectMode, setInspectMode] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [userVehicle, setUserVehicle] = useState('skateboard');
  const [achProgress, setAchProgress] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    setSimple(localStorage.getItem('gridrunner_garage_mode') === 'simple');
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('gridrunner_token');
    if (!token) return;
    // Fetch profile
    fetch(getApiUrl() + '/api/v1/player/profile', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json()).then(d => {
        if (d.success && d.profile) {
          setProfile(d.profile);
          setUserVehicle(d.profile.current_vehicle || 'skateboard');
          const idx = VEHICLES.findIndex(v => v.id === (d.profile.current_vehicle || 'skateboard'));
          if (idx >= 0) setActiveIdx(idx);
        }
      }).catch(() => {});
    // Fetch achievements
    fetch(getApiUrl() + '/api/v1/player/achievements/progress', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json()).then(d => {
        if (d.success) setAchProgress(d.progress || []);
      }).catch(() => {});
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!dragStart) return;
    const dx = e.changedTouches[0].clientX - dragStart.x;
    const dy = e.changedTouches[0].clientY - dragStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 50 && activeIdx > 0) setActiveIdx(i => i - 1);
      else if (dx < -50 && activeIdx < VEHICLES.length - 1) setActiveIdx(i => i + 1);
    } else {
      if (dy > 50) setInspectMode(true);
      else if (dy < -50) setInspectMode(false);
    }
    setDragStart(null);
  };

  const v = VEHICLES[activeIdx];

  if (simple) {
    return (
      <div className="page" style={{ padding: '24px 16px 120px' }}>
        <BackButton />
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fa-solid fa-warehouse"></i> {t('nav.garage')}
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {VEHICLES.map(vs => {
            const isActive = userVehicle === vs.id;
            const locked = vs.vip && !profile?.vip;
            return (
              <button key={vs.id} onClick={async () => {
                if (locked) return;
                const token = localStorage.getItem('gridrunner_token');
                if (token) {
                  await fetch(getApiUrl() + '/api/v1/player/vehicle/select', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                    body: JSON.stringify({ vehicle: vs.id }),
                  }).catch(() => {});
                }
                setUserVehicle(vs.id);
              }}
                className="card card-hover"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: locked ? 'default' : 'pointer',
                  width: '100%', border: `1px solid ${isActive ? vs.color : 'var(--border)'}`,
                  background: isActive ? `${vs.color}08` : undefined,
                  opacity: locked ? 0.4 : 1, textAlign: 'left', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: isActive ? vs.color : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
                  <i className={`fa-solid ${vs.fa}`} style={{ color: isActive ? '#000' : 'rgba(255,255,255,0.4)' }}></i>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{lang === 'ru' ? vs.name : vs.nameEn}</span>
                    {locked && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'rgba(255,145,0,0.15)', color: '#ff9100', fontWeight: 700 }}>VIP</span>}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.35, marginTop: 1 }}>{lang === 'ru' ? vs.desc : vs.descEn} · {lang === 'ru' ? vs.speed : vs.speedEn}</div>
                </div>
                {isActive && <i className="fa-solid fa-check" style={{ color: vs.color, fontSize: 16 }}></i>}
              </button>
            );
          })}
        </div>
        <button onClick={() => {
          const token = localStorage.getItem('gridrunner_token');
          if (!token) { router.push('/auth/login'); return; }
          if (!navigator.geolocation) { alert(lang === 'ru' ? 'GPS недоступен' : 'GPS unavailable'); return; }
          navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
              const r = await fetch(getApiUrl() + '/api/v1/geo/route/generate', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, transport: userVehicle, userVibes: [], waypointCount: 3 }),
              });
              const data = await r.json();
              if (data.success) {
                localStorage.setItem('gridrunner_trip_waypoints', JSON.stringify({
                  waypoints: data.waypoints, finish: data.finish, totalScore: data.totalScore,
                  transport: data.transport, userVibes: data.userVibes,
                }));
                localStorage.setItem('gridrunner_vehicle', userVehicle);
                router.push('/trip/active');
              } else { alert(data.message || 'Route generation failed'); }
            } catch { alert(lang === 'ru' ? 'Ошибка соединения' : 'Connection failed'); }
          }, () => { alert(lang === 'ru' ? 'Включи GPS' : 'Enable GPS'); }, { enableHighAccuracy: true, timeout: 10000 });
        }}
          className="btn btn-primary"
          style={{ width: '100%', padding: '18px 0', fontSize: 17, fontWeight: 800, borderRadius: 16, marginTop: 20 }}
        >
          <i className="fa-solid fa-play"></i> {t('trip.new')}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - var(--header-h))',
      display: 'flex', flexDirection: 'column', position: 'relative',
      overflow: 'hidden', userSelect: 'none', touchAction: 'none',
      background: '#0d0f12',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
        <BackButton />
      </div>
      {/* Detailed realistic garage background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {/* Concrete walls with noise texture */}
        <div style={{ position: 'absolute', inset: 0, background: GARAGE_STYLES.concrete }} />
        <div style={{ position: 'absolute', inset: 0, background: GARAGE_STYLES.wallJoint }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.035, backgroundImage: NOISE_SVG, backgroundSize: '256px 256px' }} />
        <div style={{ position: 'absolute', inset: 0, background: GARAGE_STYLES.waterStain }} />

        {/* Concrete floor with noise + oil stains */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', background: GARAGE_STYLES.floorConcrete }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', opacity: 0.03, backgroundImage: NOISE_SVG, backgroundSize: '200px 200px' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', background: GARAGE_STYLES.floorLine }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', background: GARAGE_STYLES.oilStain }} />

        {/* Floor-wall transition */}
        <div style={{ position: 'absolute', bottom: '22%', left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent 5%, rgba(200,180,55,0.15) 25%, rgba(200,180,55,0.1) 50%, rgba(200,180,55,0.15) 75%, transparent 95%)' }} />
        <div style={{ position: 'absolute', bottom: '22%', left: 0, right: 0, height: 10, background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: '22.1%', left: 0, right: 0, height: 1, background: 'rgba(200,180,55,0.06)' }} />

        {/* Parking spot frame */}
        <div style={{ position: 'absolute', bottom: '6%', left: '8%', width: '84%', height: '12%', border: '1.5px solid rgba(220,180,55,0.1)', borderRadius: 2 }} />
        <div style={{ position: 'absolute', bottom: '6%', left: '50%', width: 1.5, height: '12%', background: 'rgba(220,180,55,0.07)' }} />

        {/* Ceiling - 4 fluorescent light fixtures */}
        {[18, 38, 58, 78].map(pct => (
          <div key={pct}>
            <div style={{
              position: 'absolute', top: '4%', left: `${pct - 5}%`, width: '10%',
              height: '3.5%', background: 'rgba(255,248,230,0.3)',
              borderRadius: 1, border: '1px solid rgba(80,80,85,0.4)',
              boxShadow: '0 0 24px rgba(255,240,200,0.12), inset 0 0 8px rgba(255,248,230,0.1)',
            }} />
            {/* Light fixture frame */}
            <div style={{
              position: 'absolute', top: '3.5%', left: `${pct - 6}%`, width: '12%',
              height: '0.8%', background: 'rgba(60,60,65,0.5)', borderRadius: 1,
            }} />
          </div>
        ))}

        {/* Ceiling grid / structure */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '15%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,248,230,0.04) 0%, transparent 70%)',
        }} />

        {/* Central warm light pool */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '80%', height: '55%',
          background: 'radial-gradient(ellipse at center 12%, rgba(255,240,200,0.04) 0%, transparent 70%)',
        }} />

        {/* Sectional garage door (right side) */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '32%', height: '78%',
          background: 'linear-gradient(180deg, rgba(48,48,52,0.55) 0%, rgba(38,38,42,0.45) 100%)',
          borderLeft: '1px solid rgba(80,80,85,0.2)',
          borderRight: '1px solid rgba(60,60,65,0.1)',
        }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              position: 'absolute', top: `${i * 25}%`, left: 0, right: 0, height: '24.8%',
              borderTop: i > 0 ? '1px solid rgba(80,80,85,0.15)' : 'none',
              borderBottom: '1px solid rgba(60,60,65,0.1)',
              background: i % 2 === 0 ? 'rgba(42,42,47,0.25)' : 'rgba(50,50,55,0.15)',
            }}>
              {/* Window panel */}
              <div style={{
                position: 'absolute', top: '15%', left: '25%', width: '50%',
                height: '60%', background: 'rgba(30,35,40,0.3)',
                border: '1px solid rgba(80,80,85,0.1)', borderRadius: 1,
              }} />
              {/* Handle */}
              <div style={{
                position: 'absolute', top: '50%', left: '8%', width: '6%',
                height: '20%', background: 'rgba(80,80,85,0.15)', borderRadius: 1,
              }} />
            </div>
          ))}
          {/* Door track rail */}
          <div style={{
            position: 'absolute', top: 0, right: '2%', width: '3%', height: '100%',
            background: 'rgba(60,60,65,0.1)', borderRadius: 1,
          }} />
        </div>

        {/* Workbench + tool chest (left side) */}
        <div style={{
          position: 'absolute', bottom: '24%', left: '1.5%', width: '10%', height: '16%',
          border: '1px solid rgba(70,65,55,0.15)', borderRadius: 1,
          background: 'linear-gradient(180deg, rgba(55,50,42,0.25) 0%, rgba(45,42,38,0.15) 100%)',
        }}>
          {/* Workbench surface */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8%', background: 'rgba(80,70,55,0.15)' }} />
          {/* Tool shadow */}
          <div style={{ position: 'absolute', top: '12%', left: '15%', width: '30%', height: '20%', background: 'rgba(0,0,0,0.05)', borderRadius: 1 }} />
          <div style={{ position: 'absolute', top: '14%', left: '55%', width: '20%', height: '15%', background: 'rgba(0,0,0,0.04)', borderRadius: 1 }} />
        </div>

        {/* Tool chest / cabinet */}
        <div style={{
          position: 'absolute', bottom: '24%', left: '12.5%', width: '5%', height: '12%',
          background: 'linear-gradient(180deg, rgba(50,50,55,0.2) 0%, rgba(40,40,45,0.12) 100%)',
          border: '1px solid rgba(60,60,65,0.1)', borderRadius: 1,
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              position: 'absolute', top: `${i * 33 + 5}%`, left: '15%', right: '15%',
              height: '25%', border: '1px solid rgba(60,60,65,0.08)', borderRadius: 0.5,
            }} />
          ))}
        </div>

        {/* Tire stack (right side floor) */}
        <div style={{
          position: 'absolute', bottom: '24%', right: '33%', width: '7%', height: '10%',
          background: GARAGE_STYLES.tireStack,
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              position: 'absolute', bottom: `${i * 30}%`, left: '5%', width: '90%',
              height: '28%', borderRadius: '50%',
              border: '2px solid rgba(30,30,35,0.15)',
              background: 'rgba(25,25,28,0.08)',
            }} />
          ))}
        </div>

        {/* Fire extinguisher (right wall) */}
        <div style={{
          position: 'absolute', bottom: '40%', right: '33.5%', width: '2%', height: '8%',
          background: 'linear-gradient(180deg, rgba(180,40,40,0.15) 0%, rgba(150,30,30,0.1) 100%)',
          border: '1px solid rgba(180,40,40,0.08)', borderRadius: 1,
        }} />

        {/* Ceiling pipes */}
        <div style={{
          position: 'absolute', top: '8%', left: '10%', width: '55%', height: '1.2%',
          background: 'rgba(80,80,85,0.08)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', top: '11%', left: '5%', width: '40%', height: '0.8%',
          background: 'rgba(70,70,75,0.06)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', top: '11%', left: '45%', width: '3%', height: '3%',
          borderRadius: '50%', background: 'rgba(80,80,85,0.06)',
        }} />

        {/* Cable conduit on ceiling */}
        <div style={{
          position: 'absolute', top: '14%', left: '15%', right: '35%', height: '0.6%',
          background: 'rgba(50,55,60,0.06)',
        }} />

        {/* Wall power outlet */}
        <div style={{
          position: 'absolute', bottom: '35%', left: '14%', width: '1.5%', height: '2.5%',
          background: 'rgba(60,60,65,0.1)', borderRadius: 0.5,
          border: '1px solid rgba(60,60,65,0.06)',
        }} />

        {/* Calendar / poster on wall */}
        <div style={{
          position: 'absolute', top: '25%', left: '12%', width: '5%', height: '7%',
          background: 'rgba(255,250,240,0.03)', border: '1px solid rgba(100,100,100,0.04)', borderRadius: 0.5,
        }} />

        {/* Ventilation duct */}
        <div style={{
          position: 'absolute', top: '10%', left: '2%', width: '2.5%', height: '18%',
          background: 'linear-gradient(180deg, rgba(80,80,85,0.12) 0%, rgba(60,60,65,0.08) 100%)',
          borderLeft: '1px solid rgba(80,80,85,0.06)',
          borderRight: '1px solid rgba(80,80,85,0.06)',
        }} />
        <div style={{
          position: 'absolute', top: '10%', left: '1%', width: '4.5%', height: '2%',
          background: 'rgba(80,80,85,0.06)',
        }} />
      </div>

      {/* Vehicle 3D display */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1, overflow: 'hidden',
      }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      >
        <div key={v.id} style={{
          width: '100%', height: '100%', position: 'absolute', inset: 0,
          transform: `translateY(${inspectMode ? -20 : 0}px)`,
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <Suspense fallback={
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, fontSize: 60 }}>
              <i className={`fa-solid ${v.fa}`}></i>
            </div>
          }>
            <Vehicle3D vehicle={v.id} color={v.color} />
          </Suspense>
        </div>

        {/* Navigation arrows */}
        {activeIdx > 0 && (
          <button onClick={() => setActiveIdx(i => i - 1)}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
        )}
        {activeIdx < VEHICLES.length - 1 && (
          <button onClick={() => setActiveIdx(i => i + 1)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        )}
      </div>

      {/* Info panel */}
      <div style={{
        position: 'relative', zIndex: 1, padding: '0 24px 24px',
        transform: `translateY(${inspectMode ? 0 : 20}px)`,
        opacity: inspectMode ? 1 : 0.7,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#e8eef0' }}>
          {lang === 'ru' ? v.name : v.nameEn}
        </h2>
        <p style={{ fontSize: 13, opacity: 0.4, margin: '2px 0 4px' }}>
          {lang === 'ru' ? v.desc : v.descEn}
        </p>
        <p style={{ fontSize: 11, opacity: 0.25, marginBottom: 14 }}>
          {lang === 'ru' ? v.speed : v.speedEn}
        </p>

        {v.vip && (
          <div onClick={() => router.push('/vip')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 14px', borderRadius: 20,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 14,
          }}>
            <i className="fa-solid fa-crown"></i> VIP
          </div>
        )}

        {(() => {
          const lvl = profile?.level || 1;
          const curXp = profile?.xp || 0;
          const needXp = xpRequired(lvl);
          const pct = Math.min(100, Math.round((curXp / needXp) * 100));
          return (
            <>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, opacity: 0.35, marginBottom: 2 }}>{t('garage.level')}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: v.color }}>{lvl}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, opacity: 0.35, marginBottom: 2 }}>XP</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{curXp}/{needXp}</div>
                </div>
              </div>
              <div style={{ maxWidth: 300, margin: '0 auto 20px' }}>
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', borderRadius: 2, background: v.color, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            </>
          );
        })()}

        {/* Achievements — dynamic from backend */}
        <div style={{
          textAlign: 'left', background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14,
          maxWidth: 340, margin: '0 auto 16px',
        }}>
          <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fa-solid fa-trophy" style={{ color: v.color }}></i>
            {t('garage.achievements')} ({achProgress.filter(a => a.earned).length}/{achProgress.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {achProgress.filter(a => a.category === 'vehicle' || a.category === 'explorer' || a.category === 'speed').slice(0, 5).map(ach => {
              const isVehicleAch = ach.condition?.vehicle === v.id;
              if (isVehicleAch || ach.category === 'explorer' || ach.category === 'speed') {
                const pct = ach.stats ? Math.min(100, Math.round((ach.stats.current / ach.stats.target) * 100)) : 0;
                return (
                  <div key={ach.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: ach.earned ? 1 : 0.4 }}>
                    <i className={`fa-solid ${ach.earned ? 'fa-check-circle' : 'fa-lock'}`} style={{ color: ach.earned ? v.color : '#666', minWidth: 14 }}></i>
                    <span style={{ flex: 1 }}>{ach.title}</span>
                    {!ach.earned && ach.stats && <span style={{ fontSize: 10, opacity: 0.5 }}>{pct}%</span>}
                  </div>
                );
              }
              return null;
            })}
            {achProgress.filter(a => !a.earned && a.category === 'vehicle').length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: 0.3 }}>
                <i className="fa-solid fa-lock"></i>
                <span>{t('garage.next_ach')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Start trip button */}
        <button onClick={() => {
          const token = localStorage.getItem('gridrunner_token');
          if (!token) { router.push('/auth/login'); return; }
          if (!navigator.geolocation) { alert(lang === 'ru' ? 'GPS недоступен' : 'GPS unavailable'); return; }
          navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
              const r = await fetch(getApiUrl() + '/api/v1/geo/route/generate', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, transport: userVehicle, userVibes: [], waypointCount: 3 }),
              });
              const data = await r.json();
              if (data.success) {
                localStorage.setItem('gridrunner_trip_waypoints', JSON.stringify({
                  waypoints: data.waypoints, finish: data.finish, totalScore: data.totalScore,
                  transport: data.transport, userVibes: data.userVibes,
                }));
                localStorage.setItem('gridrunner_vehicle', userVehicle);
                router.push('/trip/active');
              } else { alert(data.message || 'Route generation failed'); }
            } catch { alert(lang === 'ru' ? 'Ошибка соединения' : 'Connection failed'); }
          }, () => { alert(lang === 'ru' ? 'Включи GPS' : 'Enable GPS'); }, { enableHighAccuracy: true, timeout: 10000 });
        }}
          style={{
            width: '100%', maxWidth: 340, padding: '14px 0', borderRadius: 12,
            border: 'none', background: 'linear-gradient(135deg, #00e676, #00c853)',
            color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            margin: '0 auto',
          }}>
          <i className="fa-solid fa-play"></i> {t('trip.start')}
        </button>
      </div>

      {/* Bottom hint */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', gap: 16, justifyContent: 'center',
        padding: '12px 0 24px', fontSize: 10, opacity: 0.2,
      }}>
        <span><i className="fa-solid fa-arrow-left"></i> <i className="fa-solid fa-arrow-right"></i> {t('garage.swipe')}</span>
        <span><i className="fa-solid fa-arrow-down"></i> {t('garage.stats')}</span>
      </div>
    </div>
  );
}
