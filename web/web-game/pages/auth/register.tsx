import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useT } from '../../src/lib/i18n';
import { getApiUrl } from '../../src/lib/api';
import Link from 'next/link';

const VIBES = [
  { id: 'aggressive', icon: 'fa-bolt', ru: 'Агрессивный', en: 'Aggressive', descRu: 'Быстрые биты, резкие повороты', descEn: 'Fast beats, sharp turns' },
  { id: 'cruise', icon: 'fa-road', ru: 'Круиз', en: 'Cruise', descRu: 'Плавные линии, дальние прямые', descEn: 'Smooth lines, long straights' },
  { id: 'dark', icon: 'fa-moon', ru: 'Ночной', en: 'Dark', descRu: 'Индустриальные пейзажи, тени', descEn: 'Industrial landscapes, shadows' },
  { id: 'scenic', icon: 'fa-mountain', ru: 'Панорамный', en: 'Scenic', descRu: 'Виды, набережные, парки', descEn: 'Views, embankments, parks' },
  { id: 'urban', icon: 'fa-city', ru: 'Урбан', en: 'Urban', descRu: 'Граффити, дворы, стрит-арт', descEn: 'Graffiti, courtyards, street art' },
  { id: 'explore', icon: 'fa-compass', ru: 'Исследователь', en: 'Explorer', descRu: 'Новые места, случайные тропы', descEn: 'New places, random paths' },
];

export default function Register() {
  const { t, lang } = useT();
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'vibes'>('form');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('gridrunner_user')) router.push('/profile');
  }, [router]);

  const toggleVibe = (id: string) => {
    setSelectedVibes(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !username) { setError(lang === 'ru' ? 'Заполните все поля' : 'Fill all fields'); return; }
    if (password.length < 4) { setError(lang === 'ru' ? 'Пароль минимум 4 символа' : 'Password min 4 chars'); return; }
    setLoading(true);
    try {
      const r = await fetch(getApiUrl() + '/api/v1/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await r.json();
      if (!data.success) { setError(data.message); return; }
      const u = { id: data.user.id, username: data.user.username, email: data.user.email, vip: false, level: 1, gold: 0, xp: 0 };
      localStorage.setItem('gridrunner_user', JSON.stringify(u));
      localStorage.setItem('gridrunner_token', data.token);
      localStorage.setItem('gridrunner_vibes', JSON.stringify(selectedVibes));
      window.dispatchEvent(new Event('user-update'));
      setStep('vibes');
    } catch (e: any) {
      setError(e.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'vibes') {
    return (
      <div style={{ background: 'linear-gradient(180deg, #0a1a0f 0%, #0d2415 100%)', color: '#e0f0e0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 480, padding: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🎧</span>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{lang === 'ru' ? 'Какой твой вайб?' : 'What\'s your vibe?'}</h2>
          <p style={{ fontSize: 13, opacity: 0.4, marginBottom: 20 }}>
            {lang === 'ru' ? 'Выбери 2-3 стиля, чтобы алгоритм подбирал маршруты под твой вкус' : 'Pick 2-3 styles so the algorithm tailors routes to your taste'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {VIBES.map(v => {
              const active = selectedVibes.includes(v.id);
              return (
                <button key={v.id} onClick={() => toggleVibe(v.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    borderRadius: 12, cursor: 'pointer', textAlign: 'left', color: 'inherit',
                    fontFamily: 'inherit', fontSize: 'inherit', width: '100%',
                    background: active ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? 'rgba(0,230,118,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? '#00e676' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fa-solid ${v.icon}`} style={{ fontSize: 16, color: active ? '#000' : 'rgba(255,255,255,0.3)' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{lang === 'ru' ? v.ru : v.en}</div>
                    <div style={{ fontSize: 11, opacity: 0.4 }}>{lang === 'ru' ? v.descRu : v.descEn}</div>
                  </div>
                  {active && <i className="fa-solid fa-check" style={{ color: '#00e676', fontSize: 14 }}></i>}
                </button>
              );
            })}
          </div>
          <button onClick={() => router.push('/profile')} disabled={selectedVibes.length === 0}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 14, opacity: selectedVibes.length === 0 ? 0.4 : 1, cursor: selectedVibes.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            {lang === 'ru' ? 'Начать' : 'Let\'s go!'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(180deg, #0a1a0f 0%, #0d2415 100%)', color: '#e0f0e0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t('auth.register_title')}</h2>
        <p style={{ fontSize: 13, opacity: 0.4, marginBottom: 20 }}>{lang === 'ru' ? 'Создай аккаунт для игры и сайта' : 'Create an account for both game & site'}</p>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="text" placeholder={t('auth.username')} value={username} onChange={e => setUsername(e.target.value)} required />
          <input type="email" placeholder={t('auth.email')} value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder={t('auth.password')} value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p style={{ color: '#ff5252', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
            {loading ? (lang === 'ru' ? 'Регистрация...' : 'Registering...') : t('auth.register_title')}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, opacity: 0.5, fontSize: 13 }}>
          {lang === 'ru' ? 'Уже есть аккаунт?' : 'Have an account?'}{' '}
          <Link href="/auth/login" style={{ color: '#00e676', textDecoration: 'none' }}>{t('auth.login_title')}</Link>
        </p>
      </div>
    </div>
  );
}
