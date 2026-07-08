import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useT } from '../src/lib/i18n';
import { getApiUrl } from '../src/lib/api';

interface UserData {
  username: string; level: number; gold: number; xp: number;
  totalDistance: number; totalTrips: number; checkins: number;
  vip: boolean; rank: string; vehicle: string;
  missionsCompleted?: number;
  role?: string; faction?: string; factionName?: string; factionRole?: string; factionSize?: number; factionId?: string; hp?: number; gridCoins?: number;
}

function xpForLevel(level: number) { return level * 80 + 200; }

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

  useEffect(() => {
    const token = localStorage.getItem('gridrunner_token');
    if (!token) return;
    fetch(getApiUrl() + '/api/v1/player/profile', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json()).then(d => {
        if (d.success && d.profile) {
          localStorage.setItem('gridrunner_user', JSON.stringify(d.profile));
          setUser(d.profile);
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

  if (!loaded || !user) return null;

  const xpNeeded = xpForLevel(user.level);
  const xpProgress = Math.min(100, Math.round((user.xp / xpNeeded) * 100));
  const nextLevelXp = xpNeeded - user.xp;
  const earnedAch = achProgress.filter(a => a.earned).length;
  const totalAch = achProgress.length;

  return (
    <div className="page" style={{ paddingBottom: 120, maxWidth: 560, margin: '0 auto' }}>
      {/* Hero */}
      <div className="anim-fade" style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {/* Plain avatar — no progress ring drawn on it */}
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            border: '2px solid rgba(0,230,118,0.35)', boxShadow: '0 0 18px rgba(0,230,118,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', cursor: 'pointer', overflow: 'hidden', position: 'relative',
            fontSize: 34, fontWeight: 800, color: '#00e676', background: 'rgba(0,230,118,0.06)',
          }} onClick={() => document.getElementById('avatar-input')?.click()}>
            {avatar ? (<img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)
              : user.username[0].toUpperCase()}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s', fontSize: 12, color: '#fff',
            }} className="avatar-overlay"><i className="fa-solid fa-camera"></i></div>
          </div>
          <input id="avatar-input" type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
          {user.vip && <div style={{ position: 'absolute', top: -2, right: -2, width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #ffd740, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#000', boxShadow: '0 0 12px rgba(245,158,11,0.5)' }}><i className="fa-solid fa-crown"></i></div>}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 2px' }}>{user.username}</h1>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <span className="badge" style={{ background: 'rgba(0,230,118,0.12)', color: '#00e676' }}>LVL {user.level}</span>
          <span className="badge" style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd740' }}>{user.gold} G</span>
          <span className="badge" style={{ background: 'rgba(255,145,0,0.1)', color: '#ff9100' }}>{user.rank || '—'}</span>
        </div>
        {/* XP bar (below the avatar, not on it) */}
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

      {/* Main stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: lang === 'ru' ? 'Дистанция' : 'Distance', value: `${(user.totalDistance || 0).toFixed(1)} км`, icon: 'fa-road', color: '#00e676' },
          { label: lang === 'ru' ? 'Поездки' : 'Trips', value: `${user.totalTrips || 0}`, icon: 'fa-location-dot', color: '#7c3aed' },
          { label: lang === 'ru' ? 'Чекины' : 'Check-ins', value: `${user.checkins || 0}`, icon: 'fa-flag-checkered', color: '#3b82f6' },
          { label: lang === 'ru' ? 'Ачивки' : 'Achievements', value: `${earnedAch}/${totalAch}`, icon: 'fa-trophy', color: '#ffd740', href: '/achievements' },
          { label: lang === 'ru' ? 'Миссии' : 'Missions', value: `${user.missionsCompleted || 0}`, icon: 'fa-bullseye', color: '#ff6d00' },
          { label: 'Gold', value: `${user.gold}`, icon: 'fa-coins', color: '#f9a825' },
        ].map(s => {
          const inner = (
            <>
              <i className={`fa-solid ${s.icon}`} style={{ fontSize: 18, color: s.color, marginBottom: 4, display: 'block' }}></i>
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>{s.label}</div>
            </>
          );
          return s.href
            ? <Link key={s.label} href={s.href} className="card" style={{ textAlign: 'center', padding: '14px 10px', display: 'block', textDecoration: 'none', color: 'inherit' }}>{inner}</Link>
            : <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>{inner}</div>;
        })}
      </div>

      {/* VIP call-to-action — stands out */}
      {!user.vip && (
        <Link href="/vip" style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', marginBottom: 20,
          borderRadius: 16, textDecoration: 'none', color: '#1a1200',
          background: 'linear-gradient(135deg, #ffd740, #f59e0b)',
          boxShadow: '0 6px 24px rgba(245,158,11,0.35), 0 0 0 1px rgba(255,215,64,0.5)',
        }}>
          <i className="fa-solid fa-crown" style={{ fontSize: 24 }}></i>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{lang === 'ru' ? 'Стать VIP' : 'Go VIP'}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{lang === 'ru' ? 'Двойные награды, эксклюзивный транспорт' : 'Double rewards, exclusive vehicles'}</div>
          </div>
          <i className="fa-solid fa-arrow-right" style={{ fontSize: 16 }}></i>
        </Link>
      )}

      {/* Gang + quick nav */}
      <div className="card" style={{ padding: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>Твоя банда</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#32cd32' }}>{user.factionName || user.faction || 'Без банды'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: 0.5 }}>Участников</div>
            <div style={{ fontWeight: 700 }}>{user.factionSize || 1}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: 8 }}>
          {[
            { href: '/garage', icon: 'fa-warehouse', label: t('nav.garage') },
            { href: '/missions', icon: 'fa-list-check', label: lang === 'ru' ? 'Миссии' : 'Missions', color: '#b794f6' },
            { href: '/trips', icon: 'fa-clock-rotate-left', label: t('nav.trips') },
            { href: '/arena', icon: 'fa-crosshairs', label: t('nav.arena') },
            { href: '/leaderboard', icon: 'fa-ranking-star', label: 'Rank' },
            { href: '/news', icon: 'fa-newspaper', label: t('nav.news') },
            { href: '/settings', icon: 'fa-gear', label: t('nav.settings') },
            { href: '/business/add-point', icon: 'fa-map-pin', label: lang === 'ru' ? 'Локация' : 'Add spot', color: '#00e676' },
          ].map(a => (
            <Link key={a.href} href={a.href} className="btn btn-secondary btn-sm" style={{ flexDirection: 'column', padding: '12px 6px', gap: 6, fontSize: 11, borderRadius: 12 }}>
              <i className={`fa-solid ${a.icon}`} style={{ fontSize: 20, color: (a as any).color }}></i>
              <span>{a.label}</span>
            </Link>
          ))}
          {user.role === 'admin' && (
            <Link href="/cyber-admin" className="btn btn-secondary btn-sm" style={{ flexDirection: 'column', padding: '12px 6px', gap: 6, fontSize: 11, borderRadius: 12 }}>
              <i className="fa-solid fa-shield" style={{ fontSize: 20, color: '#ff1744' }}></i>
              <span>Admin</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
