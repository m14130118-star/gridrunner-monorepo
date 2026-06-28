import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { BackButton } from '../../src/components/BackButton';
import { getApiUrl } from '../../src/lib/api';
import dynamic from 'next/dynamic';

const ArenaMap = dynamic(() => import('../../src/components/ArenaMap'), { ssr: false });

const ITEMS = [
  { id: 'shield', icon: 'fa-shield-halved', label: 'Щит', color: '#4488ff' },
  { id: 'medpack', icon: 'fa-kit-medical', label: 'Аптечка', color: '#ff4444' },
  { id: 'scanner', icon: 'fa-radar', label: 'Сканер', color: '#ffaa00' },
  { id: 'vibe_booster', icon: 'fa-bolt', label: 'Бустер', color: '#cc44ff' },
];

export default function ArenaActive() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [factions, setFactions] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 55.75, lng: 37.62 });
  const [hp, setHp] = useState(100);
  const [gold, setGold] = useState(0);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [stepResult, setStepResult] = useState<any>(null);
  const [fetchErr, setFetchErr] = useState('');
  const [factionName, setFactionName] = useState('');
  const [factionColor, setFactionColor] = useState('#32cd32');
  const [scannerTraps, setScannerTraps] = useState<any[]>([]);
  const [tradeTarget, setTradeTarget] = useState('');
  const [inFaction, setInFaction] = useState(false);
  const [showShop, setShowShop] = useState(false);

  const SHOP_ITEMS = [
    { id: 'shield', icon: 'fa-shield-halved', label: 'Щит', color: '#4488ff', price: 50, desc: 'Блокирует 1 ловушку' },
    { id: 'medpack', icon: 'fa-kit-medical', label: 'Аптечка', color: '#ff4444', price: 30, desc: '+30 HP' },
    { id: 'scanner', icon: 'fa-radar', label: 'Сканер', color: '#ffaa00', price: 100, desc: 'Видит мины в 150м' },
    { id: 'vibe_booster', icon: 'fa-bolt', label: 'Бустер', color: '#cc44ff', price: 80, desc: '×2 влияние на зону' },
    { id: 'trap', icon: 'fa-bomb', label: 'Ловушка', color: '#ff6600', price: 40, desc: '-25 HP врагу' },
  ];

  const watchId = useRef<number | null>(null);
  const userRef = useRef<any>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('gridrunner_token');
    if (!t) { router.push('/auth/login'); return; }
    setToken(t);
    tokenRef.current = t;
  }, []);

  const hdrs = () => ({ headers: { Authorization: 'Bearer ' + tokenRef.current, 'Content-Type': 'application/json' } });

  // Initial data load
  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(getApiUrl() + '/api/v1/player/profile', hdrs()).then(r => r.json()),
      fetch(getApiUrl() + '/api/v1/factions/', hdrs()).then(r => r.json()),
      fetch(getApiUrl() + '/api/v1/arena/get-inventory', hdrs()).then(r => r.json()),
    ]).then(([profile, factionsData, invData]) => {
      if (!profile.success) { router.push('/auth/login'); return; }
      setUser(profile.profile);
      userRef.current = profile.profile;
      setHp(profile.profile.hp ?? 100);
      setGold(profile.profile.gridCoins ?? 0);
      setInFaction(!!(profile.profile.factionName && profile.profile.factionName !== 'Без банды'));
      setFactions(factionsData.factions || []);
      setInventory(invData.inventory?.items || { shield: 2, medpack: 4, scanner: 1, vibe_booster: 1 });
    }).catch(() => setFetchErr('Server unreachable'));
  }, [token]);

  const doStep = useCallback(async (lat: number, lng: number) => {
    const u = userRef.current;
    if (!tokenRef.current || !u?.factionId) return;
    try {
      const r = await fetch(getApiUrl() + '/api/v1/arena/step', {
        method: 'POST', ...hdrs(),
        body: JSON.stringify({ lat, lng }),
      });
      const d = await r.json();
      if (d.success) {
        setHp(d.hp); setGold(d.gridCoins);
        if (d.trapHit) { setStepResult(d.trapHit); setTimeout(() => setStepResult(null), 3000); }
        if (d.deathPenalty) { setStepResult({ ...d.deathPenalty, death: true }); setTimeout(() => setStepResult(null), 5000); }
        if (d.captured) { setStepResult({ captured: true, zoneId: d.zoneId }); setTimeout(() => setStepResult(null), 3000); }
      }
    } catch {}
  }, []);

  const fetchZones = useCallback(async (lat: number, lng: number) => {
    if (!tokenRef.current) return;
    try {
      const r = await fetch(`${getApiUrl()}/api/v1/arena/zones?lat=${lat}&lng=${lng}`, hdrs());
      const d = await r.json();
      if (d.success) setZones(d.zones || []);
    } catch {}
  }, []);

  // GPS watch — now uses refs, never stale
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
    navigator.geolocation.getCurrentPosition(success); // immediate first
    watchId.current = navigator.geolocation.watchPosition(success,
      err => console.warn('GPS err:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => { running = false; if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, [token]);

  const useItem = async (itemType: string) => {
    if (!tokenRef.current) return;
    try {
      const body: any = { itemType };
      if (itemType === 'scanner' || itemType === 'vibe_booster') { body.lat = coords.lat; body.lng = coords.lng; }
      const r = await fetch(getApiUrl() + '/api/v1/arena/use-item', {
        method: 'POST', ...hdrs(), body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) {
        setInventory(prev => ({ ...prev, [itemType]: d.remaining }));
        if (d.hp) setHp(d.hp);
        if (d.scanner?.traps) { setScannerTraps(d.scanner.traps); setTimeout(() => setScannerTraps([]), 30000); }
        setStepResult({ itemUsed: itemType }); setTimeout(() => setStepResult(null), 2000);
      }
    } catch {}
  };

  const createFaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenRef.current) return;
    const r = await fetch(getApiUrl() + '/api/v1/factions/create', {
      method: 'POST', ...hdrs(), body: JSON.stringify({ name: factionName, color: factionColor }),
    });
    const d = await r.json();
    if (d.success) {
      const u = { ...(userRef.current || {}), factionName, factionId: d.faction._id, factionRole: 'leader' };
      userRef.current = u; setUser(u); setInFaction(true);
      setFactions(prev => [...prev, d.faction]);
    }
  };

  const joinFaction = async (factionId: string) => {
    if (!tokenRef.current) return;
    const r = await fetch(getApiUrl() + `/api/v1/factions/join/${factionId}`, { method: 'POST', ...hdrs() });
    const d = await r.json();
    if (d.success) {
      const u = { ...(userRef.current || {}), factionName: d.faction.name, factionId, factionRole: 'member' };
      userRef.current = u; setUser(u); setInFaction(true);
    }
  };

  const leaveFaction = async () => {
    if (!tokenRef.current) return;
    const r = await fetch(getApiUrl() + '/api/v1/factions/leave', { method: 'POST', ...hdrs() });
    const d = await r.json();
    if (d.success) {
      const u = { ...(userRef.current || {}), factionName: null, factionId: null, factionRole: null };
      userRef.current = u; setUser(u); setInFaction(false);
    }
  };

  const buyItem = async (itemType: string) => {
    if (!tokenRef.current) return;
    const r = await fetch(getApiUrl() + '/api/v1/arena/shop/buy', {
      method: 'POST', ...hdrs(), body: JSON.stringify({ itemType }),
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

  const initiateTrade = async () => {
    if (!tradeTarget || !tokenRef.current) return;
    const r = await fetch(getApiUrl() + '/api/v1/arena/trade/initiate', {
      method: 'POST', ...hdrs(),
      body: JSON.stringify({ targetUserId: tradeTarget, itemsToOffer: { shield: 1 }, itemsToRequest: { medpack: 1 } }),
    });
    const d = await r.json();
    setStepResult(d.success ? { trade: true } : { tradeError: d.message });
    setTimeout(() => setStepResult(null), 3000);
  };

  if (fetchErr) return <div className="page" style={{ padding: 24, textAlign: 'center', paddingTop: 100 }}><BackButton /><p style={{ color: '#ff5252' }}>{fetchErr}</p></div>;
  if (!user) return <div className="page" style={{ padding: 24, textAlign: 'center', paddingTop: 100 }}><BackButton /><p>Загрузка...</p></div>;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', background: '#0a1a0f', color: '#e0f0e0' }}>
      {inFaction ? (
        <>
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, display: 'flex', gap: 8, alignItems: 'center' }}>
            <BackButton />
            <div style={{ background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '4px 10px', fontSize: 12, backdropFilter: 'blur(4px)', display: 'flex', gap: 10 }}>
              <span>❤️ {hp}</span>
              <span>🪙 {gold}</span>
              <span style={{ opacity: 0.6, cursor: 'pointer' }} onClick={leaveFaction}>🚪</span>
            </div>
          </div>

          <ArenaMap zones={zones} />

          {stepResult && (
            <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(0,0,0,0.85)', borderRadius: 12, padding: '8px 16px', fontSize: 13, backdropFilter: 'blur(8px)', textAlign: 'center' }}>
              {stepResult.captured && <span>✅ Захвачена зона!</span>}
              {stepResult.trapHit && <span>💥 {stepResult.trapHit.type}! {stepResult.trapHit.blocked ? 'Щит поглотил урон' : `-${stepResult.trapHit.damage} HP`}</span>}
              {stepResult.death && <span>💀 Ты умер! Потеряно {stepResult.zonesLost} зон</span>}
              {stepResult.itemUsed && <span>✅ Использовано: {stepResult.itemUsed}</span>}
              {stepResult.bought && <span>✅ Куплено: {stepResult.bought}</span>}
              {stepResult.buyError && <span style={{ color: '#ff5252' }}>❌ {stepResult.buyError}</span>}
              {stepResult.trade && <span>✅ Обмен совершён</span>}
              {stepResult.tradeError && <span style={{ color: '#ff5252' }}>❌ {stepResult.tradeError}</span>}
            </div>
          )}

          {scannerTraps.length > 0 && (
            <div style={{ position: 'absolute', bottom: 100, left: 10, zIndex: 1000, background: 'rgba(0,0,0,0.8)', borderRadius: 8, padding: 8, fontSize: 11 }}>
              <span style={{ color: '#ffaa00' }}>⚠️ {scannerTraps.length} мин рядом</span>
            </div>
          )}

          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: 8, background: 'rgba(0,0,0,0.8)', padding: '8px 14px', borderRadius: 16, backdropFilter: 'blur(8px)' }}>
            {ITEMS.map(item => (
              <button key={item.id} onClick={() => useItem(item.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.05)', border: `1px solid ${item.color}44`, borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: '#e0f0e0', fontFamily: 'inherit', fontSize: 10, minWidth: 56 }}>
                <i className={`fa-solid ${item.icon}`} style={{ fontSize: 16, color: item.color }}></i>
                <span>{item.label}</span>
                <span style={{ opacity: 0.5, fontSize: 9 }}>{inventory[item.id] || 0}</span>
              </button>
            ))}
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}></div>
            <button onClick={() => setShowShop(true)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.05)', border: '1px solid #ffd74044', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: '#e0f0e0', fontFamily: 'inherit', fontSize: 10, minWidth: 56 }}>
              <i className="fa-solid fa-store" style={{ fontSize: 16, color: '#ffd740' }}></i>
              <span>Магаз</span>
            </button>
            <button onClick={() => setStepResult({ showTrade: true })}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.05)', border: '1px solid #ffaa0044', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: '#e0f0e0', fontFamily: 'inherit', fontSize: 10, minWidth: 56 }}>
              <i className="fa-solid fa-arrows-left-right" style={{ fontSize: 16, color: '#ffaa00' }}></i>
              <span>Трейд</span>
            </button>
          </div>

          {showShop && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#0d2415', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)', maxWidth: 320, width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3><i className="fa-solid fa-store"></i> Магазин</h3>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#ffd740' }}>🪙 {gold}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SHOP_ITEMS.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className={`fa-solid ${item.icon}`} style={{ fontSize: 18, color: item.color, width: 24, textAlign: 'center' }}></i>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</div>
                          <div style={{ fontSize: 10, opacity: 0.5 }}>{item.desc}</div>
                        </div>
                      </div>
                      <button className="btn btn-sm" onClick={() => buyItem(item.id)}
                        style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid #ffd74044', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#ffd740', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                        🪙 {item.price}
                      </button>
                    </div>
                  ))}
                </div>
                <button className="btn btn-secondary" onClick={() => setShowShop(false)} style={{ width: '100%', marginTop: 12, justifyContent: 'center', padding: '10px 0' }}>Закрыть</button>
              </div>
            </div>
          )}

          {stepResult?.showTrade && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#0d2415', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)', maxWidth: 320, width: '90%' }}>
                <h3 style={{ marginBottom: 12 }}>P2P Трейд</h3>
                <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 12 }}>Оба игрока должны быть в Safe Zone</p>
                <input placeholder="ID пользователя" value={tradeTarget} onChange={e => setTradeTarget(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
                <p style={{ fontSize: 11, opacity: 0.5, marginBottom: 12 }}>Ты отдаёшь: 1x Щит → получаешь: 1x Аптечка</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={initiateTrade} style={{ flex: 1 }}>Обменять</button>
                  <button className="btn btn-secondary" onClick={() => setStepResult(null)} style={{ flex: 1 }}>Отмена</button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ height: '100vh', overflow: 'auto', padding: '100px 16px 24px' }}>
          <BackButton />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Арена</h2>
          <p style={{ fontSize: 13, opacity: 0.4, marginBottom: 20 }}>Создай или вступи в банду, чтобы захватывать зоны</p>

          <form onSubmit={createFaction} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input placeholder="Название банды" value={factionName} onChange={e => setFactionName(e.target.value)} required style={{ flex: 1 }} />
            <input type="color" value={factionColor} onChange={e => setFactionColor(e.target.value)} style={{ width: 44, height: 40, padding: 0, border: 'none' }} />
            <button type="submit" className="btn btn-primary">Создать</button>
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
      )}
    </div>
  );
}
