import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { BackButton } from '../../src/components/BackButton';
import { getApiUrl } from '../../src/lib/api';

type Mission = {
  id: string;
  group: 'contract' | 'operation' | 'directive';
  title: string;
  desc: string;
  reward: { coins?: number; xp?: number; supply?: number };
  status: 'available' | 'active' | 'completed';
  progress: number;
  target: number;
};

const GROUPS: Array<{ key: Mission['group']; label: string; color: string }> = [
  { key: 'contract', label: 'ТАКТИЧЕСКИЕ КОНТРАКТЫ', color: '#00e676' },
  { key: 'operation', label: 'БОЕВЫЕ ОПЕРАЦИИ', color: '#ff0055' },
  { key: 'directive', label: 'ФРАКЦИОННЫЕ ДИРЕКТИВЫ', color: '#7c3aed' },
];

export default function MissionsPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const token = localStorage.getItem('gridrunner_token');
    if (!token) { router.push('/auth/login'); return; }
    try {
      const r = await fetch(getApiUrl() + '/api/v1/quests', { headers: { Authorization: 'Bearer ' + token } });
      const d = await r.json();
      if (d.success) {
        setMissions(d.missions || []);
        setTutorialDone(!!d.tutorial?.completed);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const acceptMission = async (id: string) => {
    setBusy(id);
    const token = localStorage.getItem('gridrunner_token');
    try {
      await fetch(getApiUrl() + '/api/v1/quests/accept/' + id, {
        method: 'POST', headers: { Authorization: 'Bearer ' + token },
      });
      await load();
    } catch {}
    setBusy(null);
  };

  return (
    <div className="page" style={{ padding: '24px 16px 120px', maxWidth: 560, margin: '0 auto' }}>
      <BackButton />
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, fontFamily: 'monospace', letterSpacing: 1 }}>
        КАМПАНИЯ
      </h1>
      <p style={{ fontSize: 12, opacity: 0.4, marginBottom: 20 }}>
        Обучение и контракты. Награды идут на общий уровень аккаунта.
      </p>

      {/* Обучение */}
      <div
        onClick={() => router.push('/missions/tutorial')}
        className="card card-hover"
        style={{
          padding: 16, marginBottom: 24, cursor: 'pointer',
          border: `1px solid ${tutorialDone ? 'rgba(0,230,118,0.4)' : 'rgba(124,58,237,0.5)'}`,
          background: tutorialDone ? 'rgba(0,230,118,0.04)' : 'rgba(124,58,237,0.06)',
          borderRadius: 14,
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, color: '#b794f6', marginBottom: 4 }}>ОБУЧЕНИЕ</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Курс саботажника</div>
            <div style={{ fontSize: 11.5, opacity: 0.5, marginTop: 4, lineHeight: 1.4 }}>
              Режим Ниндзя, Сканер и разминирование — безопасная симуляция вне Арены. Бесплатно.
            </div>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: tutorialDone ? '#00e676' : '#b794f6', whiteSpace: 'nowrap', marginLeft: 12 }}>
            {tutorialDone ? 'ПРОЙДЕНО' : '+15 XP'}
          </div>
        </div>
      </div>

      {loading && <div style={{ opacity: 0.4, fontSize: 13 }}>Загрузка миссий...</div>}

      {GROUPS.map(g => {
        const list = missions.filter(m => m.group === g.key);
        if (list.length === 0) return null;
        return (
          <div key={g.key} style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, color: g.color, marginBottom: 10, fontWeight: 700 }}>
              {g.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map(m => (
                <div key={m.id} className="card" style={{
                  padding: 14, borderRadius: 12,
                  border: m.status === 'active' ? `1px solid ${g.color}` : '1px solid var(--border, rgba(255,255,255,0.08))',
                  borderLeft: m.status === 'active' ? `4px solid ${g.color}` : undefined,
                  background: m.status === 'active' ? `${g.color}0d` : undefined,
                  boxShadow: m.status === 'active' ? `0 0 14px ${g.color}22` : undefined,
                  opacity: m.status === 'completed' ? 0.55 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{m.title}</div>
                      <div style={{ fontSize: 11.5, opacity: 0.5, marginTop: 4, lineHeight: 1.45 }}>{m.desc}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, marginTop: 8, color: g.color }}>
                        +{m.reward.coins || 0} gridCoins · +{m.reward.xp || 0} XP
                        {m.reward.supply ? ` · +${m.reward.supply} снабжение` : ''}
                      </div>
                      {m.status === 'active' && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, Math.round((m.progress / Math.max(1, m.target)) * 100))}%`, height: '100%', background: g.color }} />
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 3, fontFamily: 'monospace' }}>
                            Прогресс: {m.progress}/{m.target} — засчитывается автоматически в трипах и на Арене
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      {m.status === 'available' && (
                        <button onClick={() => acceptMission(m.id)} disabled={busy === m.id}
                          style={{
                            padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                            background: `${g.color}18`, border: `1px solid ${g.color}66`, color: g.color,
                            fontFamily: 'monospace', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap',
                          }}>
                          {busy === m.id ? '...' : 'ВЗЯТЬ'}
                        </button>
                      )}
                      {m.status === 'active' && (
                        <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: g.color, padding: '4px 8px', border: `1px solid ${g.color}44`, borderRadius: 8 }}>АКТИВНА</span>
                      )}
                      {m.status === 'completed' && (
                        <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#00e676', padding: '4px 8px', border: '1px solid rgba(0,230,118,0.3)', borderRadius: 8 }}>ГОТОВО</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
