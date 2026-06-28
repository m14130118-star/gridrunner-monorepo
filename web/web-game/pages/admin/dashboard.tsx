import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { BackButton } from '../../src/components/BackButton';
import { getApiUrl } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth-context';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user?.role !== 'admin') { router.push('/profile'); return; }
    fetch(getApiUrl() + '/api/v1/admin/stats', { headers: { Authorization: 'Bearer ' + localStorage.getItem('gridrunner_token') } })
      .then(r => r.json()).then(d => { if (d.success) setStats(d.stats); });
  }, [user, router]);

  if (!stats) return <div className="page">Loading...</div>;

  return (
    <div className="page" style={{ padding: '24px 16px' }}>
      <BackButton />
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Админка</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card"><h3>Онлайн</h3><p style={{ fontSize: 24 }}>{stats.online}</p></div>
        <div className="card"><h3>Трипов сегодня</h3><p style={{ fontSize: 24 }}>{stats.tripsToday}</p></div>
      </div>
    </div>
  );
}
