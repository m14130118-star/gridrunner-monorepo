import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const LOADING_MESSAGES = [
  "Сканируем местность...",
  "Ищем лучший бургер под твой бюджет...",
  "Связываемся со спутниками...",
  "Прокладываем неоновый след...",
  "Загружаем вайб текстолита и гранжа..."
];

export default function GeneratingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    // В будущем здесь будет вызов API генерации маршрута
    const timer = setTimeout(() => {
        router.push('/trip/active');
    }, 6000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [router]);

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
