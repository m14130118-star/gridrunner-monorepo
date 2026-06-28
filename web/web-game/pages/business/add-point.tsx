import { useState } from 'react';
import { useRouter } from 'next/router';
import { BackButton } from '../../src/components/BackButton';
import { getApiUrl } from '../../src/lib/api';
import dynamic from 'next/dynamic';

const PoiMap = dynamic(() => import('../../src/components/PoiMap'), { ssr: false });

export default function AddPointMap() {
  const router = useRouter();
  const [pos, setPos] = useState<any>(null);
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pos || !name) return;
    await fetch(getApiUrl() + '/api/v1/geo/poi/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('gridrunner_token') },
      body: JSON.stringify({ name, lat: pos.lat, lng: pos.lng })
    });
    router.push('/profile');
  };

  return (
    <div className="page" style={{ padding: '24px 16px' }}>
      <BackButton />
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Добавить локацию</h1>
      <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        <PoiMap center={[55.75, 37.61]} onClick={setPos} markerPos={pos} />
      </div>
      {pos && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="card" placeholder="Название места" value={name} onChange={e => setName(e.target.value)} />
          <button type="submit" className="btn btn-primary">Сохранить</button>
        </form>
      )}
    </div>
  );
}
