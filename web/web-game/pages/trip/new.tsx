import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useT } from '../../src/lib/i18n';
import { useTrip } from '../../src/lib/trip-context';

const PoiMap = dynamic(() => import('../../src/components/PoiMap'), { ssr: false });

const VEHICLES = [
  { id: 'feet', icon: 'fa-person-walking', ru: 'Пешком', en: 'On foot' },
  { id: 'bicycle', icon: 'fa-bicycle', ru: 'Велосипед', en: 'Bicycle' },
  { id: 'skateboard', icon: 'fa-skateboard', ru: 'Скейт', en: 'Skateboard' },
  { id: 'car', icon: 'fa-car', ru: 'Машина', en: 'Car' },
];

const VIBES = [
  { id: 'cruise', icon: 'fa-road', ru: 'Круиз', en: 'Cruise' },
  { id: 'scenic', icon: 'fa-mountain', ru: 'Панорамный', en: 'Scenic' },
  { id: 'urban', icon: 'fa-city', ru: 'Урбан', en: 'Urban' },
];

const DEFAULT_CITIES = [
  { name: 'Томск', lat: 56.4884, lng: 84.9523 },
  { name: 'Норильск', lat: 69.3526, lng: 88.2029 },
  { name: 'Москва', lat: 55.7558, lng: 37.6173 },
];

export default function TripNew() {
  const { t, lang } = useT();
  const router = useRouter();
  const { wizard, setWizard } = useTrip();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ duration: 60, vehicle: wizard?.vehicle || 'feet', vibe: 'cruise', eat: false, roundTrip: true });
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Point B (destination) state
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [destLoading, setDestLoading] = useState(false);

  useEffect(() => {
    const savedVibes = localStorage.getItem('gridrunner_vibes');
    if (savedVibes) {
      try {
        const vibes = JSON.parse(savedVibes);
        if (Array.isArray(vibes) && vibes.length > 0) {
          setData(prev => ({ ...prev, vibe: vibes[0] }));
        }
      } catch {}
    }
    const savedVehicle = localStorage.getItem('gridrunner_wizard_vehicle');
    if (savedVehicle) {
      setData(prev => ({ ...prev, vehicle: savedVehicle }));
    }
    localStorage.removeItem('gridrunner_wizard_vehicle');
  }, []);

  // GPS state
  const [gpsStatus, setGpsStatus] = useState<'checking' | 'granted' | 'denied' | 'disabled'>('checking');
  const [mode, setMode] = useState<'gps' | 'manual'>('gps');

  // Manual mode
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [selectedCity, setSelectedCity] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [nominatimLoading, setNominatimLoading] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('disabled');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setStartCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('granted'); },
      (err) => { setGpsStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'disabled'); },
      { timeout: 5000, enableHighAccuracy: true }
    );
  }, []);

  const nextStep = () => setStep(s => s + 1);

  // Nominatim search with debounce
  useEffect(() => {
    if (cityQuery.length < 3) { setCityResults([]); return; }
    const t = setTimeout(async () => {
      setNominatimLoading(true);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=5&accept-language=${lang}`);
        const data = await r.json();
        setCityResults(data.map((d: any) => ({ name: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) })));
      } catch {}
      setNominatimLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [cityQuery]);

  const applyCoords = (lat: number, lng: number) => {
    setStartCoords({ lat, lng });
  };

  const startGenerating = (overrides?: { roundTrip?: boolean; end?: { lat: number; lng: number; name: string } | null }) => {
    const end = overrides?.end !== undefined ? overrides.end : endPoint;
    setWizard({
      duration: data.duration,
      vibe: data.vibe,
      eat: data.eat,
      roundTrip: overrides?.roundTrip !== undefined ? overrides.roundTrip : data.roundTrip,
      startLat: startCoords?.lat || 55.0302,
      startLng: startCoords?.lng || 82.9204,
      vehicle: data.vehicle,
      endLat: end?.lat ?? null,
      endLng: end?.lng ?? null,
      endName: end?.name ?? null,
    });
    router.push('/trip/generating');
  };

  // Nominatim destination search (biased to the area around the start)
  useEffect(() => {
    if (destQuery.length < 3) { setDestResults([]); return; }
    const timer = setTimeout(async () => {
      setDestLoading(true);
      try {
        const viewbox = startCoords
          ? `&viewbox=${startCoords.lng - 0.25},${startCoords.lat + 0.15},${startCoords.lng + 0.25},${startCoords.lat - 0.15}&bounded=0`
          : '';
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destQuery)}&format=json&limit=5&accept-language=${lang}${viewbox}`);
        const d = await r.json();
        setDestResults(d.map((x: any) => ({ name: x.display_name, lat: parseFloat(x.lat), lng: parseFloat(x.lon) })));
      } catch {}
      setDestLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [destQuery]);

  // If GPS is denied/disabled, show GPS error screen
  if (gpsStatus === 'denied' || gpsStatus === 'disabled') {
    return (
      <div className="page page-center" style={{ textAlign: 'center', flexDirection: 'column', gap: 16, padding: 32 }}>
        <i className="fa-solid fa-location-crosshairs" style={{ fontSize: 48, opacity: 0.2 }}></i>
        <h2 style={{ color: '#ff5050', fontSize: 18 }}>{lang === 'ru' ? 'Ошибка навигации' : 'Navigation error'}</h2>
        <p style={{ opacity: 0.5, maxWidth: 280 }}>
          {gpsStatus === 'denied'
            ? (lang === 'ru' ? 'Разреши доступ к геолокации в настройках браузера' : 'Allow geolocation access in browser settings')
            : (lang === 'ru' ? 'Включи GPS на устройстве' : 'Enable GPS on your device')}
        </p>
        <button onClick={() => { setGpsStatus('checking'); navigator.geolocation.getCurrentPosition(
          (pos) => { setStartCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('granted'); },
          () => setGpsStatus('disabled'),
          { timeout: 5000, enableHighAccuracy: true }
        ); }} className="btn btn-secondary" style={{ marginTop: 8 }}>
          {lang === 'ru' ? 'Повторить' : 'Retry'}
        </button>
        <div style={{ marginTop: 12, opacity: 0.3, fontSize: 12 }}>
          {lang === 'ru' ? 'Или выбери ручной режим ниже' : 'Or use manual mode below'}
        </div>
        <button onClick={() => { setMode('manual'); setGpsStatus('granted'); }} className="btn btn-primary">
          {lang === 'ru' ? 'Ручной ввод' : 'Manual input'}
        </button>
      </div>
    );
  }

  if (gpsStatus === 'checking') {
    return (
      <div className="page page-center" style={{ textAlign: 'center', flexDirection: 'column', gap: 12 }}>
        <i className="fa-solid fa-satellite fa-spin" style={{ fontSize: 32, opacity: 0.4 }}></i>
        <p style={{ opacity: 0.5 }}>{lang === 'ru' ? 'Синхронизация со спутниками...' : 'Syncing with satellites...'}</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: '24px 16px' }}>
      <button onClick={() => { if (step > 1) setStep(s => s - 1); else router.back(); }}
        style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 16, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6 }}>
        <i className="fa-solid fa-chevron-left"></i> {t('common.back')}
      </button>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
        <button
          onClick={() => setMode('gps')}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12,
            background: mode === 'gps' ? 'rgba(0,255,200,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${mode === 'gps' ? 'rgba(0,255,200,0.3)' : 'transparent'}`,
            color: mode === 'gps' ? '#00ffcc' : '#888', cursor: 'pointer',
          }}
        >
          <i className="fa-solid fa-satellite"></i> GPS
        </button>
        <button
          onClick={() => {
            setMode('manual');
            if (!selectedCity) { setCityQuery(''); setCityResults([]); }
          }}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12,
            background: mode === 'manual' ? 'rgba(0,200,255,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${mode === 'manual' ? 'rgba(0,200,255,0.3)' : 'transparent'}`,
            color: mode === 'manual' ? '#00aaff' : '#888', cursor: 'pointer',
          }}
        >
          <i className="fa-solid fa-pen"></i> {lang === 'ru' ? 'Вручную' : 'Manual'}
        </button>
      </div>

      {/* Manual location picker */}
      {mode === 'manual' && (
        <div className="anim-fade" style={{ marginBottom: 16 }}>
          <input
            value={cityQuery}
            onChange={e => setCityQuery(e.target.value)}
            placeholder={lang === 'ru' ? 'Введи город или адрес...' : 'Enter city or address...'}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {nominatimLoading && <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>Поиск...</div>}
          {cityResults.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cityResults.map((c, i) => (
                <button key={i} onClick={() => { setSelectedCity(c); setStartCoords({ lat: c.lat, lng: c.lng }); setCityResults([]); setCityQuery(c.name); }}
                  style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.04)', border: 'none', color: '#ccc', cursor: 'pointer', opacity: 0.8 }}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DEFAULT_CITIES.map(c => (
              <button key={c.name} onClick={() => { setSelectedCity(c); setStartCoords({ lat: c.lat, lng: c.lng }); setCityQuery(c.name); }}
                style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa', cursor: 'pointer' }}>
                {c.name}
              </button>
            ))}
          </div>
          {selectedCity && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#00ff88', textAlign: 'center' }}>
              <i className="fa-solid fa-check-circle"></i> {selectedCity.name} ({selectedCity.lat.toFixed(4)}, {selectedCity.lng.toFixed(4)})
            </div>
          )}
        </div>
      )}

      {/* GPS active indicator */}
      {mode === 'gps' && startCoords && (
        <div style={{ textAlign: 'center', fontSize: 11, color: '#00ff88', marginBottom: 12 }}>
          <i className="fa-solid fa-check-circle"></i> GPS: {startCoords.lat.toFixed(4)}, {startCoords.lng.toFixed(4)}
        </div>
      )}

      {(!startCoords && mode === 'gps') ? (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24 }}></i>
          <p style={{ marginTop: 8, fontSize: 13 }}>{lang === 'ru' ? 'Определяем местоположение...' : 'Getting location...'}</p>
        </div>
      ) : (
        <>
          {step === 1 && (
            <div className="anim-fade">
              <h2 style={{ fontSize: 22, marginBottom: 20 }}>{t('trip.how_long')}</h2>
              <div style={{ padding: '0 8px' }}>
                <input type="range" min={15} max={180} step={5} value={data.duration}
                  onChange={e => setData({...data, duration: parseInt(e.target.value)})}
                  style={{ width: '100%', accentColor: '#00ffcc' }}
                />
                <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, margin: '12px 0', color: '#00ffcc' }}>
                  {data.duration} {t('trip.min')}
                </div>
              </div>
              <button onClick={nextStep} className="btn btn-primary" style={{ width: '100%', padding: '14px 0', borderRadius: 12, fontSize: 15, fontWeight: 700 }}>
                {lang === 'ru' ? 'Далее' : 'Next'}
              </button>
            </div>
          )}

          {step === 2 && !wizard?.vehicle && (
            <div className="anim-fade">
              <h2 style={{ fontSize: 22, marginBottom: 20 }}>{lang === 'ru' ? 'Как передвигаешься?' : 'Choose transport'}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {VEHICLES.map(v => (
                  <button key={v.id} className={`card ${data.vehicle === v.id ? 'active' : ''}`} onClick={() => { setData({...data, vehicle: v.id}); nextStep(); }}>
                    <i className={`fa-solid ${v.icon}`}></i> {lang === 'ru' ? v.ru : v.en}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && wizard?.vehicle && (
            <div className="anim-fade">
              <h2 style={{ fontSize: 22, marginBottom: 20 }}>{lang === 'ru' ? 'Транспорт из гаража' : 'Vehicle from garage'}</h2>
              <p style={{ opacity: 0.5, marginBottom: 20 }}>
                <i className={`fa-solid ${VEHICLES.find(v => v.id === wizard.vehicle)?.icon || 'fa-car'}`}></i>{' '}
                {lang === 'ru' ? VEHICLES.find(v => v.id === wizard.vehicle)?.ru : VEHICLES.find(v => v.id === wizard.vehicle)?.en || wizard.vehicle}
              </p>
              <button onClick={nextStep} className="btn btn-primary" style={{ width: '100%', padding: '14px 0', borderRadius: 12, fontSize: 15, fontWeight: 700 }}>
                {lang === 'ru' ? 'Далее' : 'Next'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="anim-fade">
              <h2 style={{ fontSize: 22, marginBottom: 20 }}>{lang === 'ru' ? 'Выбери вайб' : 'Choose vibe'}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {VIBES.map(v => (
                  <button key={v.id} className={`card ${data.vibe === v.id ? 'active' : ''}`} onClick={() => { setData({...data, vibe: v.id}); nextStep(); }}>
                    <i className={`fa-solid ${v.icon}`}></i> {lang === 'ru' ? v.ru : v.en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="anim-fade">
              <h2 style={{ fontSize: 22, marginBottom: 20 }}>{lang === 'ru' ? 'Желаешь перекусить?' : 'Want to eat?'}</h2>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className={`card ${data.eat ? 'active' : ''}`} onClick={() => { setData({...data, eat: true}); nextStep(); }}>{lang === 'ru' ? 'Да' : 'Yes'}</button>
                <button className={`card ${!data.eat ? 'active' : ''}`} onClick={() => { setData({...data, eat: false}); nextStep(); }}>{lang === 'ru' ? 'Нет' : 'No'}</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="anim-fade">
                <h2 style={{ fontSize: 22, marginBottom: 20 }}>{lang === 'ru' ? 'Куда идём?' : 'Where to?'}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button className="card" onClick={() => { setData({...data, roundTrip: true}); startGenerating({ roundTrip: true, end: null }); }}>
                      <i className="fa-solid fa-rotate-left"></i> {lang === 'ru' ? 'Круг — вернусь в начало' : 'Loop — back to start'}
                    </button>
                    <button className="card" onClick={() => { setData({...data, roundTrip: false}); startGenerating({ roundTrip: false, end: null }); }}>
                      <i className="fa-solid fa-shuffle"></i> {lang === 'ru' ? 'Свободный — куда выведет' : 'Free roam'}
                    </button>
                    <button className={`card ${endPoint !== null || destQuery ? 'active' : ''}`} onClick={() => setStep(6)}>
                      <i className="fa-solid fa-location-dot"></i> {lang === 'ru' ? 'К точке B — задать цель' : 'To point B — set target'}
                    </button>
                </div>
            </div>
          )}

          {step === 6 && (
            <div className="anim-fade">
                <h2 style={{ fontSize: 22, marginBottom: 8 }}>{lang === 'ru' ? 'Точка B' : 'Point B'}</h2>
                <p style={{ opacity: 0.5, fontSize: 13, marginBottom: 12 }}>
                  {lang === 'ru' ? 'Тапни по карте или найди адрес. Маршрут пройдёт через интересные места, награда ×1.25' : 'Tap the map or search an address. Route passes interesting spots, reward ×1.25'}
                </p>
                <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12, border: '1px solid rgba(0,230,118,0.2)', position: 'relative' }}>
                  <PoiMap
                    center={startCoords ? [startCoords.lat, startCoords.lng] : [55.0302, 82.9204]}
                    markerPos={endPoint ? [endPoint.lat, endPoint.lng] : null}
                    onClick={(latlng: any) => setEndPoint({ lat: latlng.lat, lng: latlng.lng, name: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}` })}
                  />
                  {!endPoint && (
                    <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'rgba(4,16,10,0.85)', color: '#9fd4b4', fontSize: 11, fontFamily: 'monospace', padding: '5px 12px', borderRadius: 8, pointerEvents: 'none' }}>
                      {lang === 'ru' ? 'Тапни по карте' : 'Tap the map'}
                    </div>
                  )}
                </div>
                <input
                  value={destQuery}
                  onChange={e => { setDestQuery(e.target.value); setEndPoint(null); }}
                  placeholder={lang === 'ru' ? 'или введи адрес...' : 'or type an address...'}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {destLoading && <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>{lang === 'ru' ? 'Поиск...' : 'Searching...'}</div>}
                {destResults.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {destResults.map((c, i) => (
                      <button key={i} onClick={() => { setEndPoint(c); setDestResults([]); setDestQuery(c.name); }}
                        style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.04)', border: 'none', color: '#ccc', cursor: 'pointer', opacity: 0.8 }}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                {endPoint && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#00ff88' }}>
                    <i className="fa-solid fa-check-circle"></i> {endPoint.name.split(',').slice(0, 2).join(',')}
                  </div>
                )}
                <button
                  disabled={!endPoint}
                  onClick={() => endPoint && startGenerating({ roundTrip: false, end: endPoint })}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px 0', borderRadius: 12, fontSize: 15, fontWeight: 700, marginTop: 16, opacity: endPoint ? 1 : 0.4 }}>
                  {lang === 'ru' ? 'Построить маршрут' : 'Build route'}
                </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
