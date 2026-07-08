import { useEffect, useMemo, useRef, useState } from 'react';

// Инженерный пульт: 4 разрезанных провода слева, 4 контакта справа.
// Drag-and-drop пальцем/мышью, провод соединяется только с контактом своего цвета.
// Используется и в обучении, и в арене при разминировании.

const COLORS = [
  { id: 'red', hex: '#ff3b30', name: 'Красный' },
  { id: 'blue', hex: '#3b82f6', name: 'Синий' },
  { id: 'green', hex: '#22c55e', name: 'Зелёный' },
  { id: 'yellow', hex: '#f5d90a', name: 'Жёлтый' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Props = {
  onComplete: () => void;
  title?: string;
  subtitle?: string;
};

export default function WireGame({ onComplete, title, subtitle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftOrder] = useState(() => shuffle(COLORS));
  const [rightOrder] = useState(() => shuffle(COLORS));
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<{ colorId: string; x: number; y: number } | null>(null);
  const doneRef = useRef(false);

  const leftRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const relPoint = (el: HTMLElement | null) => {
    const c = containerRef.current;
    if (!el || !c) return { x: 0, y: 0 };
    const cr = c.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 };
  };

  useEffect(() => {
    const allDone = COLORS.every(c => connected[c.id]);
    if (allDone && !doneRef.current) {
      doneRef.current = true;
      setTimeout(onComplete, 450);
    }
  }, [connected, onComplete]);

  const startDrag = (colorId: string) => (e: React.PointerEvent) => {
    if (connected[colorId]) return;
    e.preventDefault();
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    const c = containerRef.current!.getBoundingClientRect();
    setDrag({ colorId, x: e.clientX - c.left, y: e.clientY - c.top });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const c = containerRef.current?.getBoundingClientRect();
      if (!c) return;
      setDrag(d => d && { ...d, x: e.clientX - c.left, y: e.clientY - c.top });
    };
    const up = (e: PointerEvent) => {
      const target = rightRefs.current[drag.colorId];
      if (target) {
        const r = target.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        if (dist < 42) setConnected(prev => ({ ...prev, [drag.colorId]: true }));
      }
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [drag]);

  const lines = useMemo(() => {
    const out: Array<{ x1: number; y1: number; x2: number; y2: number; hex: string; glow: boolean }> = [];
    for (const c of COLORS) {
      const from = relPoint(leftRefs.current[c.id]);
      if (connected[c.id]) {
        const to = relPoint(rightRefs.current[c.id]);
        out.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, hex: c.hex, glow: true });
      } else if (drag?.colorId === c.id) {
        out.push({ x1: from.x, y1: from.y, x2: drag.x, y2: drag.y, hex: c.hex, glow: false });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, drag]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000, background: '#07090c',
      display: 'flex', flexDirection: 'column', touchAction: 'none', userSelect: 'none',
      fontFamily: 'monospace',
    }}>
      <div style={{ padding: '18px 16px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, color: '#00e676' }}>
          {title || 'ДЕАКТИВАЦИЯ ЛОВУШКИ'}
        </div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
          {subtitle || 'Соедини каждый провод с контактом его цвета'}
        </div>
      </div>

      <div ref={containerRef} style={{ flex: 1, position: 'relative', margin: '8px 8px 16px' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={l.hex} strokeWidth={5} strokeLinecap="round"
              style={l.glow ? { filter: `drop-shadow(0 0 6px ${l.hex})` } : { opacity: 0.85 }} />
          ))}
        </svg>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between' }}>
          {/* Провода (слева) */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', paddingLeft: 4 }}>
            {leftOrder.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <div style={{ width: 26, height: 14, background: c.hex, borderRadius: '3px 0 0 3px', opacity: 0.9 }} />
                <div
                  ref={el => { leftRefs.current[c.id] = el; }}
                  onPointerDown={startDrag(c.id)}
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: connected[c.id] ? c.hex : '#10151a',
                    border: `3px solid ${c.hex}`,
                    boxShadow: connected[c.id] ? `0 0 12px ${c.hex}` : 'none',
                    cursor: 'grab', touchAction: 'none',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Контакты (справа) */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', paddingRight: 4 }}>
            {rightOrder.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  ref={el => { rightRefs.current[c.id] = el; }}
                  style={{
                    width: 34, height: 34, borderRadius: 6,
                    background: connected[c.id] ? c.hex : '#10151a',
                    border: `3px solid ${c.hex}`,
                    boxShadow: connected[c.id] ? `0 0 12px ${c.hex}` : 'none',
                  }}
                />
                <div style={{ width: 26, height: 14, background: c.hex, borderRadius: '0 3px 3px 0', opacity: 0.9 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
