import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useT } from '../src/lib/i18n';
import { getApiUrl } from '../src/lib/api';

interface UserData {
  username: string; level: number; gold: number; xp: number;
  totalDistance: number; totalTrips: number; checkins: number;
  vip: boolean; rank: string; vehicle: string;
  walkXp: number; skateXp: number; bikeXp: number; carXp: number;
  walkTrips: number; skateTrips: number; bikeTrips: number; carTrips: number;
  missionsCompleted?: number;
}

function xpForLevel(level: number) { return level * 80 + 200; }

const VEHICLE_MAP: Record<string, { icon: string; label: string; labelEn: string; color: string }> = {
  feet: { icon: '🦶', label: 'Пешком', labelEn: 'Walk', color: '#00e676' },
  skateboard: { icon: '🛹', label: 'Скейтборд', labelEn: 'Skateboard', color: '#7c3aed' },
  bicycle: { icon: '🚲', label: 'Велосипед', labelEn: 'Bicycle', color: '#3b82f6' },
  car: { icon: '🚗', label: 'Автомобиль', labelEn: 'Car', color: '#f59e0b' },
};

export default function Profile() {
  const { t, lang } = useT();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [achProgress, setAchProgress] = useState<any[]>([]);

  useEffect(() => {
    try {
      const u = localStorage.getItem('gridrunner_user');
      if (u) { const p = JSON.parse(u); if (p && typeof p.level === 'number') setUser(p); else { localStorage.removeItem('gridrunner_user'); router.push('/auth/login'); } }
      else router.push('/auth/login');
    } catch { localStorage.removeItem('gridrunner_user'); router.push('/auth/login'); }
    setLoaded(true);
  }, [router]);

  useEffect(() => {
    const saved = localStorage.getItem('gridrunner_avatar');
    if (saved) setAvatar(saved);
  }, []);

  const [currentVehicle, setCurrentVehicle] = useState('feet');

  useEffect(() => {
    setCurrentVehicle(localStorage.getItem('gridrunner_vehicle') || 'feet');
    const token = localStorage.getItem('gridrunner_token');
    if (!token) return;
    fetch(getApiUrl() + '/api/v1/player/profile', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json()).then(d => {
        if (d.success && d.profile) {
          const stored = JSON.parse(localStorage.getItem('gridrunner_user') || '{}');
          const enriched = { ...stored, ...d.profile };
          localStorage.setItem('gridrunner_user', JSON.stringify(enriched));
          setUser(enriched);
        }
      }).catch(() => {});
    fetch(getApiUrl() + '/api/v1/player/achievements/progress', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json()).then(d => { if (d.success) setAchProgress(d.progress || []); }).catch(() => {});
  }, []);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatar(dataUrl);
      localStorage.setItem('gridrunner_avatar', dataUrl);
      window.dispatchEvent(new Event('avatar-update'));
    };
    reader.readAsDataURL(file);
  };

  const cv = VEHICLE_MAP[currentVehicle] || VEHICLE_MAP.feet;

  if (!loaded || !user) return null;

  const xpNeeded = xpForLevel(user.level);
  const xpProgress = Math.min(100, Math.round((user.xp / xpNeeded) * 100));
  const nextLevelXp = xpNeeded - user.xp;
  const earnedAch = achProgress.filter(a => a.earned).length;
  const totalAch = achProgress.length;

  return (
    <div className="page" style={{ paddingBottom: 120 }}>
      {/* Hero */}
      <div className="anim-fade" style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: `conic-gradient(#00e676 ${xpProgress}%, rgba(255,255,255,0.06) ${xpProgress}%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', padding: 3, cursor: 'pointer',
          }} onClick={() => document.getElementById('avatar-input')?.click()}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              overflow: 'hidden', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 800, color: '#00e676',
            }}>
              {avatar ? (<img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)
                : user.username[0].toUpperCase()}
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s', fontSize: 10, color: '#fff', fontWeight: 600,
              }} className="avatar-overlay"><i className="fa-solid fa-camera"></i></div>
            </div>
          </div>
          <input id="avatar-input" type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
          {user.vip && <div style={{ position: 'absolute', top: -4, right: -4, width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#000', fontWeight: 700, boxShadow: '0 0 12px rgba(245,158,11,0.4)' }}>👑</div>}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 2px' }}>{user.username}</h1>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <span className="badge" style={{ background: 'rgba(0,230,118,0.12)', color: '#00e676' }}>LVL {user.level}</span>
          <span className="badge" style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd740' }}>{user.gold} G</span>
          <span className="badge" style={{ background: 'rgba(255,145,0,0.1)', color: '#ff9100' }}>{user.rank || '—'}</span>
        </div>
        <div style={{ maxWidth: 300, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span style={{ opacity: 0.5 }}>{user.xp} XP</span>
            <span style={{ opacity: 0.3 }}>{nextLevelXp > 0 ? `${nextLevelXp} XP до LVL ${user.level + 1}` : 'MAX'}</span>
          </div>
          <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ width: `${xpProgress}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #00e676, #69f0ae)', transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>

      {/* Current vehicle badge */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: `${cv.color}12`, border: `1px solid ${cv.color}22`, fontSize: 13, fontWeight: 600 }}>
          <span style={{ fontSize: 18 }}>{cv.icon}</span>
          <span>{lang === 'ru' ? cv.label : cv.labelEn}</span>
        </div>
      </div>

      {/* Main stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: lang === 'ru' ? 'Дистанция' : 'Distance', value: `${(user.totalDistance || 0).toFixed(1)} км`, icon: 'fa-road', color: '#00e676' },
          { label: lang === 'ru' ? 'Поездки' : 'Trips', value: `${user.totalTrips || 0}`, icon: 'fa-location-dot', color: '#7c3aed' },
          { label: lang === 'ru' ? 'Чекины' : 'Check-ins', value: `${user.checkins || 0}`, icon: 'fa-flag-checkered', color: '#3b82f6' },
          { label: lang === 'ru' ? 'Ачивки' : 'Achievements', value: `${earnedAch}/${totalAch}`, icon: 'fa-trophy', color: '#ffd740' },
          { label: lang === 'ru' ? 'Миссии' : 'Missions', value: `${user.missionsCompleted || 0}`, icon: 'fa-bullseye', color: '#ff6d00' },
          { label: 'Gold', value: `${user.gold}`, icon: 'fa-coins', color: '#f9a825' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
            <i className={`fa-solid ${s.icon}`} style={{ fontSize: 18, color: s.color, marginBottom: 4, display: 'block' }}></i>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions — all nav */}
      <div className="card" style={{ padding: 12, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <Link href="/garage" className="btn btn-secondary btn-sm" style={{ flexDirection: 'column', padding: '12px 6px', gap: 6, fontSize: 11, borderRadius: 12 }}>
            <i className="fa-solid fa-warehouse" style={{ fontSize: 20 }}></i>
            <span>{t('nav.garage')}</span>
          </Link>
          <Link href="/trips" className="btn btn-secondary btn-sm" style={{ flexDirection: 'column', padding: '12px 6px', gap: 6, fontSize: 11, borderRadius: 12 }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 20 }}></i>
            <span>{t('nav.trips')}</span>
          </Link>
          <Link href="/arena" className="btn btn-secondary btn-sm" style={{ flexDirection: 'column', padding: '12px 6px', gap: 6, fontSize: 11, borderRadius: 12 }}>
            <i className="fa-solid fa-crosshairs" style={{ fontSize: 20 }}></i>
            <span>{t('nav.arena')}</span>
          </Link>
          <Link href="/leaderboard" className="btn btn-secondary btn-sm" style={{ flexDirection: 'column', padding: '12px 6px', gap: 6, fontSize: 11, borderRadius: 12 }}>
            <i className="fa-solid fa-ranking-star" style={{ fontSize: 20 }}></i>
            <span>Rank</span>
          </Link>
          <Link href="/news" className="btn btn-secondary btn-sm" style={{ flexDirection: 'column', padding: '12px 6px', gap: 6, fontSize: 11, borderRadius: 12 }}>
            <i className="fa-solid fa-newspaper" style={{ fontSize: 20 }}></i>
            <span>{t('nav.news')}</span>
          </Link>
          <Link href="/vip" className="btn btn-secondary btn-sm" style={{ flexDirection: 'column', padding: '12px 6px', gap: 6, fontSize: 11, borderRadius: 12 }}>
            <i className="fa-solid fa-crown" style={{ fontSize: 20, color: '#ffd740' }}></i>
            <span>VIP</span>
          </Link>
          <Link href="/settings" className="btn btn-secondary btn-sm" style={{ flexDirection: 'column', padding: '12px 6px', gap: 6, fontSize: 11, borderRadius: 12 }}>
            <i className="fa-solid fa-gear" style={{ fontSize: 20 }}></i>
            <span>{t('nav.settings')}</span>
          </Link>
          <button onClick={() => { localStorage.removeItem('gridrunner_user'); localStorage.removeItem('gridrunner_token'); router.push('/auth/login'); }}
            className="btn btn-danger btn-sm" style={{ flexDirection: 'column', padding: '12px 6px', gap: 6, fontSize: 11, borderRadius: 12, width: '100%' }}>
            <i className="fa-solid fa-right-from-bracket" style={{ fontSize: 20 }}></i>
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </div>

      {/* Achievements */}
      {achProgress.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, opacity: 0.4, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fa-solid fa-trophy"></i> {lang === 'ru' ? 'Достижения' : 'Achievements'}
            <span style={{ fontWeight: 400, opacity: 0.5 }}>({earnedAch}/{totalAch})</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {achProgress.slice(0, 20).map((a: any, i: number) => (
              <div key={i} className="card" style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                opacity: a.earned ? 1 : 0.5,
              }}>
                <span style={{ fontSize: 22, filter: a.earned ? 'none' : 'grayscale(0.6)' }}>{a.earned ? '🏆' : '🔒'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{lang === 'ru' ? a.titleRu : a.titleEn}</div>
                  <div style={{ fontSize: 10, opacity: 0.4 }}>{lang === 'ru' ? a.descRu : a.descEn}</div>
                </div>
                {!a.earned && a.current != null && a.target != null && (
                  <div style={{ fontSize: 10, opacity: 0.3, whiteSpace: 'nowrap' }}>{a.current}/{a.target}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account actions */}
      <div className="card" style={{ padding: 14, marginBottom: 20, display: 'flex', gap: 8 }}>
        <Link href="/settings" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', padding: '10px 0', gap: 6, fontSize: 12, borderRadius: 10 }}>
          <i className="fa-solid fa-gear"></i>
          <span>{t('nav.settings')}</span>
        </Link>
        <button onClick={() => { localStorage.removeItem('gridrunner_user'); localStorage.removeItem('gridrunner_token'); router.push('/auth/login'); }}
          className="btn btn-danger btn-sm" style={{ flex: 1, justifyContent: 'center', padding: '10px 0', gap: 6, fontSize: 12, borderRadius: 10 }}>
          <i className="fa-solid fa-right-from-bracket"></i>
          <span>{t('nav.logout')}</span>
        </button>
      </div>

      {/* Stats table */}
      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, opacity: 0.4, marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          <i className="fa-solid fa-chart-simple"></i> {lang === 'ru' ? 'Подробная статистика' : 'Detailed stats'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
          {[
            { l: lang === 'ru' ? 'Уровень' : 'Level', v: user.level },
            { l: lang === 'ru' ? 'Ранг' : 'Rank', v: user.rank || '—' },
            { l: lang === 'ru' ? 'Опыт' : 'XP', v: user.xp },
            { l: lang === 'ru' ? 'Золото' : 'Gold', v: user.gold },
            { l: lang === 'ru' ? 'Дистанция' : 'Distance', v: `${(user.totalDistance || 0).toFixed(1)} км` },
            { l: lang === 'ru' ? 'Поездки' : 'Trips', v: user.totalTrips || 0 },
            { l: lang === 'ru' ? 'Чекины' : 'Check-ins', v: user.checkins || 0 },
            { l: lang === 'ru' ? 'Миссии' : 'Missions', v: user.missionsCompleted || 0 },
            { l: `${lang === 'ru' ? 'Опыт (пешком)' : 'Walk XP'}`, v: user.walkXp || 0 },
            { l: `${lang === 'ru' ? 'Опыт (скейт)' : 'Skate XP'}`, v: user.skateXp || 0 },
            { l: `${lang === 'ru' ? 'Опыт (вело)' : 'Bike XP'}`, v: user.bikeXp || 0 },
            { l: `${lang === 'ru' ? 'Опыт (авто)' : 'Car XP'}`, v: user.carXp || 0 },
          ].map(row => (
            <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ opacity: 0.5 }}>{row.l}</span>
              <span style={{ fontWeight: 600 }}>{row.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
