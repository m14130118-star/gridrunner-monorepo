import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useT } from '../src/lib/i18n';
import { getApiUrl } from '../src/lib/api';

interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  level: number;
  xp: number;
  gold: number;
  totalDistance: number;
  totalTrips: number;
  vip: boolean;
  vehicle: string;
}

function xpForLevel(level: number) { return level * 80 + 200; }

export default function Leaderboard() {
  const { t, lang } = useT();
  const router = useRouter();
  const [data, setData] = useState<LeaderboardEntry[] | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const u = localStorage.getItem('gridrunner_user');
      if (u) setCurrentUser(JSON.parse(u).username);
    } catch {}
    const token = localStorage.getItem('gridrunner_token');
    if (!token) { router.push('/auth/login'); return; }
    fetch(getApiUrl() + '/api/v1/player/leaderboard', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.leaderboard); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="page" style={{ paddingBottom: 120 }}>
        <div className="anim-fade" style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', margin: '0 auto 12px' }} />
          <div style={{ width: 200, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.06)', margin: '0 auto 8px' }} />
          <div style={{ width: 140, height: 14, borderRadius: 8, background: 'rgba(255,255,255,0.04)', margin: '0 auto' }} />
        </div>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="card anim-fade" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '40%', height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 6 }} />
              <div style={{ width: '60%', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
            </div>
            <div style={{ width: 80, height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
          </div>
        ))}
      </div>
    );
  }

  const rankColors = ['#ffd740', '#b0bec5', '#cd7f32'];

  return (
    <div className="page" style={{ paddingBottom: 120 }}>
      <div className="anim-fade" style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #ffd740, #ff9100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', fontSize: 24, color: '#000',
        }}>
          <i className="fa-solid fa-trophy"></i>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 2px' }}>{t('nav.leaderboard')}</h1>
        <p style={{ fontSize: 13, opacity: 0.4, margin: 0 }}>
          {lang === 'ru' ? 'Топ-50 игроков' : 'Top 50 players'}
        </p>
      </div>

      <div className="anim-fade-1" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data?.map((entry) => {
          const isMe = entry.username === currentUser;
          const xpNeeded = xpForLevel(entry.level);
          const xpPct = Math.min(100, Math.round((entry.xp / xpNeeded) * 100));
          const rc = entry.rank <= 3 ? rankColors[entry.rank - 1] : 'var(--border)';
          return (
            <div
              key={entry.id || entry.rank}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                border: isMe ? '1px solid var(--green)' : 'none',
                background: isMe ? 'rgba(0,230,118,0.06)' : undefined,
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: rc, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontWeight: 800,
                color: entry.rank <= 3 ? '#000' : 'var(--text)',
                flexShrink: 0,
              }}>
                {entry.rank}
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `linear-gradient(135deg, ${entry.vip ? '#ff9100' : '#00e676'}, ${entry.vip ? '#ff6d00' : '#00c853'})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800, color: '#000', flexShrink: 0,
              }}>
                {entry.username[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.username}
                  </span>
                  {entry.vip && <i className="fa-solid fa-crown" style={{ fontSize: 11, color: '#ff9100' }}></i>}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                    background: 'rgba(0,230,118,0.12)', color: '#00e676', whiteSpace: 'nowrap',
                  }}>
                    LVL {entry.level}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ width: `${xpPct}%`, height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #00e676, #69f0ae)', transition: 'width 0.5s ease' }} />
                  </div>
                  <span style={{ fontSize: 10, opacity: 0.4, whiteSpace: 'nowrap' }}>{entry.xp} XP</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, opacity: 0.5, flexShrink: 0 }}>
                <span className="stat-mobile-hide"><i className="fa-solid fa-coins" style={{ marginRight: 2 }}></i>{entry.gold}</span>
                <span className="stat-mobile-hide"><i className="fa-solid fa-location-dot" style={{ marginRight: 2 }}></i>{entry.totalTrips}</span>
                <span><i className="fa-solid fa-road" style={{ marginRight: 2 }}></i>{entry.totalDistance.toFixed(1)}</span>
              </div>
            </div>
          );
        })}
        {(!data || data.length === 0) && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <i className="fa-solid fa-trophy" style={{ fontSize: 32, opacity: 0.1, marginBottom: 8, display: 'block' }}></i>
            <p style={{ opacity: 0.3 }}>{lang === 'ru' ? 'Пока нет данных' : 'No data yet'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
