import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const API = '';

export default function CyberAdmin() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [factions, setFactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [msg, setMsg] = useState('');

  const api = (path: string) => `https://gridrunner-api.vercel.app/api/v1/admin${path}`;

  const hdrs = (extra?: any) => ({ headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...extra } });

  const login = async () => {
    setLoginError('');
    try {
      const r = await fetch(api('/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const d = await r.json();
      if (d.success) { setToken(d.token); setLoggedIn(true); }
      else setLoginError(d.message);
    } catch { setLoginError('Network error'); }
  };

  const searchUsers = async () => {
    if (!searchQuery) return;
    const r = await fetch(api('/users?q=' + encodeURIComponent(searchQuery)), hdrs());
    const d = await r.json();
    if (d.success) setUsers(d.users);
  };

  const loadFactions = async () => {
    const r = await fetch(api('/factions'), hdrs());
    const d = await r.json();
    if (d.success) setFactions(d.factions);
  };

  useEffect(() => { if (loggedIn) loadFactions(); }, [loggedIn]);

  const banUser = async (userId: string) => {
    await fetch(api('/ban'), { method: 'POST', ...hdrs(), body: JSON.stringify({ userId }) });
    searchUsers(); setMsg('User banned'); setTimeout(() => setMsg(''), 2000);
  };
  const unbanUser = async (userId: string) => {
    await fetch(api('/unban'), { method: 'POST', ...hdrs(), body: JSON.stringify({ userId }) });
    searchUsers(); setMsg('User unbanned'); setTimeout(() => setMsg(''), 2000);
  };
  const setVip = async (userId: string, isVip: boolean) => {
    await fetch(api('/vip'), { method: 'POST', ...hdrs(), body: JSON.stringify({ userId, isVip, days: isVip ? 30 : undefined }) });
    searchUsers(); setMsg(isVip ? 'VIP granted' : 'VIP revoked'); setTimeout(() => setMsg(''), 2000);
  };
  const resetFaction = async (factionId: string) => {
    if (!confirm('Reset all zones for this faction?')) return;
    await fetch(api('/factions/' + factionId + '/reset'), { method: 'POST', ...hdrs() });
    loadFactions(); setMsg('Faction zones reset'); setTimeout(() => setMsg(''), 2000);
  };

  if (!loggedIn) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#e0e0e0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', padding: 20 }}>
        <Head><title>Cyber Admin — GridRunner</title></Head>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, marginBottom: 20, color: '#ff0055' }}>CYBER ADMIN</h2>
        <div style={{ maxWidth: 300, width: '100%' }}>
          <input type="password" placeholder="Admin password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', padding: '12px 14px', marginBottom: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e0e0e0', fontSize: 14, fontFamily: 'monospace', outline: 'none' }} />
          <button onClick={login} style={{ width: '100%', padding: '12px 0', background: 'rgba(255,0,85,0.15)', border: '1px solid #ff0055', borderRadius: 8, cursor: 'pointer', color: '#ff0055', fontWeight: 700, fontFamily: 'monospace', fontSize: 14, letterSpacing: 2 }}>
            ВОЙТИ
          </button>
          {loginError && <p style={{ color: '#ff5050', fontSize: 12, marginTop: 12, textAlign: 'center' }}>{loginError}</p>}
        </div>
      </div>
    );
  }

  const s = {
    input: { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e0f0e0', fontSize: 13, fontFamily: 'monospace', outline: 'none' },
    btn: { padding: '6px 12px', borderRadius: 6, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'monospace' },
    card: { background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 },
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#e0f0e0', fontFamily: 'monospace', padding: '80px 16px 40px' }}>
      <Head><title>Cyber Admin — GridRunner</title></Head>
      <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, marginBottom: 20, color: '#ff0055' }}>CYBER ADMIN PANEL</h2>
      {msg && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(0,255,200,0.15)', border: '1px solid #00ffcc', borderRadius: 8, padding: '8px 16px', fontSize: 12 }}>{msg}</div>}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 10, color: '#00ffcc' }}>УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input placeholder="Поиск по нику или ID" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchUsers()} style={s.input as React.CSSProperties} />
          <button onClick={searchUsers} style={{ ...s.btn as React.CSSProperties, background: 'rgba(0,255,200,0.1)', borderColor: '#00ffcc44', color: '#00ffcc', whiteSpace: 'nowrap' }}>Поиск</button>
        </div>
        {users.map(u => (
          <div key={u.id} style={s.card as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div><span style={{ fontWeight: 700, fontSize: 13 }}>{u.username}</span><span style={{ fontSize: 10, opacity: 0.4, marginLeft: 8 }}>ID: {u.id}</span></div>
              <div style={{ display: 'flex', gap: 4 }}>
                {u.isVip
                  ? <button onClick={() => setVip(u.id, false)} style={{ ...s.btn as React.CSSProperties, background: 'rgba(255,100,0,0.1)', borderColor: '#ff640044', color: '#ff6400' }}>Снять VIP</button>
                  : <button onClick={() => setVip(u.id, true)} style={{ ...s.btn as React.CSSProperties, background: 'rgba(255,215,0,0.1)', borderColor: '#ffd74044', color: '#ffd740' }}>VIP</button>}
                {u.isBanned
                  ? <button onClick={() => unbanUser(u.id)} style={{ ...s.btn as React.CSSProperties, background: 'rgba(0,255,100,0.1)', borderColor: '#00ff6444', color: '#00ff64' }}>UNBAN</button>
                  : <button onClick={() => banUser(u.id)} style={{ ...s.btn as React.CSSProperties, background: 'rgba(255,0,0,0.1)', borderColor: '#ff000044', color: '#ff5050' }}>BAN</button>}
              </div>
            </div>
            <div style={{ fontSize: 10, opacity: 0.4, display: 'flex', gap: 12 }}>
              <span>HP {u.hp}</span><span>GC {u.gridCoins}</span><span>XP {u.xp}</span><span>{u.factionName || '—'}</span>
              <span style={{ color: u.isVip ? '#ffd740' : undefined }}>{u.isVip ? 'VIP' : ''}</span>
              <span style={{ color: u.isBanned ? '#ff5050' : undefined }}>{u.isBanned ? 'BANNED' : ''}</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 10, color: '#ff0055' }}>МОНИТОРИНГ ФРАКЦИЙ</div>
        <button onClick={loadFactions} style={{ ...s.btn as React.CSSProperties, background: 'rgba(255,0,85,0.1)', borderColor: '#ff005544', color: '#ff0055', marginBottom: 12 }}>Обновить</button>
        {factions.map(f => (
          <div key={f.id} style={s.card as React.CSSProperties}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: f.color || '#555' }}></div>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{f.name}</span>
              <span style={{ fontSize: 10, opacity: 0.4 }}>Лидер: {f.leaderName}</span>
            </div>
            <div style={{ fontSize: 10, opacity: 0.4, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span>{f.members} уч.</span><span>{f.controlledZones} зон</span><span>GC {f.treasury}</span>
              <button onClick={() => resetFaction(f.id)} style={{ ...s.btn as React.CSSProperties, background: 'rgba(255,0,0,0.1)', borderColor: '#ff000044', color: '#ff5050', fontSize: 10, padding: '3px 8px', marginLeft: 'auto' }}>Сбросить зоны</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
