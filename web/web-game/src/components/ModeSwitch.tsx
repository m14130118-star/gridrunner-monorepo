import { useEffect, useRef, useState } from 'react';

interface Props {
  isArena: boolean;
  onChange: (val: boolean) => void;
}

export default function ModeSwitch({ isArena, onChange }: Props) {
  const [animating, setAnimating] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playFilterEffect = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
      filter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.7);
    } catch {}
  };

  const handleToggle = () => {
    setAnimating(true);
    playFilterEffect();
    setTimeout(() => {
      onChange(!isArena);
      setAnimating(false);
    }, 400);
  };

  return (
    <button className={`mode-switch ${isArena ? 'arena' : 'chill'} ${animating ? 'switch-anim' : ''}`}
      onClick={handleToggle}
      title={isArena ? 'Switch to Chill' : 'Switch to Arena'}
    >
      <div className="mode-track">
        <div className="mode-thumb">
          {isArena ? '⚔️' : '🌿'}
        </div>
      </div>
      <span className="mode-label">{isArena ? 'ARENA' : 'CHILL'}</span>
      <style jsx>{`
        .mode-switch {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 4px 12px 4px 4px;
          cursor: pointer;
          transition: all 0.3s;
          color: var(--text);
        }
        .mode-switch.chill { border-color: rgba(0, 230, 118, 0.3); }
        .mode-switch.arena { border-color: rgba(255, 82, 82, 0.3); }
        .mode-switch.switch-anim { transform: scale(0.95); }
        .mode-track {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        .chill .mode-track { background: rgba(0, 230, 118, 0.15); }
        .arena .mode-track { background: rgba(255, 82, 82, 0.15); }
        .mode-thumb { font-size: 16px; line-height: 1; }
        .mode-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .chill .mode-label { color: #00e676; }
        .arena .mode-label { color: #ff5252; }
      `}</style>
    </button>
  );
}
