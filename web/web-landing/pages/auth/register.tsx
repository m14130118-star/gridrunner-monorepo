import { useEffect } from 'react';

const GAME_URL = 'https://game-gridrunner.vercel.app';

// Registration lives in the game app (single source of truth, incl. access code).
// Forward here so any old link keeps working, preserving a ?ref= referral code.
export default function RegisterRedirect() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    window.location.replace(`${GAME_URL}/auth/register${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#081827', color: '#00e676', fontFamily: 'monospace', letterSpacing: 2 }}>
      GRIDRUNNER — переход к регистрации...
    </div>
  );
}
