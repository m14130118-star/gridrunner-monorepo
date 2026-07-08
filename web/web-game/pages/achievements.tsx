import { useEffect, useState } from 'react';
import { useT } from '../src/lib/i18n';
import { getApiUrl } from '../src/lib/api';
import { BackButton } from '../src/components/BackButton';

export default function Achievements() {
  const { lang } = useT();
  const [items, setItems] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('gridrunner_token');
    if (!token) return;
    fetch(getApiUrl() + '/api/v1/player/achievements/progress', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json()).then(d => { if (d.success) setItems(d.progress || []); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const earned = items.filter(a => a.earned).length;

  return (
    <div className="page" style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 80 }}>
      <BackButton />
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
        <i className="fa-solid fa-trophy" style={{ color: '#ffd740' }}></i> {lang === 'ru' ? 'Достижения' : 'Achievements'}
      </h1>
      <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 20, fontFamily: 'monospace' }}>{earned} / {items.length}</p>

      {loaded && items.length === 0 && (
        <p style={{ textAlign: 'center', opacity: 0.4, marginTop: 40 }}>{lang === 'ru' ? 'Пока пусто' : 'Nothing yet'}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((a: any, i: number) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', opacity: a.earned ? 1 : 0.55 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: a.earned ? 'rgba(255,215,64,0.14)' : 'rgba(255,255,255,0.04)',
              color: a.earned ? '#ffd740' : 'rgba(255,255,255,0.3)', fontSize: 16,
            }}>
              <i className={`fa-solid ${a.earned ? 'fa-trophy' : 'fa-lock'}`}></i>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{lang === 'ru' ? (a.titleRu || a.title) : (a.titleEn || a.title)}</div>
              <div style={{ fontSize: 11, opacity: 0.45 }}>{lang === 'ru' ? (a.descRu || a.desc) : (a.descEn || a.desc)}</div>
            </div>
            {!a.earned && a.stats && a.stats.current != null && a.stats.target != null && (
              <div style={{ fontSize: 11, opacity: 0.4, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{a.stats.current}/{a.stats.target}</div>
            )}
            {a.earned && <i className="fa-solid fa-circle-check" style={{ color: '#00e676' }}></i>}
          </div>
        ))}
      </div>
    </div>
  );
}
