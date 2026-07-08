import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTrip } from '../../src/lib/trip-context';
import { getApiUrl } from '../../src/lib/api';

const LOADING_MESSAGES = [
  "Сканируем местность...",
  "Ищем лучший бургер под твой бюджет...",
  "Связываемся со спутниками...",
  "Прокладываем неоновый след...",
  "Загружаем вайб текстолита и гранжа..."
];

export default function GeneratingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState('');
  const router = useRouter();
  const { wizard, setTrip } = useTrip();

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    if (!wizard) {
      router.push('/trip/new');
      return;
    }

    const token = localStorage.getItem('gridrunner_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const body = {
      lat: wizard.startLat,
      lng: wizard.startLng,
      transport: wizard.vehicle || 'feet',
      userVibes: [wizard.vibe],
      durationMinutes: wizard.duration,
      eat: wizard.eat,
      roundTrip: wizard.roundTrip,
      endPoint: wizard.endLat != null && wizard.endLng != null
        ? { lat: wizard.endLat, lng: wizard.endLng }
        : null,
    };

    fetch(getApiUrl() + '/api/v1/geo/route/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.checkpoints && data.checkpoints.length > 0) {
          setTrip(data);
          localStorage.setItem('gridrunner_trip_waypoints', JSON.stringify(data));
          router.push('/trip/active');
        } else {
          setError('Не удалось построить маршрут');
        }
      })
      .catch(() => setError('Ошибка сети'));

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div style={styles.loaderContainer}>
        <div style={{ color: '#ff5050', marginBottom: 16 }}>{error}</div>
        <button onClick={() => router.push('/trip/new')} style={{ padding: '10px 24px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div style={styles.loaderContainer}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes loadingBar { 0% { width: 0%; } 100% { width: 100%; } }
      `}</style>
      <div style={styles.glitchCyberSpinner}></div>
      <h2 style={styles.loadingText}>{LOADING_MESSAGES[messageIndex]}</h2>
      <div style={styles.progressBarBg}>
        <div style={styles.progressBarFill}></div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loaderContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0a0a0c', color: '#00ffcc', fontFamily: 'monospace' },
  glitchCyberSpinner: { width: '60px', height: '60px', border: '4px double #ff0055', borderTopColor: '#00ffcc', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '25px' },
  loadingText: { fontSize: '16px', letterSpacing: '1px', textAlign: 'center', minHeight: '40px', padding: '0 20px' },
  progressBarBg: { width: '200px', height: '4px', backgroundColor: '#222', borderRadius: '2px', overflow: 'hidden', marginTop: '10px' },
  progressBarFill: { width: '100%', height: '100%', backgroundColor: '#ff0055', animation: 'loadingBar 4s infinite ease-in-out' }
};
