import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { BackButton } from '../../src/components/BackButton';
import { getApiUrl } from '../../src/lib/api';
import WireGame from '../../src/components/WireGame';

const ArenaMap = lazy(() => import('../../src/components/ArenaMap'));

// Арена очищена: на карте только три функции из обучения — зоны, Режим
// Ниндзя и Сканер. Магазин (щит/аптечка/мина) живёт во вкладке «Штаб».
const SHOP_ITEMS = [
  { id: 'shield', icon: 'fa-shield-halved', label: 'Щит', color: '#4488ff', price: 50, desc: 'Блокирует 1 мину' },
  { id: 'medpack', icon: 'fa-kit-medical', label: 'Аптечка', color: '#ff4444', price: 30, desc: '+30 HP' },
  { id: 'trap', icon: 'fa-bomb', label: 'Мина', color: '#ff6600', price: 40, desc: '-25 HP врагу, ставится на своей зоне' },
];

const FACTION_ROLES = [{ id: 'owner', label: 'Главарь' }, { id: 'officer', label: 'Офицер' }, { id: 'rookie', label: 'Новичок' }];

export default function ArenaActive() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<'map' | 'terminal'>('map');

  const [user, setUser] = useState<any>(null);
  const [factions, setFactions] = useState<any[]>([]);
  const [myFaction, setMyFaction] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 55.75, lng: 37.62 });
  const [hp, setHp] = useState(100);
  const [gold, setGold] = useState(0);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [stepResult, setStepResult] = useState<any>(null);
  const [fetchErr, setFetchErr] = useState('');
  const [factionName, setFactionName] = useState('');
  const [factionColor, setFactionColor] = useState('#32cd32');
  const [scannerTraps, setScannerTraps] = useState<Array<{ zoneId?: string; lat: number; lng: number }>>([]);
  const [inFaction, setInFaction] = useState(false);
  const [trapTarget, setTrapTarget] = useState<{ zone: any; latlng: { lat: number; lng: number } } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [client, setClient] = useState(false);
  const [ninja, setNinja] = useState(false);
  const [dead, setDead] = useState(false);
  const [influence, setInfluence] = useState<{ value: number; target: number } | null>(null);
  const [defuseTrap, setDefuseTrap] = useState<{ zoneId?: string; lat: number; lng: number } | null>(null);
  const ninjaRef = useRef(false);
  ninjaRef.current = ninja;

  useEffect(() => { setClient(true); }, []);

  const watchId = useRef<number | null>(null);
  const userRef = useRef<any>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('gridrunner_token');
    if (!t) { setFetchErr('Not logged in'); return; }
    setToken(t);
    tokenRef.current = t;
  }, []);

  const authHdrs = () => ({ headers: { Authorization: 'Bearer ' + tokenRef.current } });
  const jsonHdrs = () => ({ headers: { Authorization: 'Bearer ' + tokenRef.current, 'Content-Type': 'application/json' } });

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(getApiUrl() + '/api/v1/player/profile', authHdrs()).then(r => r.json()),
      fetch(getApiUrl() + '/api/v1/factions/', authHdrs()).then(r => r.json()),
      fetch(getApiUrl() + '/api/v1/arena/get-inventory', authHdrs()).then(r => r.json()),
    ]).then(([profile, factionsData, invData]) => {
      if (!profile.success) {
        // Fallback to localStorage cache (in-memory DB may have reset)
        const cached = localStorage.getItem('gridrunner_user');
        if (cached) {
          try {
            const p = JSON.parse(cached);
            if (p && typeof p.level === 'number') {
              setUser(p); userRef.current = p; setHp(p.hp ?? 100); setGold(p.gridCoins ?? 0);
              setInFaction(!!(p.factionName && p.factionName !== 'Без банды'));
              setFactions(factionsData.factions || []);
              setInventory(invData.inventory?.items || { shield: 2, medpack: 4, scanner: 1, vibe_booster: 1 });
              return;
            }
          } catch {}
        }
        setFetchErr('Profile load failed: ' + (profile.message || 'unknown')); return;
      }
      setUser(profile.profile);
      userRef.current = profile.profile;
      setHp(profile.profile.hp ?? 100);
      setGold(profile.profile.gridCoins ?? 0);
      setInFaction(!!(profile.profile.factionName && profile.profile.factionName !== 'Без банды'));
      setFactions(factionsData.factions || []);
      setInventory(invData.inventory?.items || { shield: 2, medpack: 4, scanner: 1, vibe_booster: 1 });
    }).catch(() => setFetchErr('Server unreachable'));
  }, [token]);

  // Fetch faction details — fallback to cache if DB reset
  useEffect(() => {
    if (!token || !inFaction) return;
    fetch(getApiUrl() + '/api/v1/factions/my', authHdrs()).then(r => r.json()).then(d => {
      if (d.success) setMyFaction(d.faction);
      else {
        const cached = localStorage.getItem('gridrunner_user');
        if (cached) {
          try {
            const p = JSON.parse(cached);
            if (p.factionName) setMyFaction({ name: p.factionName, color: p.factionColor || '#555', members: [{ id: p.id || '?', username: p.username, role: p.factionRole || 'rookie', hp: p.hp }] });
          } catch {}
        }
      }
    }).catch(() => {});
  }, [token, inFaction]);

  const doStep = useCallback(async (lat: number, lng: number) => {
    const u = userRef.current;
    if (!tokenRef.current || !u?.factionId) return;
    try {
      const r = await fetch(getApiUrl() + '/api/v1/arena/step', {
        method: 'POST', ...jsonHdrs(), body: JSON.stringify({ lat, lng, ninja: ninjaRef.current }),
      });
      const d = await r.json();
      if (d.success) {
        if (typeof d.hp === 'number') setHp(d.hp);
        if (typeof d.gridCoins === 'number') setGold(d.gridCoins);
        if (d.dead) { setDead(true); return; }
        if (typeof d.influence === 'number') setInfluence({ value: d.influence, target: d.influenceTarget || 100 });
        else setInfluence(null);
        if (d.trapHit) { setStepResult({ trapHit: d.trapHit }); setTimeout(() => setStepResult(null), 3000); }
        if (d.deathPenalty) { setStepResult({ ...d.deathPenalty, death: true }); setDead(true); }
        if (d.captured) { setStepResult({ captured: true, zoneId: d.zoneId, elo: d.elo }); setTimeout(() => setStepResult(null), 3000); }
        if (d.completedMissions?.length) { setStepResult({ mission: d.completedMissions[0] }); setTimeout(() => setStepResult(null), 4000); }
      }
    } catch {}
  }, []);

  // Тактический Сканер (только в Режиме Ниндзя): мины врага в радиусе 150 м
  const runScanner = useCallback(async () => {
    if (!tokenRef.current || !ninjaRef.current) return;
    try {
      const r = await fetch(getApiUrl() + '/api/v1/arena/scan', {
        method: 'POST', ...jsonHdrs(),
        body: JSON.stringify({ lat: coords.lat, lng: coords.lng }),
      });
      const d = await r.json();
      if (d.success) {
        setScannerTraps(d.traps || []);
        setStepResult({ scanned: (d.traps || []).length });
        setTimeout(() => setStepResult(null), 3000);
      }
    } catch {}
  }, [coords]);

  // Сближение с найденной миной: ближе 5 м открывается мини-игра с проводами
  useEffect(() => {
    if (!scannerTraps.length || defuseTrap || dead) return;
    const R = 6371000;
    for (const t of scannerTraps) {
      const dLat = (t.lat - coords.lat) * Math.PI / 180;
      const dLon = (t.lng - coords.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(coords.lat * Math.PI / 180) * Math.cos(t.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist < 5) { setDefuseTrap(t); break; }
    }
  }, [coords, scannerTraps, defuseTrap, dead]);

  const finishDefuse = async () => {
    const t = defuseTrap;
    setDefuseTrap(null);
    if (!t || !tokenRef.current) return;
    try {
      const r = await fetch(getApiUrl() + '/api/v1/arena/defuse', {
        method: 'POST', ...jsonHdrs(),
        body: JSON.stringify({ zoneId: t.zoneId, lat: coords.lat, lng: coords.lng }),
      });
      const d = await r.json();
      if (d.success) {
        setScannerTraps(prev => prev.filter(x => x !== t && x.zoneId !== t.zoneId));
        setStepResult({ defused: true, xp: d.xpAwarded });
      } else {
        setStepResult({ roleError: d.message });
      }
      setTimeout(() => setStepResult(null), 4000);
    } catch {}
  };

  const fetchZones = useCallback(async (lat: number, lng: number) => {
    if (!tokenRef.current) return;
    try {
      const r = await fetch(`${getApiUrl()}/api/v1/arena/zones?lat=${lat}&lng=${lng}`, authHdrs());
      const d = await r.json();
      if (d.success) setZones(d.zones || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!token || !navigator.geolocation) return;
    let running = true;
    const success = (pos: GeolocationPosition) => {
      if (!running) return;
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(c);
      doStep(c.lat, c.lng);
      fetchZones(c.lat, c.lng);
    };
    navigator.geolocation.getCurrentPosition(success);
    watchId.current = navigator.geolocation.watchPosition(success,
      err => console.warn('GPS err:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    // Standing still doesn't fire watchPosition — poll zones anyway so
    // captures by other players show up without moving
    const zonesPoll = setInterval(() => {
      setCoords(c => {
        if (c.lat && c.lng) fetchZones(c.lat, c.lng);
        return c;
      });
    }, 20000);
    return () => { running = false; clearInterval(zonesPoll); if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, [token]);

  const createFaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenRef.current) return;
    // Координаты создателя → стартовый квадрат-штаб банды прямо под ним
    const getPos = () => new Promise<{ lat: number; lng: number } | null>(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null), { enableHighAccuracy: true, timeout: 6000 }
      );
    });
    const pos = await getPos();
    const r = await fetch(getApiUrl() + '/api/v1/factions/create', {
      method: 'POST', ...jsonHdrs(), body: JSON.stringify({ name: factionName, color: factionColor, lat: pos?.lat, lng: pos?.lng }),
    });
    const d = await r.json();
    if (d.success) {
      const u = { ...(userRef.current || {}), factionName, factionId: d.faction._id, factionRole: 'owner' };
      userRef.current = u; setUser(u); setInFaction(true);
      setFactions(prev => [...prev, d.faction]);
      fetch(getApiUrl() + '/api/v1/factions/my', authHdrs()).then(r => r.json()).then(d2 => { if (d2.success) setMyFaction(d2.faction); });
    }
  };

  const joinFaction = async (factionId: string) => {
    if (!tokenRef.current) return;
    const r = await fetch(getApiUrl() + `/api/v1/factions/join/${factionId}`, { method: 'POST', ...jsonHdrs() });
    const d = await r.json();
    if (d.success) {
      const u = { ...(userRef.current || {}), factionName: d.faction.name, factionId, factionRole: 'rookie' };
      userRef.current = u; setUser(u); setInFaction(true);
      fetch(getApiUrl() + '/api/v1/factions/my', authHdrs()).then(r => r.json()).then(d2 => { if (d2.success) setMyFaction(d2.faction); });
    }
  };

  const leaveFaction = async () => {
    if (!tokenRef.current) return;
    const r = await fetch(getApiUrl() + '/api/v1/factions/leave', { method: 'POST', ...jsonHdrs() });
    const d = await r.json();
    if (d.success) {
      const u = { ...(userRef.current || {}), factionName: null, factionId: null, factionRole: null };
      userRef.current = u; setUser(u); setInFaction(false);
      setMyFaction(null);
    }
  };

  const buyItem = async (itemType: string) => {
    if (!tokenRef.current) return;
    const r = await fetch(getApiUrl() + '/api/v1/arena/shop/buy', {
      method: 'POST', ...jsonHdrs(), body: JSON.stringify({ itemType }),
    });
    const d = await r.json();
    if (d.success) {
      setGold(d.gridCoins);
      setInventory(d.inventory);
      setStepResult({ bought: itemType }); setTimeout(() => setStepResult(null), 2000);
    } else {
      setStepResult({ buyError: d.message }); setTimeout(() => setStepResult(null), 3000);
    }
  };

  // Применить расходник (аптечка лечит +30 HP; щит пассивный — сработает сам)
  const useItem = async (itemType: string) => {
    if (!tokenRef.current) return;
    if ((inventory[itemType] || 0) <= 0) {
      setStepResult({ roleError: 'Нет предмета — купи в снабжении' }); setTimeout(() => setStepResult(null), 3000);
      return;
    }
    const r = await fetch(getApiUrl() + '/api/v1/arena/use-item', {
      method: 'POST', ...jsonHdrs(), body: JSON.stringify({ itemType }),
    });
    const d = await r.json();
    if (d.success) {
      if (typeof d.hp === 'number') setHp(d.hp);
      setInventory(prev => ({ ...prev, [itemType]: (d.remaining ?? ((prev[itemType] || 1) - 1)) }));
      setStepResult({ itemUsed: itemType, hp: d.hp }); setTimeout(() => setStepResult(null), 2500);
    } else {
      setStepResult({ roleError: d.message }); setTimeout(() => setStepResult(null), 3000);
    }
  };

  const changeRole = async (targetUserId: string, newRole: string) => {
    if (!tokenRef.current) return;
    const r = await fetch(getApiUrl() + '/api/v1/factions/role', {
      method: 'POST', ...jsonHdrs(), body: JSON.stringify({ targetUserId, newRole }),
    });
    const d = await r.json();
    if (d.success) {
      // Refresh faction data
      fetch(getApiUrl() + '/api/v1/factions/my', authHdrs()).then(r => r.json()).then(d2 => { if (d2.success) setMyFaction(d2.faction); });
      setStepResult({ roleChanged: true }); setTimeout(() => setStepResult(null), 2000);
    } else {
      setStepResult({ roleError: d.message }); setTimeout(() => setStepResult(null), 3000);
    }
  };

  const handleZoneClick = useCallback((zone: any, latlng: { lat: number; lng: number }) => {
    const props = zone.properties || {};
    const myFactionId = userRef.current?.factionId;
    if (!myFactionId) return;
    if (props.controllingFaction !== myFactionId) {
      setStepResult({ roleError: 'Доступ запрещен. Это не твоя территория' });
      setTimeout(() => setStepResult(null), 3000);
      return;
    }
    if (props.hasTrap) {
      setStepResult({ roleError: 'Здесь уже есть мина' });
      setTimeout(() => setStepResult(null), 3000);
      return;
    }
    if ((inventory.trap || 0) <= 0) {
      setStepResult({ roleError: 'Нет мин в инвентаре' });
      setTimeout(() => setStepResult(null), 3000);
      return;
    }
    setTrapTarget({ zone, latlng });
  }, [inventory.trap]);

  // Кнопка «МИНА»: ставит мину в квадрат, где игрок стоит сейчас
  const placeMineHere = async () => {
    if (!tokenRef.current || placing) return;
    if ((inventory.trap || 0) <= 0) {
      setStepResult({ roleError: 'Нет мин — купи в Штабе' }); setTimeout(() => setStepResult(null), 3000);
      return;
    }
    setPlacing(true);
    try {
      const r = await fetch(getApiUrl() + '/api/v1/arena/place-trap', {
        method: 'POST', ...jsonHdrs(),
        body: JSON.stringify({ lat: coords.lat, lng: coords.lng }),
      });
      const d = await r.json();
      if (d.success) {
        setInventory(prev => ({ ...prev, trap: d.trapsLeft }));
        setStepResult({ placed: true }); setTimeout(() => setStepResult(null), 2000);
        fetchZones(coords.lat, coords.lng);
      } else {
        setStepResult({ roleError: d.message }); setTimeout(() => setStepResult(null), 3000);
      }
    } catch {
      setStepResult({ roleError: 'Network error' }); setTimeout(() => setStepResult(null), 3000);
    }
    setPlacing(false);
  };

  const placeTrap = async () => {
    if (!trapTarget || !tokenRef.current) return;
    setPlacing(true);
    try {
      const r = await fetch(getApiUrl() + '/api/v1/arena/place-trap', {
        method: 'POST', ...jsonHdrs(),
        body: JSON.stringify({ lat: trapTarget.latlng.lat, lng: trapTarget.latlng.lng }),
      });
      const d = await r.json();
      if (d.success) {
        setInventory(prev => ({ ...prev, trap: d.trapsLeft }));
        setStepResult({ placed: true }); setTimeout(() => setStepResult(null), 2000);
        // Refresh zones to show trap marker
        if (coords) fetchZones(coords.lat, coords.lng);
      } else {
        setStepResult({ roleError: d.message }); setTimeout(() => setStepResult(null), 3000);
      }
    } catch {
      setStepResult({ roleError: 'Network error' }); setTimeout(() => setStepResult(null), 3000);
    }
    setPlacing(false);
    setTrapTarget(null);
  };

  const kickMember = async (targetUserId: string) => {
    if (!tokenRef.current) return;
    const r = await fetch(getApiUrl() + '/api/v1/factions/kick', {
      method: 'POST', ...jsonHdrs(), body: JSON.stringify({ targetUserId }),
    });
    const d = await r.json();
    if (d.success) {
      fetch(getApiUrl() + '/api/v1/factions/my', authHdrs()).then(r => r.json()).then(d2 => { if (d2.success) setMyFaction(d2.faction); });
    } else {
      setStepResult({ roleError: d.message }); setTimeout(() => setStepResult(null), 3000);
    }
  };

  const setHq = async () => {
    if (!tokenRef.current || !zones.length) return;
    // Find the zone the user is currently in
    const zone = zones.find((z: any) => {
      if (!z.geometry?.coordinates?.[0]) return false;
      const poly = z.geometry.coordinates[0];
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1];
        const xj = poly[j][0], yj = poly[j][1];
        if ((yi > coords.lng) !== (yj > coords.lng) && coords.lat < ((xj - xi) * (coords.lng - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside && z.properties.controllingFaction === userRef.current?.factionId;
    });
    if (!zone) { setStepResult({ roleError: 'Ты должен находиться в зоне своей банды' }); setTimeout(() => setStepResult(null), 3000); return; }
    const r = await fetch(getApiUrl() + '/api/v1/factions/set-hq', {
      method: 'POST', ...jsonHdrs(), body: JSON.stringify({ zoneId: zone.properties.id }),
    });
    const d = await r.json();
    if (d.success) {
      fetch(getApiUrl() + '/api/v1/factions/my', authHdrs()).then(r => r.json()).then(d2 => { if (d2.success) setMyFaction(d2.faction); });
      setStepResult({ roleChanged: true, hqSet: true }); setTimeout(() => setStepResult(null), 2000);
    }
  };

  const userRole = user?.factionRole || 'rookie';
  const canManageRoles = userRole === 'owner' || userRole === 'officer';

  if (fetchErr) return <div className="page" style={{ padding: 24, textAlign: 'center', paddingTop: 100 }}><BackButton /><p style={{ color: '#ff5252' }}>{fetchErr}</p></div>;
  if (!user) return <div className="page" style={{ padding: 24, textAlign: 'center', paddingTop: 100 }}><BackButton /><p>Загрузка...</p></div>;

  // Not in faction view
  if (!inFaction) {
    return (
      <div style={{ minHeight: '100vh', overflow: 'auto', padding: 'calc(90px + env(safe-area-inset-top, 0px)) 16px calc(24px + env(safe-area-inset-bottom, 0px))', maxWidth: 560, margin: '0 auto' }}>
        <BackButton />
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Арена</h2>
        <p style={{ fontSize: 13, opacity: 0.4, marginBottom: 20 }}>Создай или вступи в банду, чтобы захватывать зоны</p>
        <form onSubmit={createFaction} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input placeholder="Название банды" value={factionName} onChange={e => setFactionName(e.target.value)} required style={{ flex: '1 1 140px', minWidth: 0 }} />
          <input type="color" value={factionColor} onChange={e => setFactionColor(e.target.value)} style={{ width: 44, height: 40, padding: 0, border: 'none', flexShrink: 0 }} />
          <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>Создать</button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {factions.map((f: any) => (
            <div key={f._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: f.factionColor || '#555', flexShrink: 0 }}></div>
                <span style={{ fontWeight: 600 }}>{f.name}</span>
                <span style={{ fontSize: 12, opacity: 0.4 }}>({f.memberCount} чел.)</span>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => joinFaction(f._id)}>Вступить</button>
            </div>
          ))}
          {factions.length === 0 && <p style={{ textAlign: 'center', opacity: 0.3, marginTop: 20 }}>Пока нет банд. Создай первую!</p>}
        </div>
      </div>
    );
  }

  // In faction — two-tab layout
  const username = user?.username || 'Player';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', background: '#0a0a0c', color: '#e0f0e0', fontFamily: 'monospace' }}>

      {/* Tab bar — responsive: stats cluster shrinks, tabs stay tappable */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1100, display: 'flex', alignItems: 'stretch', background: 'rgba(10,10,15,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ display: 'flex', gap: 'clamp(4px, 2vw, 8px)', padding: '8px clamp(8px, 3vw, 14px)', alignItems: 'center', minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
          {/* Компактная кнопка назад: flexShrink 0, чтобы её не схлопывало на узких экранах */}
          <button onClick={() => { window.location.href = '/profile'; }} aria-label="Назад"
            style={{ flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e0f0e0', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, padding: 0 }}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}></div>
          <div style={{ fontSize: 'clamp(10px, 3vw, 12px)', color: '#ff6b6b', whiteSpace: 'nowrap', flexShrink: 0 }}><i className="fa-solid fa-heart"></i> {hp}</div>
          <div style={{ fontSize: 'clamp(10px, 3vw, 12px)', color: '#ffd740', whiteSpace: 'nowrap', flexShrink: 0 }}><i className="fa-solid fa-coins"></i> {gold}</div>
          {user?.arenaRank && (
            <div className="gr-rank-chip" style={{ fontSize: 'clamp(10px, 3vw, 12px)', color: '#00ffcc', whiteSpace: 'nowrap', flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis' }} title={`ELO ${user.arenaRating}`}>
              <i className="fa-solid fa-ranking-star"></i> {user.arenaRank}
            </div>
          )}
          <div style={{ fontSize: 'clamp(11px, 3vw, 13px)', opacity: 0.5, cursor: 'pointer', flexShrink: 0 }} onClick={leaveFaction} title="Выйти из банды"><i className="fa-solid fa-right-from-bracket"></i></div>
        </div>
        <button onClick={() => setTab('map')}
          style={{ padding: '8px clamp(12px, 4vw, 22px)', fontSize: 'clamp(11px, 3vw, 12px)', fontWeight: 700, letterSpacing: 1, cursor: 'pointer', background: tab === 'map' ? 'rgba(0,255,200,0.1)' : 'transparent', color: tab === 'map' ? '#00ffcc' : '#666', border: 'none', borderBottom: tab === 'map' ? '2px solid #00ffcc' : '2px solid transparent', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <i className="fa-solid fa-map-location-dot"></i> <span className="gr-tab-label">Карта</span>
        </button>
        <button onClick={() => setTab('terminal')}
          style={{ padding: '8px clamp(12px, 4vw, 22px)', fontSize: 'clamp(11px, 3vw, 12px)', fontWeight: 700, letterSpacing: 1, cursor: 'pointer', background: tab === 'terminal' ? 'rgba(255,0,85,0.1)' : 'transparent', color: tab === 'terminal' ? '#ff0055' : '#666', border: 'none', borderBottom: tab === 'terminal' ? '2px solid #ff0055' : '2px solid transparent', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <i className="fa-solid fa-shield-halved"></i> <span className="gr-tab-label">Штаб</span>
        </button>
      </div>

      {/* Toast notifications */}
      {stepResult && (
        <div style={{ position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, background: 'rgba(0,0,0,0.9)', borderRadius: 12, padding: '8px 16px', fontSize: 13, backdropFilter: 'blur(8px)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
          {stepResult.captured && <span><i className="fa-solid fa-flag" style={{ color: '#00e676' }}></i> Зона захвачена и закрашена!{stepResult.elo ? ` ELO +${stepResult.elo.delta} (${stepResult.elo.rank} ${stepResult.elo.rating})` : ''}</span>}
          {stepResult.trapHit && <span><i className="fa-solid fa-burst" style={{ color: '#ff6b6b' }}></i> Мина! {stepResult.trapHit.blocked ? 'Щит поглотил урон' : `-${stepResult.trapHit.damage} HP`}</span>}
          {stepResult.death && <span><i className="fa-solid fa-skull" style={{ color: '#ff5252' }}></i> Ты выведен из строя! Банда потеряла {stepResult.zonesLost} зон</span>}
          {stepResult.scanned !== undefined && <span><i className="fa-solid fa-satellite-dish" style={{ color: '#00ffcc' }}></i> {stepResult.scanned > 0 ? `Обнаружено мин: ${stepResult.scanned}. Подойди ближе 5 м для разминирования` : 'Мин в радиусе 150 м не найдено'}</span>}
          {stepResult.defused && <span><i className="fa-solid fa-scissors" style={{ color: '#00e676' }}></i> Ловушка деактивирована! +{stepResult.xp} XP. Противник получил тревогу</span>}
          {stepResult.mission && <span><i className="fa-solid fa-list-check" style={{ color: '#b794f6' }}></i> {stepResult.mission.title}: выполнено!</span>}
          {stepResult.bought && <span><i className="fa-solid fa-check" style={{ color: '#00e676' }}></i> Куплено: {stepResult.bought}</span>}
          {stepResult.itemUsed === 'medpack' && <span><i className="fa-solid fa-kit-medical" style={{ color: '#00e676' }}></i> Аптечка: HP восстановлено{typeof stepResult.hp === 'number' ? ` (${stepResult.hp})` : ''}</span>}
          {stepResult.itemUsed === 'shield' && <span><i className="fa-solid fa-shield-halved" style={{ color: '#4488ff' }}></i> Щит активен — заблокирует мину</span>}
          {stepResult.buyError && <span style={{ color: '#ff5252' }}><i className="fa-solid fa-xmark"></i> {stepResult.buyError}</span>}
          {stepResult.roleChanged && <span><i className="fa-solid fa-check" style={{ color: '#00e676' }}></i> Роль изменена</span>}
          {stepResult.hqSet && <span><i className="fa-solid fa-flag" style={{ color: '#ffd740' }}></i> Штаб установлен!</span>}
          {stepResult.placed && <span><i className="fa-solid fa-bomb" style={{ color: '#ff0055' }}></i> Мина установлена!</span>}
          {stepResult.roleError && <span style={{ color: '#ff5252' }}><i className="fa-solid fa-xmark"></i> {stepResult.roleError}</span>}
        </div>
      )}

      {/* Tab 1: Grid Map — только карта, Режим Ниндзя и Сканер */}
      {tab === 'map' && client && (
        <Suspense fallback={<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>Загрузка карты...</div>}>
        <ArenaMap zones={zones} onZoneClick={handleZoneClick} userCoords={coords}
          myFactionId={userRef.current?.factionId || user?.factionId} scannedTraps={scannerTraps} />

          {/* Прогресс влияния в текущей зоне */}
          {influence && !dead && (
            <div style={{ position: 'absolute', top: 'calc(56px + env(safe-area-inset-top, 0px))', left: '50%', transform: 'translateX(-50%)', zIndex: 900, background: 'rgba(0,0,0,0.75)', borderRadius: 10, padding: '6px 14px', fontSize: 11, minWidth: 180, textAlign: 'center', border: '1px solid rgba(0,255,200,0.15)' }}>
              <div style={{ marginBottom: 4, opacity: 0.7 }}>Влияние: {influence.value}/{influence.target}</div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (influence.value / influence.target) * 100)}%`, height: '100%', background: '#00ffcc' }} />
              </div>
            </div>
          )}

          {/* Панель: Режим Ниндзя + Сканер + Мина (всё из обучения) */}
          <div style={{ position: 'absolute', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', left: 12, right: 12, zIndex: 1000, display: 'flex', gap: 8 }}>
            <button onClick={() => setNinja(n => !n)}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 12, cursor: 'pointer', minWidth: 0,
                fontFamily: 'inherit', fontWeight: 800, fontSize: 'clamp(10px, 2.8vw, 12px)', letterSpacing: 1,
                background: ninja ? 'rgba(124,58,237,0.3)' : 'rgba(0,0,0,0.75)',
                border: `1px solid ${ninja ? '#7c3aed' : 'rgba(255,255,255,0.15)'}`,
                color: ninja ? '#b794f6' : '#cfd8dc', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
              }}>
              <i className="fa-solid fa-user-ninja"></i> {ninja ? 'НИНДЗЯ ВКЛ' : 'НИНДЗЯ'}
            </button>
            <button onClick={runScanner} disabled={!ninja}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 12, minWidth: 0,
                cursor: ninja ? 'pointer' : 'default',
                fontFamily: 'inherit', fontWeight: 800, fontSize: 'clamp(10px, 2.8vw, 12px)', letterSpacing: 1,
                background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.4)',
                color: '#00e676', opacity: ninja ? 1 : 0.35, backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
              }}>
              <i className="fa-solid fa-satellite-dish"></i> СКАНЕР
            </button>
            <button onClick={placeMineHere} disabled={placing || (inventory.trap || 0) <= 0}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 12, minWidth: 0,
                cursor: (inventory.trap || 0) > 0 ? 'pointer' : 'default',
                fontFamily: 'inherit', fontWeight: 800, fontSize: 'clamp(10px, 2.8vw, 12px)', letterSpacing: 1,
                background: 'rgba(255,0,85,0.12)', border: '1px solid rgba(255,0,85,0.4)',
                color: '#ff5c8a', opacity: (inventory.trap || 0) > 0 ? 1 : 0.35, backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
              }}>
              <i className="fa-solid fa-bomb"></i> МИНА ({inventory.trap || 0})
            </button>
          </div>

          {/* Подсказка про износ в ниндзя-режиме */}
          {ninja && !dead && (
            <div style={{ position: 'absolute', bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)', zIndex: 900, fontSize: 10, opacity: 0.6, background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap' }}>
              Мины не взрываются. Износ HP на чужой территории x2
            </div>
          )}

          {/* Мини-игра разминирования: открывается ближе 5 м к мине */}
          {defuseTrap && !dead && (
            <WireGame onComplete={finishDefuse} subtitle="Зона продолжает списывать HP. Работай быстро." />
          )}

          {/* Экран смерти */}
          {dead && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 2500, background: 'rgba(4,6,10,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, color: '#ff0055' }}>ТЫ ВЫВЕДЕН ИЗ СТРОЯ</div>
              <div style={{ fontSize: 12.5, opacity: 0.6, lineHeight: 1.6, maxWidth: 340 }}>
                HP упало до нуля. Банда потеряла часть зон в этом секторе.
                Респавн — в Safe Zone. HP восстанавливается трипами: 1 трип = +10 HP.
              </div>
              <button onClick={() => { window.location.href = '/garage'; }}
                style={{ padding: '12px 28px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, background: 'rgba(0,230,118,0.15)', border: '1px solid #00e676', color: '#00e676' }}>
                В ГАРАЖ — НА ТРИП
              </button>
            </div>
          )}

          {/* Trap placement modal */}
          {trapTarget && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#0d0d14', borderRadius: 16, padding: 24, border: '1px solid rgba(255,0,85,0.2)', maxWidth: 320, width: '90%', textAlign: 'center' }}>
                <div style={{ fontSize: 34, marginBottom: 12, color: '#ff0055' }}><i className="fa-solid fa-bomb"></i></div>
                <h3 style={{ marginBottom: 8, fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>УСТАНОВИТЬ МИНУ</h3>
                <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 16 }}>
                  Зона: {trapTarget.zone.properties?.id || '—'}
                  <br />Урон: 25 HP | Трата: 1 ловушка из инвентаря
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={placing} onClick={placeTrap}
                    style={{ flex: 1, padding: '10px 0', background: placing ? 'rgba(255,0,85,0.2)' : 'rgba(255,0,85,0.15)', border: '1px solid #ff0055', borderRadius: 8, cursor: placing ? 'not-allowed' : 'pointer', color: '#ff0055', fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>
                    {placing ? 'УСТАНОВКА...' : 'УСТАНОВИТЬ'}
                  </button>
                  <button onClick={() => setTrapTarget(null)}
                    style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, cursor: 'pointer', color: '#666', fontFamily: 'inherit', fontSize: 13 }}>
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}
        </Suspense>
      )}

      {/* Tab 2: Gang Terminal */}
      {tab === 'terminal' && (
        <div style={{ position: 'absolute', top: 'calc(44px + env(safe-area-inset-top, 0px))', left: 0, right: 0, bottom: 0, overflow: 'auto', padding: '20px 16px calc(24px + env(safe-area-inset-bottom, 0px))', maxWidth: 640, margin: '0 auto' }}>
          {/* Faction header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: myFaction?.color || '#555', flexShrink: 0 }}></div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>{myFaction?.name || 'Банда'}</div>
              <div style={{ fontSize: 11, opacity: 0.4 }}>Участников: {myFaction?.members?.length || 0} | Казна: <i className="fa-solid fa-coins" style={{ color: '#ffd740' }}></i> {myFaction?.treasury || 0}</div>
            </div>
          </div>

          {/* Set HQ button (owner only) */}
          {userRole === 'owner' && (
            <button onClick={setHq}
              style={{ width: '100%', marginBottom: 16, padding: '10px 0', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 8, cursor: 'pointer', color: '#ffd740', fontFamily: 'inherit', fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>
<i className="fa-solid fa-flag"></i> ЗАФИКСИРОВАТЬ ШТАБ (текущая зона)
            </button>
          )}

          {/* HQ display */}
          {myFaction?.hq && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,215,0,0.05)', borderRadius: 8, border: '1px solid rgba(255,215,0,0.15)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
<i className="fa-solid fa-shield-halved" style={{ color: '#ffd740' }}></i> Штаб: зона {myFaction.hq.id} ({myFaction.hq.lat?.toFixed(4)}, {myFaction.hq.lng?.toFixed(4)})
            </div>
          )}

          {/* Снабжение: покупка + применение предметов (вынесено с карты в Штаб) */}
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, marginBottom: 6, color: '#ffd740' }}><i className="fa-solid fa-store"></i> СНАБЖЕНИЕ</div>
          <div style={{ fontSize: 10.5, opacity: 0.4, marginBottom: 10, lineHeight: 1.4 }}>
            Аптечку жми «Лечить». Щит пассивный — заблокирует следующую мину сам. Мину ставь кнопкой на карте.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {SHOP_ITEMS.map(item => {
              const owned = inventory[item.id] || 0;
              return (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <i className={`fa-solid ${item.icon}`} style={{ fontSize: 16, color: item.color, width: 20, textAlign: 'center', flexShrink: 0 }}></i>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{item.label} <span style={{ opacity: 0.4, fontWeight: 400 }}>x{owned}</span></div>
                      <div style={{ fontSize: 10, opacity: 0.4 }}>{item.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {item.id === 'medpack' && (
                      <button onClick={() => useItem('medpack')} disabled={owned <= 0}
                        style={{ background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.35)', borderRadius: 8, padding: '5px 10px', cursor: owned > 0 ? 'pointer' : 'default', color: '#00e676', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: owned > 0 ? 1 : 0.35 }}>
                        <i className="fa-solid fa-kit-medical"></i> Лечить
                      </button>
                    )}
                    {item.id === 'shield' && owned > 0 && (
                      <span style={{ alignSelf: 'center', fontSize: 10, color: '#4488ff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>активен</span>
                    )}
                    <button onClick={() => buyItem(item.id)}
                      style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: '#ffd740', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      <i className="fa-solid fa-coins"></i> {item.price}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Member list */}
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, marginBottom: 12, color: '#ff0055' }}><i className="fa-solid fa-users"></i> СОСТАВ БАНДЫ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(myFaction?.members || []).map((m: any) => {
              const roleLabel = FACTION_ROLES.find(r => r.id === m.role)?.label || m.role;
              const isOwner = userRole === 'owner';
              const isOfficer = userRole === 'officer';
              const canManage = isOwner || (isOfficer && m.role === 'rookie');

              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,255,200,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: m.role === 'owner' ? '#ffd740' : m.role === 'officer' ? '#00ffcc' : '#888' }}>
                      {m.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.username}</div>
                      <div style={{ fontSize: 10, opacity: 0.4, display: 'flex', gap: 6 }}>
                        <span style={{ color: m.role === 'owner' ? '#ffd740' : m.role === 'officer' ? '#00ffcc' : '#888' }}>
                          <i className={`fa-solid ${m.role === 'owner' ? 'fa-crown' : m.role === 'officer' ? 'fa-star' : 'fa-user'}`}></i> {roleLabel}
                        </span>
                        <span style={{ color: '#ff6b6b' }}><i className="fa-solid fa-heart"></i> {m.hp}</span>
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {m.role === 'rookie' && (
                        <button onClick={() => changeRole(m.id, 'officer')}
                          style={{ padding: '4px 8px', background: 'rgba(0,255,200,0.1)', border: '1px solid rgba(0,255,200,0.2)', borderRadius: 4, cursor: 'pointer', color: '#00ffcc', fontSize: 10, fontFamily: 'inherit' }}>
                          <i className="fa-solid fa-arrow-up"></i> Повысить
                        </button>
                      )}
                      {isOwner && m.role === 'officer' && (
                        <button onClick={() => changeRole(m.id, 'rookie')}
                          style={{ padding: '4px 8px', background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.2)', borderRadius: 4, cursor: 'pointer', color: '#ff6400', fontSize: 10, fontFamily: 'inherit' }}>
                          <i className="fa-solid fa-arrow-down"></i> Разжаловать
                        </button>
                      )}
                      {isOwner && m.role === 'rookie' && (
                        <>
                          <button onClick={() => changeRole(m.id, 'officer')}
                            style={{ padding: '4px 9px', background: 'rgba(0,255,200,0.1)', border: '1px solid rgba(0,255,200,0.2)', borderRadius: 4, cursor: 'pointer', color: '#00ffcc', fontSize: 11, fontFamily: 'inherit' }} title="Повысить">
                            <i className="fa-solid fa-arrow-up"></i>
                          </button>
                          <button onClick={() => changeRole(m.id, 'rookie')}
                            style={{ padding: '4px 9px', background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.2)', borderRadius: 4, cursor: 'pointer', color: '#ff6400', fontSize: 11, fontFamily: 'inherit' }} title="Понизить">
                            <i className="fa-solid fa-arrow-down"></i>
                          </button>
                        </>
                      )}
                      {m.role !== 'owner' && (
                        <button onClick={() => kickMember(m.id)}
                          style={{ padding: '4px 9px', background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: 4, cursor: 'pointer', color: '#ff5050', fontSize: 11, fontFamily: 'inherit' }} title="Кикнуть">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Выйти из банды */}
          <button onClick={() => { if (confirm('Точно выйти из банды? Если ты главарь — лидерство перейдёт другому участнику.')) leaveFaction(); }}
            style={{ width: '100%', marginTop: 24, padding: '13px 0', borderRadius: 12, cursor: 'pointer', background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.3)', color: '#ff5252', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
            <i className="fa-solid fa-right-from-bracket"></i> ВЫЙТИ ИЗ БАНДЫ
          </button>
        </div>
      )}

      <style jsx global>{`
        .gr-action-bar::-webkit-scrollbar { display: none; }
        .gr-action-bar { -ms-overflow-style: none; scrollbar-width: none; }
        .gr-action-bar > button, .gr-action-bar > div { flex-shrink: 0; }
        /* Hide tab word labels on very narrow screens — icons stay */
        @media (max-width: 360px) { .gr-tab-label { display: none; } }
        /* ELO chip is the first thing to go on narrow screens — back button never shrinks */
        @media (max-width: 430px) { .gr-rank-chip { display: none; } }
      `}</style>
    </div>
  );
}
