import { useState, useEffect, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function GpsGuard({ children }: Props) {
  const [status, setStatus] = useState<'checking' | 'granted' | 'denied' | 'disabled'>('checking');

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('disabled');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => setStatus('granted'),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
        } else {
          setStatus('disabled');
        }
      },
      { timeout: 5000, enableHighAccuracy: true },
    );
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-cyan-400 font-mono">
        <div className="animate-pulse">СИНХРОНИЗАЦИЯ С ОРБИТАЛЬНЫМИ СПУТНИКАМИ...</div>
      </div>
    );
  }

  if (status === 'denied' || status === 'disabled') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-center font-mono border border-red-500">
        <div className="text-red-500 text-5xl mb-4"><i className="fa-solid fa-satellite-dish"></i></div>
        <h1 className="text-red-500 text-xl font-bold tracking-widest uppercase mb-2">Ошибка Навигации</h1>
        <p className="text-zinc-400 text-sm max-w-xs mb-6">
          {status === 'denied'
            ? 'GridRunner заблокирован. Разреши доступ к геолокации в настройках браузера/приложения.'
            : 'Сигнал GPS потерян. Включи геолокацию на телефоне и выйди из бункера.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-red-950 text-red-400 border border-red-600 rounded hover:bg-red-900 transition-all active:scale-95"
        >
          ПЕРЕПОДКЛЮЧИТЬСЯ
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
