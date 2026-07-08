import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { BackButton } from '../../src/components/BackButton';
import { getApiUrl } from '../../src/lib/api';
import { useT } from '../../src/lib/i18n';
import dynamic from 'next/dynamic';

const PoiMap = dynamic(() => import('../../src/components/PoiMap'), { ssr: false });

const CATEGORIES = [
  { id: 'scenic', icon: 'fa-mountain', ru: 'Вид / панорама', en: 'Viewpoint' },
  { id: 'urban', icon: 'fa-spray-can', ru: 'Стрит-арт', en: 'Street art' },
  { id: 'food', icon: 'fa-utensils', ru: 'Еда / кафе', en: 'Food' },
  { id: 'park', icon: 'fa-tree', ru: 'Парк', en: 'Park' },
  { id: 'landmark', icon: 'fa-landmark', ru: 'Достопримечательность', en: 'Landmark' },
  { id: 'explore', icon: 'fa-compass', ru: 'Секретное место', en: 'Hidden spot' },
];

export default function AddPointMap() {
  const router = useRouter();
  const { lang } = useT();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [center, setCenter] = useState<[number, number]>([55.0302, 82.9204]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('scenic');
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [authed, setAuthed] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('gridrunner_token')) { setAuthed(false); return; }
    // Center on the player's real position so they pin places nearby
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCenter([p.coords.latitude, p.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pos || !name.trim()) return;
    setStatus('saving'); setErrMsg('');
    try {
      const r = await fetch(getApiUrl() + '/api/v1/geo/poi/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('gridrunner_token') },
        body: JSON.stringify({
          name: name.trim(), lat: pos.lat, lng: pos.lng,
          vibe_tags: ['#' + category],
          comment: category,
        }),
      });
      const d = await r.json();
      if (!d.success) { setStatus('error'); setErrMsg(d.message || 'Ошибка'); return; }
      setStatus('ok');
      setTimeout(() => router.push('/profile'), 1400);
    } catch (e: any) {
      setStatus('error'); setErrMsg(lang === 'ru' ? 'Нет связи с сервером' : 'Server unreachable');
    }
  };

  if (!authed) {
    return (
      <div className="page" style={{ padding: '24px 16px', textAlign: 'center' }}>
        <BackButton />
        <div style={{ marginTop: 60, opacity: 0.6, fontFamily: 'monospace' }}>
          <i className="fa-solid fa-lock" style={{ fontSize: 32, color: '#00e676' }}></i>
          <p style={{ marginTop: 12 }}>{lang === 'ru' ? 'Войди, чтобы добавлять места' : 'Sign in to add places'}</p>
          <button onClick={() => router.push('/auth/login')} className="btn btn-primary" style={{ marginTop: 16 }}>
            {lang === 'ru' ? 'Войти' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: '20px 16px', maxWidth: 560, margin: '0 auto' }}>
      <BackButton />
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{lang === 'ru' ? 'Добавить локацию' : 'Add a location'}</h1>
      <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 16, fontFamily: 'monospace' }}>
        {lang === 'ru' ? 'Тапни по карте, где находится место' : 'Tap the map where the place is'}
      </p>

      <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 16, border: '1px solid rgba(0,230,118,0.2)', position: 'relative' }}>
        <PoiMap center={center} onClick={(latlng: any) => setPos({ lat: latlng.lat, lng: latlng.lng })} markerPos={pos} />
        {!pos && (
          <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'rgba(4,16,10,0.85)', color: '#9fd4b4', fontSize: 11, fontFamily: 'monospace', padding: '5px 12px', borderRadius: 8, pointerEvents: 'none' }}>
            {lang === 'ru' ? 'Тапни по карте' : 'Tap the map'}
          </div>
        )}
      </div>

      {pos && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#00e676' }}>
            <i className="fa-solid fa-location-crosshairs"></i> {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
          </div>

          <input
            className="card"
            placeholder={lang === 'ru' ? 'Название места' : 'Place name'}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />

          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: '#00e676', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 8 }}>
              {lang === 'ru' ? 'Что это?' : 'What is it?'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              {CATEGORIES.map(c => {
                const active = category === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10,
                      cursor: 'pointer', textAlign: 'left', color: 'inherit', fontSize: 13,
                      background: active ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? 'rgba(0,230,118,0.35)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                    <i className={`fa-solid ${c.icon}`} style={{ color: active ? '#00e676' : 'rgba(255,255,255,0.4)', width: 16 }}></i>
                    {lang === 'ru' ? c.ru : c.en}
                  </button>
                );
              })}
            </div>
          </div>

          {status === 'error' && <p style={{ color: '#ff5252', fontSize: 13, textAlign: 'center' }}>{errMsg}</p>}
          {status === 'ok' && (
            <p style={{ color: '#00e676', fontSize: 14, textAlign: 'center', fontFamily: 'monospace' }}>
              <i className="fa-solid fa-circle-check"></i> {lang === 'ru' ? 'Отправлено на модерацию' : 'Sent for moderation'}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={!name.trim() || status === 'saving' || status === 'ok'}
            style={{ opacity: (!name.trim() || status === 'saving') ? 0.5 : 1 }}>
            {status === 'saving' ? (lang === 'ru' ? 'Сохраняем...' : 'Saving...') : (lang === 'ru' ? 'Добавить на карту' : 'Add to map')}
          </button>
        </form>
      )}
    </div>
  );
}
