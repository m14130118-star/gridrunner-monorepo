import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import MapWrapper from '../../src/components/MapWrapper';
import { useT } from '../../src/lib/i18n';

const ADMIN_USER = 'hexvel';
const ADMIN_PASS = 'gridadmin2024';

interface Analytics {
  total_visitors: number; unique_players: number;
  checkins_today: number; checkins_week: number; checkins_month: number;
  hourly: { hour: number; count: number }[];
  daily: { date: string; count: number }[];
}

export default function AdminDashboard() {
  const { t, lang } = useT();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const u = localStorage.getItem('gridrunner_user');
      if (u) {
        const p = JSON.parse(u);
        if (p.username === ADMIN_USER) setAuthed(true);
        else { router.replace('/profile'); return; }
      } else { router.replace('/auth/login'); return; }
    } catch { router.replace('/profile'); return; }
  }, [router]);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed]);

  const fetchData = () => {
    try {
      setLoading(true);
      const ratings = JSON.parse(localStorage.getItem('gridrunner_ratings') || '[]');
      const users = JSON.parse(localStorage.getItem('gridrunner_users') || '[]');
      const hourly: { hour: number; count: number }[] = Array.from({length:24}, (_,i)=>({hour:i,count:0}));
      const daily: { date: string; count: number }[] = [];
      for (const r of ratings as any[]) {
        if (!r.date) continue;
        const d = new Date(r.date);
        const key = d.toISOString().slice(0,10);
        const h = d.getHours();
        hourly[h].count++;
        const day = daily.find(dd => dd.date === key);
        if (day) day.count++; else daily.push({date:key,count:1});
      }
      daily.sort((a,b) => a.date.localeCompare(b.date));
      setData({
        total_visitors: ratings.length, unique_players: users.length || 1,
        checkins_today: ratings.filter((r: any) => r.date && new Date(r.date).toDateString() === new Date().toDateString()).length,
        checkins_week: ratings.filter((r: any) => r.date && Date.now() - r.date < 604800000).length,
        checkins_month: ratings.filter((r: any) => r.date && Date.now() - r.date < 2592000000).length,
        hourly, daily,
      });
    } catch {} finally { setLoading(false); }
  };

  const saveLocation = () => {
    if (!selectedPos) return;
    setSaving(true);
    try {
      const cps = JSON.parse(localStorage.getItem('gridrunner_checkpoints') || '[]');
      cps.push({ lat: selectedPos[0], lng: selectedPos[1], ts: Date.now() });
      localStorage.setItem('gridrunner_checkpoints', JSON.stringify(cps));
      setSaved(true); fetchData(); setTimeout(() => setSaved(false), 2000);
    } catch {} finally { setSaving(false); }
  };

  if (!authed) return null;

  const maxHourly = data ? Math.max(...data.hourly.map(h => h.count), 1) : 1;
  const stats = data ? [
    { label: t('admin.today'), value: data.checkins_today, color: '#00e676' },
    { label: t('admin.week'), value: data.checkins_week, color: '#69f0ae' },
    { label: t('admin.month'), value: data.checkins_month, color: '#ffd740' },
    { label: t('admin.visitors'), value: data.total_visitors, color: '#ff9100' },
  ] : [];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, background: 'linear-gradient(135deg, #00e676, #69f0ae)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('admin.title')}</h1>
          <p style={{ opacity: 0.4, fontSize: 14 }}>{t('admin.desc')}</p>
        </div>
        <button onClick={fetchData} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 16px', color: 'inherit', cursor: 'pointer', fontSize: 13 }}> {t('admin.refresh')}</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, opacity: 0.3 }}>{t('common.loading')}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 24 }}>
            {stats.map(s => (
              <div key={s.label} style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                <div style={{ fontSize: 12, opacity: 0.4, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('admin.hourly')}</h2>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
                {data && data.hourly.map(d => (
                  <div key={d.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', borderRadius: '4px 4px 0 0', height: `${(d.count / maxHourly) * 100}%`, background: 'linear-gradient(to top, #00e676, #69f0ae)', minHeight: 2 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, opacity: 0.3 }}><span>0:00</span><span>12:00</span><span>23:00</span></div>
            </div>
            <div style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('admin.new_point')}</h2>
              <MapWrapper center={selectedPos || [55.75, 37.62]} onClick={(c) => setSelectedPos(c)} height={250} checkpoints={selectedPos ? [{coords: selectedPos, name: ''}] : []} />
              {selectedPos && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, opacity: 0.6, flexWrap: 'wrap' }}>
                  <span>{selectedPos[0].toFixed(6)}, {selectedPos[1].toFixed(6)}</span>
                  <button onClick={saveLocation} disabled={saving} style={{ background: saved ? 'rgba(0,230,118,0.2)' : '#00e676', color: saved ? '#00e676' : '#000', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {saving ? '...' : saved ? ` ${t('admin.saved')}` : t('admin.save')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{t('admin.unique')}</h2>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#00e676' }}>{data ? data.unique_players : '—'}</div>
          </div>
        </>
      )}
    </div>
  );
}
