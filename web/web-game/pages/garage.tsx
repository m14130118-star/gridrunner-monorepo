import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { BackButton } from '../src/components/BackButton';
import { useT } from '../src/lib/i18n';
import { getApiUrl } from '../src/lib/api';
import { useTrip } from '../src/lib/trip-context';

const VEHICLES = [
  { id: 'feet', name: 'Пешком', nameEn: 'On foot', fa: 'fa-person-walking', color: '#00e676', desc: 'Размеренный темп', descEn: 'Relaxed pace', speed: '≤12 км/ч', speedEn: '≤12 km/h' },
  { id: 'skateboard', name: 'Скейтборд', nameEn: 'Skateboard', fa: 'skate', color: '#7c3aed', desc: 'Драйв и адреналин', descEn: 'Drive & adrenaline', speed: '≤25 км/ч', speedEn: '≤25 km/h' },
  { id: 'bicycle', name: 'Велосипед', nameEn: 'Bicycle', fa: 'fa-bicycle', color: '#3b82f6', desc: 'Скорость и выносливость', descEn: 'Speed & endurance', speed: '≤45 км/ч', speedEn: '≤45 km/h' },
  { id: 'car', name: 'Машина', nameEn: 'Car', fa: 'fa-car-side', color: '#f59e0b', desc: 'Дальние поездки', descEn: 'Road trips', speed: '≤160 км/ч', speedEn: '≤160 km/h', vip: true },
];

// FontAwesome free не содержит нормального скейтборда, поэтому рисуем свой SVG
function VehicleIcon({ fa, color, size }: { fa: string; color: string; size: number }) {
  const glow = color.startsWith('#') ? `drop-shadow(0 0 ${size / 5}px ${color}88)` : 'none';
  if (fa === 'skate') {
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', filter: glow }}>
        <g transform="rotate(-7 32 32)">
          {/* дека с загнутыми носом и хвостом */}
          <path d="M7 30 C4 23 12 21 17 23 L47 23 C52 21 60 23 57 30 C56 33 52.5 33.8 49 33.2 L15 33.2 C11.5 33.8 8 33 7 30 Z" fill={color} />
          {/* трэки */}
          <rect x="16" y="33" width="3.4" height="4.4" rx="1" fill={color} opacity="0.8" />
          <rect x="44.6" y="33" width="3.4" height="4.4" rx="1" fill={color} opacity="0.8" />
          {/* колёса */}
          <circle cx="17.7" cy="40.5" r="4.4" fill={color} />
          <circle cx="46.3" cy="40.5" r="4.4" fill={color} />
          <circle cx="17.7" cy="40.5" r="1.6" fill="#0a1410" />
          <circle cx="46.3" cy="40.5" r="1.6" fill="#0a1410" />
        </g>
      </svg>
    );
  }
  return <i className={`fa-solid ${fa}`} style={{ fontSize: size, color, filter: glow }}></i>;
}

export default function GaragePage() {
  const { t, lang } = useT();
  const router = useRouter();
  const { setWizard } = useTrip();
  const [activeIdx, setActiveIdx] = useState(1);
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  // Bay icon size: fixed on first render (SSR-safe), tuned to viewport after mount
  const [baySize, setBaySize] = useState(100);
  useEffect(() => {
    const calc = () => setBaySize(Math.max(72, Math.min(120, window.innerWidth * 0.26)));
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('gridrunner_token');
    if (!token) return;
    fetch(getApiUrl() + '/api/v1/player/profile', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json()).then(d => {
        if (d.success && d.profile) {
          setProfile(d.profile);
          const idx = VEHICLES.findIndex(v => v.id === (d.profile.current_vehicle || 'skateboard'));
          if (idx >= 0) setActiveIdx(idx);
        }
      }).catch(() => {});
  }, []);

  const v = VEHICLES[activeIdx];
  const locked = !!v.vip && !profile?.vip;
  const isSelected = profile?.current_vehicle === v.id;

  const selectVehicle = async () => {
    if (locked) { router.push('/vip'); return; }
    setSaving(true);
    const token = localStorage.getItem('gridrunner_token');
    if (token) {
      await fetch(getApiUrl() + '/api/v1/player/vehicle/select', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ vehicle: v.id }),
      }).catch(() => {});
    }
    localStorage.setItem('gridrunner_vehicle', v.id);
    setProfile((p: any) => ({ ...(p || {}), current_vehicle: v.id }));
    setSaving(false);
  };

  const startTrip = () => {
    const token = localStorage.getItem('gridrunner_token');
    if (!token) { router.push('/auth/login'); return; }
    if (locked) { router.push('/vip'); return; }
    localStorage.setItem('gridrunner_wizard_vehicle', v.id);
    localStorage.setItem('gridrunner_vehicle', v.id);
    setWizard({ vehicle: v.id } as any);
    router.push('/trip/new');
  };

  const prev = () => setActiveIdx(i => (i - 1 + VEHICLES.length) % VEHICLES.length);
  const next = () => setActiveIdx(i => (i + 1) % VEHICLES.length);

  return (
    <div className="page" style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 110 }}>
      <BackButton />
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <i className="fa-solid fa-warehouse" style={{ color: '#00e676' }}></i> {t('nav.garage')}
      </h1>

      {/* Showcase bay */}
      <div
        onTouchStart={e => setDragStart(e.touches[0].clientX)}
        onTouchEnd={e => {
          if (dragStart === null) return;
          const dx = e.changedTouches[0].clientX - dragStart;
          if (dx > 45) prev(); else if (dx < -45) next();
          setDragStart(null);
        }}
        style={{
          position: 'relative', borderRadius: 20, overflow: 'hidden',
          border: `1px solid ${v.color}44`, marginBottom: 16,
          background: `radial-gradient(ellipse at 50% 35%, ${v.color}1f 0%, rgba(9,17,14,0.9) 60%, #06110c 100%)`,
          minHeight: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '32px 16px',
        }}>
        {/* neon grid floor */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${v.color}22 1px, transparent 1px), linear-gradient(90deg, ${v.color}22 1px, transparent 1px)`, backgroundSize: '34px 34px', maskImage: 'linear-gradient(180deg, transparent 45%, #000 100%)', WebkitMaskImage: 'linear-gradient(180deg, transparent 45%, #000 100%)', opacity: 0.5 }} />

        {/* arrows */}
        <button onClick={prev} aria-label="prev" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 3, width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)', color: '#cfe', cursor: 'pointer' }}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <button onClick={next} aria-label="next" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 3, width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)', color: '#cfe', cursor: 'pointer' }}>
          <i className="fa-solid fa-chevron-right"></i>
        </button>

        {/* big vehicle icon */}
        <div key={v.id} style={{ position: 'relative', zIndex: 2, animation: 'gr-bay-in 0.35s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
          <VehicleIcon fa={v.fa} color={v.color} size={baySize} />
        </div>
        <div style={{ zIndex: 2, marginTop: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            {lang === 'ru' ? v.name : v.nameEn}
            {v.vip && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: locked ? 'rgba(255,145,0,0.18)' : 'rgba(0,230,118,0.15)', color: locked ? '#ff9100' : '#00e676', fontWeight: 800 }}><i className="fa-solid fa-crown"></i> VIP</span>}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.5, marginTop: 3 }}>{lang === 'ru' ? v.desc : v.descEn} · {lang === 'ru' ? v.speed : v.speedEn}</div>
        </div>

        {/* dots */}
        <div style={{ position: 'absolute', bottom: 12, display: 'flex', gap: 6, zIndex: 3 }}>
          {VEHICLES.map((_, i) => (
            <span key={i} onClick={() => setActiveIdx(i)} style={{ width: i === activeIdx ? 18 : 6, height: 6, borderRadius: 3, background: i === activeIdx ? v.color : 'rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'all 0.25s' }} />
          ))}
        </div>
      </div>

      {/* vehicle selector chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {VEHICLES.map((vs, i) => {
          const vlocked = !!vs.vip && !profile?.vip;
          const active = i === activeIdx;
          const sel = profile?.current_vehicle === vs.id;
          return (
            <button key={vs.id} onClick={() => setActiveIdx(i)}
              style={{
                position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '10px 4px', borderRadius: 12, cursor: 'pointer', color: 'inherit', fontFamily: 'inherit',
                background: active ? `${vs.color}14` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? vs.color : 'rgba(255,255,255,0.06)'}`,
                opacity: vlocked ? 0.5 : 1,
              }}>
              <span style={{ display: 'inline-flex', height: 20, alignItems: 'center' }}>
                <VehicleIcon fa={vs.fa} color={active ? vs.color : 'rgba(255,255,255,0.5)'} size={20} />
              </span>
              <span style={{ fontSize: 9, opacity: 0.6 }}>{lang === 'ru' ? vs.name : vs.nameEn}</span>
              {sel && <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, color: vs.color }}><i className="fa-solid fa-circle-check"></i></span>}
              {vlocked && <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, color: '#ff9100' }}><i className="fa-solid fa-lock"></i></span>}
            </button>
          );
        })}
      </div>

      {/* per-vehicle level + xp */}
      {(() => {
        const lvl = profile?.vehicleLevels?.[v.id] || 1;
        const totalVXp = profile?.vehicleXp?.[v.id] || 0;
        const curXp = Math.max(0, totalVXp - (lvl - 1) * 1000);
        const pct = Math.min(100, Math.round((curXp / 1000) * 100));
        return (
          <div className="card" style={{ padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
              <span style={{ opacity: 0.6 }}>{lang === 'ru' ? 'Уровень транспорта' : 'Vehicle level'} <b style={{ color: v.color }}>{lvl}</b></span>
              <span style={{ opacity: 0.4, fontFamily: 'monospace' }}>{curXp}/1000 XP</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ width: pct + '%', height: '100%', borderRadius: 3, background: v.color, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        );
      })()}

      {/* actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!isSelected && !locked && (
          <button onClick={selectVehicle} disabled={saving} className="btn btn-secondary" style={{ width: '100%', padding: '13px 0', borderRadius: 14, fontWeight: 700 }}>
            <i className="fa-solid fa-check"></i> {saving ? '...' : (lang === 'ru' ? 'Выбрать этот транспорт' : 'Select this vehicle')}
          </button>
        )}
        {isSelected && (
          <div style={{ textAlign: 'center', fontSize: 12, color: v.color, fontFamily: 'monospace', padding: '4px 0' }}>
            <i className="fa-solid fa-circle-check"></i> {lang === 'ru' ? 'Текущий транспорт' : 'Current vehicle'}
          </div>
        )}
        {locked ? (
          <button onClick={() => router.push('/vip')} className="btn btn-primary" style={{ width: '100%', padding: '15px 0', borderRadius: 16, fontWeight: 800, background: 'linear-gradient(135deg, #ffd740, #f59e0b)', color: '#1a1200' }}>
            <i className="fa-solid fa-crown"></i> {lang === 'ru' ? 'Открыть в VIP' : 'Unlock with VIP'}
          </button>
        ) : (
          <button onClick={startTrip} className="btn btn-primary" style={{ width: '100%', padding: '16px 0', borderRadius: 16, fontSize: 16, fontWeight: 800 }}>
            <i className="fa-solid fa-play"></i> {t('trip.start')}
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes gr-bay-in {
          from { opacity: 0; transform: translateY(10px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
