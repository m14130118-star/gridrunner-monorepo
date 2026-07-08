import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { getApiUrl } from '../../src/lib/api';
import WireGame from '../../src/components/WireGame';

const TutorialMap = dynamic(() => import('../../src/components/TutorialMap'), { ssr: false });

// Миссия «Курс саботажника» — симуляция вне арены.
// Бэкенд эмулирует вражескую базу вокруг игрока: реальные мины и зоны не участвуют.

type Phase = 'intro' | 'ninja' | 'scan' | 'approach' | 'wires' | 'success' | 'fail';

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TutorialMission() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [ninja, setNinja] = useState(false);
  const [hp, setHp] = useState(100);
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [mine, setMine] = useState<[number, number] | null>(null);
  const [distToMine, setDistToMine] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [xpAwarded, setXpAwarded] = useState(0);
  const phaseRef = useRef<Phase>('intro');
  phaseRef.current = phase;

  // GPS-слежение
  useEffect(() => {
    if (!navigator.geolocation) { setGpsError('GPS недоступен на этом устройстве'); return; }
    const id = navigator.geolocation.watchPosition(
      p => setPos([p.coords.latitude, p.coords.longitude]),
      () => setGpsError('Нет доступа к GPS. Разреши геолокацию и перезайди в миссию.'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Симуляция износа HP в тылу врага: тикает после включения Режима Ниндзя
  useEffect(() => {
    if (!ninja || phase === 'success' || phase === 'fail') return;
    const iv = setInterval(() => {
      setHp(h => {
        const next = h - 1;
        if (next <= 0) {
          setPhase('fail');
          return 0;
        }
        return next;
      });
    }, 2500);
    return () => clearInterval(iv);
  }, [ninja, phase]);

  // Сближение с миной: <5 м → мини-игра
  useEffect(() => {
    if (phase !== 'approach' || !pos || !mine) return;
    const d = haversineM(pos[0], pos[1], mine[0], mine[1]);
    setDistToMine(Math.round(d));
    if (d < 5) setPhase('wires');
  }, [pos, mine, phase]);

  const toggleNinja = () => {
    if (ninja) return;
    setNinja(true);
    if (phase === 'ninja' || phase === 'intro') setPhase('scan');
  };

  const runScanner = async () => {
    if (!pos) return;
    const token = localStorage.getItem('gridrunner_token');
    try {
      const r = await fetch(getApiUrl() + '/api/v1/quests/tutorial/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ lat: pos[0], lng: pos[1] }),
      });
      const d = await r.json();
      if (d.success && d.mine) {
        setMine([d.mine.lat, d.mine.lng]);
        setPhase('approach');
      }
    } catch {}
  };

  const finishWires = async () => {
    setMine(null);
    const token = localStorage.getItem('gridrunner_token');
    try {
      const r = await fetch(getApiUrl() + '/api/v1/quests/tutorial/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      });
      const d = await r.json();
      if (d.success) setXpAwarded(d.xpAwarded || 0);
    } catch {}
    setPhase('success');
  };

  const sysBox = (text: string) => (
    <div style={{
      background: 'rgba(13,33,55,0.92)', border: '1px solid rgba(0,230,118,0.35)',
      borderRadius: 12, padding: '12px 14px', fontFamily: 'monospace', fontSize: 12.5,
      lineHeight: 1.5, color: '#eafff5',
    }}>
      {text}
    </div>
  );

  if (phase === 'intro') {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20, gap: 16, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, letterSpacing: 2, color: '#00e676', textAlign: 'center' }}>
          МИССИЯ: КУРС САБОТАЖНИКА
        </div>
        {sysBox('[СИСТЕМА]: Вы начали симуляцию проникновения. Это обучение — реальные мины и зоны не участвуют. Для поиска ловушек перейдите в Режим Ниндзя.')}
        {gpsError && <div style={{ color: '#ff5050', fontSize: 12, fontFamily: 'monospace' }}>{gpsError}</div>}
        <button className="btn btn-primary" disabled={!pos}
          onClick={() => setPhase('ninja')}
          style={{ padding: '14px 0', fontSize: 15, fontWeight: 800, borderRadius: 12, opacity: pos ? 1 : 0.5 }}>
          {pos ? 'НАЧАТЬ СИМУЛЯЦИЮ' : 'Ожидание GPS...'}
        </button>
        <button onClick={() => router.push('/missions')}
          style={{ background: 'none', border: 'none', color: '#8fa3b0', fontSize: 12, cursor: 'pointer', fontFamily: 'monospace' }}>
          Выйти
        </button>
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20, gap: 16, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, letterSpacing: 2, color: '#00e676', textAlign: 'center' }}>
          [МИССИЯ УСПЕШНО ВЫПОЛНЕНА]
        </div>
        {sysBox(`Ловушка деактивирована. В реальной игре на Арене в этот момент всей команде противника отправляется моментальное пуш-уведомление о том, что их защита пробита. Вы получили +${xpAwarded || 15} XP на общий уровень.`)}
        <button className="btn btn-primary" onClick={() => router.push('/missions')}
          style={{ padding: '14px 0', fontSize: 15, fontWeight: 800, borderRadius: 12 }}>
          ЗАВЕРШИТЬ
        </button>
      </div>
    );
  }

  if (phase === 'fail') {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20, gap: 16, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, letterSpacing: 2, color: '#ff0055', textAlign: 'center' }}>
          [СИМУЛЯЦИЯ ПРОВАЛЕНА]
        </div>
        {sysBox('HP упало до нуля. В тылу врага здоровье уходит постоянно — действуй быстро: нашёл мину, дошёл, разминировал. Попробуй ещё раз.')}
        <button className="btn btn-primary" onClick={() => { setHp(100); setNinja(false); setMine(null); setPhase('intro'); }}
          style={{ padding: '14px 0', fontSize: 15, fontWeight: 800, borderRadius: 12 }}>
          ПОВТОРИТЬ
        </button>
      </div>
    );
  }

  if (phase === 'wires') {
    return <WireGame onComplete={finishWires} subtitle="HP продолжает падать. Соединяй провода быстро." />;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#07090c' }}>
      {/* HUD */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${hp}%`, height: '100%', background: hp > 40 ? '#00e676' : '#ff0055', transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: hp > 40 ? '#00e676' : '#ff0055', fontWeight: 700, minWidth: 52 }}>HP {hp}</span>
        </div>
        {phase === 'ninja' && sysBox('[СИСТЕМА]: Для поиска ловушек перейдите в Режим Ниндзя.')}
        {phase === 'scan' && sysBox('[СИСТЕМА]: Режим маскировки активен. HP медленно снижается — это износ в тылу врага. Запустите Сканер для поиска скрытых угроз.')}
        {phase === 'approach' && sysBox(`[СИСТЕМА]: Ловушка обнаружена. Подойди к маркеру ногами. Дистанция: ${distToMine ?? '—'} м. Мини-игра откроется ближе 5 м.`)}
      </div>

      {/* Карта */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Загрузка карты...</div>}>
          {pos && <TutorialMap player={pos} mine={mine} locked={phase === 'ninja' && !ninja} />}
        </Suspense>
      </div>

      {/* Панель управления */}
      <div style={{ padding: '12px 12px calc(env(safe-area-inset-bottom, 0px) + 14px)', display: 'flex', gap: 10, zIndex: 600 }}>
        <button onClick={toggleNinja}
          style={{
            flex: 1, padding: '13px 0', borderRadius: 12, cursor: 'pointer',
            fontFamily: 'monospace', fontWeight: 800, fontSize: 13, letterSpacing: 1,
            background: ninja ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${ninja ? '#7c3aed' : 'rgba(255,255,255,0.15)'}`,
            color: ninja ? '#b794f6' : '#cfd8dc',
          }}>
          {ninja ? 'РЕЖИМ НИНДЗЯ: ВКЛ' : 'РЕЖИМ НИНДЗЯ: ВЫКЛ'}
        </button>
        <button onClick={runScanner} disabled={!ninja || phase !== 'scan'}
          style={{
            flex: 1, padding: '13px 0', borderRadius: 12,
            cursor: ninja && phase === 'scan' ? 'pointer' : 'default',
            fontFamily: 'monospace', fontWeight: 800, fontSize: 13, letterSpacing: 1,
            background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.4)',
            color: '#00e676', opacity: ninja && phase === 'scan' ? 1 : 0.35,
          }}>
          СКАНЕР
        </button>
      </div>
    </div>
  );
}
