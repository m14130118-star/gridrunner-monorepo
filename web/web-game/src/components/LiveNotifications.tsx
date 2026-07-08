import { useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../lib/api';

// Polls GET /api/v1/events and renders game-styled toasts.
// Replaces WebSockets, which serverless Netlify Functions can't hold open.

type GameEvent = {
  id: string | number;
  type: string;
  payload: Record<string, any>;
  ts: number;
};

const POLL_MS = 15000;
const TOAST_MS = 6000;

function describe(e: GameEvent, lang: string): { icon: string; text: string } | null {
  const ru = lang === 'ru';
  const p = e.payload || {};
  switch (e.type) {
    case 'zone_captured':
      return { icon: '[ЗАХВАТ]', text: ru ? `${p.attacker} захватил зону твоей банды!` : `${p.attacker} captured your gang's zone!` };
    case 'zone_attacked':
      return { icon: '[ТРЕВОГА]', text: ru ? `${p.attacker} атакует вашу территорию` : `${p.attacker} is attacking your territory` };
    case 'territory_lost':
      return { icon: '[ПОТЕРЯ]', text: ru ? `${p.victim} погиб — банда потеряла ${p.zonesLost} зон` : `${p.victim} died — gang lost ${p.zonesLost} zones` };
    case 'trap_triggered':
      return { icon: '[МИНА]', text: ru ? `Твоя мина сработала на ${p.victim} (-${p.damage} HP)` : `Your mine hit ${p.victim} (-${p.damage} HP)` };
    case 'trade_received':
      return { icon: '[ТРЕЙД]', text: ru ? `Трейд от ${p.from} завершён` : `Trade from ${p.from} completed` };
    case 'elo_change':
      return { icon: '[ELO]', text: ru ? `${p.attacker} отбил твою зону: ${p.delta} ELO` : `${p.attacker} took your zone: ${p.delta} ELO` };
    case 'member_joined':
      return { icon: '[БАНДА]', text: ru ? `${p.username} вступил в банду` : `${p.username} joined the gang` };
    case 'mission_completed':
      return { icon: '[МИССИЯ]', text: ru ? `${p.title}: выполнено. +${p.xp} XP, +${p.coins} gridCoins` : `${p.title}: completed. +${p.xp} XP, +${p.coins} gridCoins` };
    case 'vip_expiring':
      return { icon: '[VIP]', text: ru ? `VIP заканчивается через ${p.daysLeft} дн. Продли подписку в разделе VIP` : `VIP expires in ${p.daysLeft} days. Renew in the VIP section` };
    case 'perimeter_breached':
      return { icon: '[ТРЕВОГА]', text: ru ? `Периметр сектора ${p.zoneName || p.zoneId} нарушен. Ловушка деактивирована противником. Защита базы ослаблена.` : `Sector ${p.zoneName || p.zoneId} perimeter breached. A trap was deactivated. Base defense weakened.` };
    default:
      return null;
  }
}

export default function LiveNotifications() {
  const [toasts, setToasts] = useState<Array<GameEvent & { key: number }>>([]);
  const sinceRef = useRef<number>(Date.now());
  const keyRef = useRef(0);

  useEffect(() => {
    let stopped = false;

    const poll = async () => {
      const token = localStorage.getItem('gridrunner_token');
      if (!token || stopped) return;
      try {
        const r = await fetch(`${getApiUrl()}/api/v1/events?since=${sinceRef.current}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (!d.success || stopped) return;
        sinceRef.current = d.now || Date.now();
        const fresh: Array<GameEvent & { key: number }> = (d.events || []).map((e: GameEvent) => ({ ...e, key: ++keyRef.current }));
        if (fresh.length > 0) {
          setToasts(prev => [...prev, ...fresh].slice(-4));
          fresh.forEach(f => setTimeout(() => {
            setToasts(prev => prev.filter(t => t.key !== f.key));
          }, TOAST_MS));
        }
      } catch {}
    };

    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => { stopped = true; clearInterval(iv); };
  }, []);

  const lang = typeof localStorage !== 'undefined' ? (localStorage.getItem('gridrunner_lang') || 'ru') : 'ru';
  const visible = toasts.map(t => ({ t, d: describe(t, lang) })).filter(x => x.d);
  if (visible.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: '50%',
      transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column',
      gap: 8, width: 'min(92vw, 380px)', pointerEvents: 'none',
    }}>
      {visible.map(({ t, d }) => (
        <div key={t.key} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(13, 33, 55, 0.92)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0, 230, 118, 0.35)', borderRadius: 14,
          padding: '10px 14px', color: '#eafff5',
          fontFamily: 'monospace', fontSize: 13, lineHeight: 1.35,
          boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 0 12px rgba(0,230,118,0.12)',
          animation: 'gr-toast-in 0.25s ease-out',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#00e676', whiteSpace: 'nowrap' }}>{d!.icon}</span>
          <span>{d!.text}</span>
        </div>
      ))}
      <style jsx>{`
        @keyframes gr-toast-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
