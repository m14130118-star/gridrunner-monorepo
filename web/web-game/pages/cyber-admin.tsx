import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getApiUrl } from '../src/lib/api';
import { BackButton } from '../src/components/BackButton';

export default function CyberAdmin() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [factions, setFactions] = useState<any[]>([]);
  const [pendingPois, setPendingPois] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const hdrs = () => ({ headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } });

  // Восстанавливаем сессию админа, чтобы не вводить пароль заново
  useEffect(() => {
    const saved = localStorage.getItem('gridrunner_admin_token');
    if (saved) { setToken(saved); setLoggedIn(true); }
  }, []);

  const login = async () => {
    setLoginError('');
    try {
      const r = await fetch(getApiUrl() + '/api/v1/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
      });
      const d = await r.json();
      if (d.success) {
        setToken(d.token);
        localStorage.setItem('gridrunner_admin_token', d.token);
        setLoggedIn(true);
      } else {
        setLoginError(d.message);
      }
    } catch {
      setLoginError('Network error');
    }
  };

  const searchUsers = async () => {
    if (!searchQuery) return;
    const r = await fetch(getApiUrl() + '/api/v1/admin/users?q=' + encodeURIComponent(searchQuery), hdrs());
    const d = await r.json();
    if (d.success) setUsers(d.users);
  };

  const loadFactions = async () => {
    const r = await fetch(getApiUrl() + '/api/v1/admin/factions', hdrs());
    const d = await r.json();
    if (d.success) setFactions(d.factions);
  };

  const loadPendingPois = async () => {
    const r = await fetch(getApiUrl() + '/api/v1/geo/poi/pending', hdrs());
    const d = await r.json();
    if (d.success) setPendingPois(d.pois || []);
  };

  const moderatePoi = async (id: string, action: 'approve' | 'reject') => {
    await fetch(getApiUrl() + '/api/v1/geo/poi/' + id + '/moderate', {
      method: 'POST', ...hdrs(), body: JSON.stringify({ action }),
    });
    loadPendingPois();
    setMsg(action === 'approve' ? 'Точка одобрена (+30 XP автору)' : 'Точка отклонена');
    setTimeout(() => setMsg(''), 2000);
  };

  const loadNews = async () => {
    const r = await fetch(getApiUrl() + '/api/v1/admin/news', hdrs());
    const d = await r.json();
    if (d.success) setNews(d.news || []);
    else if (r.status === 401) { setLoggedIn(false); setToken(null); localStorage.removeItem('gridrunner_admin_token'); }
  };

  const publishNews = async () => {
    if (!newsTitle.trim() || !newsContent.trim()) return;
    await fetch(getApiUrl() + '/api/v1/admin/news', {
      method: 'POST', ...hdrs(), body: JSON.stringify({ title: newsTitle.trim(), content: newsContent.trim() }),
    });
    setNewsTitle(''); setNewsContent('');
    loadNews();
    setMsg('Новость опубликована'); setTimeout(() => setMsg(''), 2000);
  };

  const deleteNews = async (id: string) => {
    if (!confirm('Удалить новость?')) return;
    await fetch(getApiUrl() + '/api/v1/admin/news/' + id, { method: 'DELETE', ...hdrs() });
    loadNews();
  };

  useEffect(() => { if (loggedIn && token) { loadFactions(); loadPendingPois(); loadNews(); } }, [loggedIn, token]);

  const banUser = async (userId: string) => {
    await fetch(getApiUrl() + '/api/v1/admin/ban', { method: 'POST', ...hdrs(), body: JSON.stringify({ userId }) });
    searchUsers();
    setMsg('User banned');
    setTimeout(() => setMsg(''), 2000);
  };

  const unbanUser = async (userId: string) => {
    await fetch(getApiUrl() + '/api/v1/admin/unban', { method: 'POST', ...hdrs(), body: JSON.stringify({ userId }) });
    searchUsers();
    setMsg('User unbanned');
    setTimeout(() => setMsg(''), 2000);
  };

  const setVip = async (userId: string, isVip: boolean) => {
    await fetch(getApiUrl() + '/api/v1/admin/vip', {
      method: 'POST', ...hdrs(), body: JSON.stringify({ userId, isVip, days: isVip ? 30 : undefined }),
    });
    searchUsers();
    setMsg(isVip ? 'VIP granted' : 'VIP revoked');
    setTimeout(() => setMsg(''), 2000);
  };

  const resetFaction = async (factionId: string) => {
    if (!confirm('Reset all zones for this faction?')) return;
    await fetch(getApiUrl() + '/api/v1/admin/factions/' + factionId + '/reset', { method: 'POST', ...hdrs() });
    loadFactions();
    setMsg('Faction zones reset');
    setTimeout(() => setMsg(''), 2000);
  };

  if (!loggedIn) {
    return (
      <div className="page" style={{ padding: '100px 20px', textAlign: 'center' }}>
        <BackButton />
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, marginBottom: 20, fontFamily: 'monospace' }}>CYBER ADMIN</h2>
        <div style={{ maxWidth: 300, margin: '0 auto' }}>
          <input type="password" placeholder="Admin password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', marginBottom: 12, fontFamily: 'monospace' }} />
          <button onClick={login}
            style={{ width: '100%', padding: '12px 0', background: 'rgba(255,0,85,0.15)', border: '1px solid #ff0055', borderRadius: 8, cursor: 'pointer', color: '#ff0055', fontWeight: 700, fontFamily: 'monospace', fontSize: 14, letterSpacing: 2 }}>
            ВОЙТИ
          </button>
          {loginError && <p style={{ color: '#ff5050', fontSize: 12, marginTop: 12 }}>{loginError}</p>}
        </div>
      </div>
    );
  }

  const styles = {
    input: { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e0f0e0', fontSize: 13, fontFamily: 'monospace', outline: 'none' },
    btn: { padding: '6px 12px', borderRadius: 6, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'monospace' },
    card: { background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 },
  };

  return (
    <div className="page" style={{ padding: '80px 16px 40px', fontFamily: 'monospace' }}>
      <BackButton />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, color: '#ff0055', margin: 0 }}>CYBER ADMIN PANEL</h2>
        <button onClick={() => { localStorage.removeItem('gridrunner_admin_token'); setToken(null); setLoggedIn(false); }}
          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#888', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}>ВЫХОД</button>
      </div>

      {msg && <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(0,255,200,0.15)', border: '1px solid #00ffcc', borderRadius: 8, padding: '8px 16px', fontSize: 12 }}>{msg}</div>}

      {/* User management */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 10, color: '#00ffcc' }}>УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input placeholder="Поиск по нику или ID" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchUsers()} style={styles.input as React.CSSProperties} />
          <button onClick={searchUsers} style={{ ...styles.btn as React.CSSProperties, background: 'rgba(0,255,200,0.1)', borderColor: '#00ffcc44', color: '#00ffcc', whiteSpace: 'nowrap' }}>Поиск</button>
        </div>
        {users.map(u => (
          <div key={u.id} style={styles.card as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{u.username}</span>
                <span style={{ fontSize: 10, opacity: 0.4, marginLeft: 8 }}>ID: {u.id}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {u.isVip
                  ? <button onClick={() => setVip(u.id, false)} style={{ ...styles.btn as React.CSSProperties, background: 'rgba(255,100,0,0.1)', borderColor: '#ff640044', color: '#ff6400' }}>Снять VIP</button>
                  : <button onClick={() => setVip(u.id, true)} style={{ ...styles.btn as React.CSSProperties, background: 'rgba(255,215,0,0.1)', borderColor: '#ffd74044', color: '#ffd740' }}>VIP</button>
                }
                {u.isBanned
                  ? <button onClick={() => unbanUser(u.id)} style={{ ...styles.btn as React.CSSProperties, background: 'rgba(0,255,100,0.1)', borderColor: '#00ff6444', color: '#00ff64' }}>UNBAN</button>
                  : <button onClick={() => banUser(u.id)} style={{ ...styles.btn as React.CSSProperties, background: 'rgba(255,0,0,0.1)', borderColor: '#ff000044', color: '#ff5050' }}>BAN</button>
                }
              </div>
            </div>
            <div style={{ fontSize: 10, opacity: 0.4, display: 'flex', gap: 12 }}>
              <span>HP {u.hp}</span>
              <span>GC {u.gridCoins}</span>
              <span>XP {u.xp}</span>
              <span>{u.factionName || '—'}</span>
              <span style={{ color: u.isVip ? '#ffd740' : undefined }}>{u.isVip ? 'VIP' : ''}</span>
              <span style={{ color: u.isBanned ? '#ff5050' : undefined }}>{u.isBanned ? 'BANNED' : ''}</span>
            </div>
          </div>
        ))}
      </div>

      {/* POI moderation */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 10, color: '#ffd740' }}>МОДЕРАЦИЯ ТОЧЕК ({pendingPois.length})</div>
        <button onClick={loadPendingPois} style={{ ...styles.btn as React.CSSProperties, background: 'rgba(255,215,64,0.1)', borderColor: '#ffd74044', color: '#ffd740', marginBottom: 12 }}>Обновить</button>
        {pendingPois.length === 0 && <div style={{ fontSize: 11, opacity: 0.35 }}>Нет точек на модерации</div>}
        {pendingPois.map(p => (
          <div key={p.id} style={styles.card as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>
                  {Number(p.lat).toFixed(5)}, {Number(p.lng).toFixed(5)}
                  {p.comment ? ` · ${p.comment}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => moderatePoi(p.id, 'approve')} style={{ ...styles.btn as React.CSSProperties, background: 'rgba(0,255,100,0.1)', borderColor: '#00ff6444', color: '#00ff64' }}>OK</button>
                <button onClick={() => moderatePoi(p.id, 'reject')} style={{ ...styles.btn as React.CSSProperties, background: 'rgba(255,0,0,0.1)', borderColor: '#ff000044', color: '#ff5050' }}>Отклонить</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* News management */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 10, color: '#00e676' }}>НОВОСТИ ({news.length})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <input placeholder="Заголовок" value={newsTitle} onChange={e => setNewsTitle(e.target.value)} style={styles.input as React.CSSProperties} />
          <textarea placeholder="Текст новости..." value={newsContent} onChange={e => setNewsContent(e.target.value)} rows={4} style={{ ...styles.input as React.CSSProperties, resize: 'vertical', fontFamily: 'monospace' }} />
          <button onClick={publishNews} style={{ ...styles.btn as React.CSSProperties, background: 'rgba(0,230,118,0.12)', borderColor: '#00e676', color: '#00e676', padding: '10px 0' }}>ОПУБЛИКОВАТЬ</button>
        </div>
        {news.map(n => (
          <div key={n.id} style={styles.card as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{n.title}</div>
                <div style={{ fontSize: 10, opacity: 0.35, marginTop: 2 }}>{new Date(n.date).toLocaleString()}</div>
              </div>
              <button onClick={() => deleteNews(n.id)} style={{ ...styles.btn as React.CSSProperties, background: 'rgba(255,0,0,0.1)', borderColor: '#ff000044', color: '#ff5050' }}>Удалить</button>
            </div>
          </div>
        ))}
      </div>

      {/* Faction monitoring */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 10, color: '#ff0055' }}>МОНИТОРИНГ ФРАКЦИЙ</div>
        <button onClick={loadFactions} style={{ ...styles.btn as React.CSSProperties, background: 'rgba(255,0,85,0.1)', borderColor: '#ff005544', color: '#ff0055', marginBottom: 12 }}>Обновить</button>
        {factions.map(f => (
          <div key={f.id} style={styles.card as React.CSSProperties}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: f.color || '#555' }}></div>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{f.name}</span>
              <span style={{ fontSize: 10, opacity: 0.4 }}>Лидер: {f.leaderName}</span>
            </div>
            <div style={{ fontSize: 10, opacity: 0.4, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span>Участники: {f.members}</span>
              <span>Зоны: {f.controlledZones}</span>
              <span>GC {f.treasury}</span>
              <button onClick={() => resetFaction(f.id)}
                style={{ ...styles.btn as React.CSSProperties, background: 'rgba(255,0,0,0.1)', borderColor: '#ff000044', color: '#ff5050', fontSize: 10, padding: '3px 8px', marginLeft: 'auto' }}>
                Сбросить зоны
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
