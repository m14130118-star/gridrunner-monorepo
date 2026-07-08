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
  const [inviteCode, setInviteCode] = useState('');
  const [codeState, setCodeState] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [myCode, setMyCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('gridrunner_user')) router.push('/profile');
    // Prefill code from a referral link ?ref=CODE
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) setInviteCode(ref.toUpperCase());
  }, [router]);

  // Live-validate the access code (debounced)
  useEffect(() => {
    const code = inviteCode.trim();
    if (code.length < 4) { setCodeState('idle'); setInvitedBy(null); return; }
    setCodeState('checking');
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(getApiUrl() + '/api/v1/auth/check-code?code=' + encodeURIComponent(code));
        const d = await r.json();
        if (!d.requireInvite) { setCodeState('valid'); return; }
        setCodeState(d.valid ? 'valid' : 'invalid');
        setInvitedBy(d.invitedBy || null);
      } catch { setCodeState('idle'); }
    }, 450);
    return () => clearTimeout(timer);
  }, [inviteCode]);

  const toggleVibe = (id: string) => {
    setSelectedVibes(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !username) { setError(lang === 'ru' ? 'Заполните все поля' : 'Fill all fields'); return; }
    if (password.length < 4) { setError(lang === 'ru' ? 'Пароль минимум 4 символа' : 'Password min 4 chars'); return; }
    // Код не обязателен — ругаемся только если введён и явно неверный
    if (inviteCode.trim() && codeState === 'invalid') {
      setError(lang === 'ru' ? 'Код не найден. Оставь поле пустым или проверь код' : 'Code not found. Leave empty or check the code'); return;
    }
    setLoading(true);
    try {
      const r = await fetch(getApiUrl() + '/api/v1/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, inviteCode: inviteCode.trim() }),
      });
      const data = await r.json();
      if (!data.success) { setError(data.message); return; }
      const u = { id: data.user.id, username: data.user.username, email: data.user.email, vip: false, level: 1, gold: 0, xp: 0, invite_code: data.inviteCode };
      localStorage.setItem('gridrunner_user', JSON.stringify(u));
      localStorage.setItem('gridrunner_token', data.token);
      localStorage.setItem('gridrunner_vibes', JSON.stringify(selectedVibes));
      setMyCode(data.inviteCode || '');
      setNeedsVerification(!!data.needsVerification);
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
          {/* Email verification notice */}
          {needsVerification && (
            <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,213,79,0.08)', border: '1px solid rgba(255,213,79,0.3)', textAlign: 'left' }}>
              <div style={{ color: '#ffd54f', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                <i className="fa-solid fa-envelope"></i> {lang === 'ru' ? 'Подтверди почту' : 'Verify your email'}
              </div>
              <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>
                {lang === 'ru' ? `Мы отправили ссылку на ${email}. Подтверди, чтобы входить с любого устройства.` : `We sent a link to ${email}. Confirm it to sign in from any device.`}
              </p>
            </div>
          )}

          {/* Personal invite code to share */}
          {myCode && (
            <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.25)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: '#00e676', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 8 }}>
                {lang === 'ru' ? 'Твой код для друзей' : 'Your invite code'}
              </div>
              <button
                onClick={() => {
                  const link = `${window.location.origin}/auth/register?ref=${myCode}`;
                  navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,230,118,0.2)', color: '#e0f0e0',
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 800, letterSpacing: 6, color: '#00e676', textShadow: '0 0 12px rgba(0,230,118,0.5)' }}>{myCode}</span>
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i> {copied ? (lang === 'ru' ? 'Скопировано' : 'Copied') : (lang === 'ru' ? 'Ссылка' : 'Link')}
                </span>
              </button>
              <div style={{ fontSize: 11, opacity: 0.45, marginTop: 8 }}>
                {lang === 'ru' ? `Зови друзей — за каждого +200 монет` : `Invite friends — +200 coins each`}
              </div>
            </div>
          )}
          <div style={{ display: 'inline-flex', width: 48, height: 48, marginBottom: 12, borderRadius: 12, background: 'rgba(0,230,118,0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-headphones" style={{ fontSize: 22, color: '#00e676' }}></i>
          </div>
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
          <button onClick={() => router.push('/missions/tutorial')} disabled={selectedVibes.length === 0}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 14, opacity: selectedVibes.length === 0 ? 0.4 : 1, cursor: selectedVibes.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            {lang === 'ru' ? 'Пройти обучение' : 'Start tutorial'}
          </button>
          <button onClick={() => router.push('/profile')} disabled={selectedVibes.length === 0}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', padding: 10, marginTop: 8, opacity: selectedVibes.length === 0 ? 0.3 : 0.7 }}
          >
            {lang === 'ru' ? 'Пропустить — сразу в игру' : 'Skip — straight to the game'}
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

          {/* Access code gate */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: '#00e676', fontFamily: 'monospace', marginBottom: 6, textTransform: 'uppercase' }}>
              {lang === 'ru' ? 'Код друга (необязательно)' : 'Friend\'s code (optional)'}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={lang === 'ru' ? 'Есть код друга? Введи его' : 'Have a friend\'s code? Enter it'}
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                style={{
                  width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: 3,
                  textTransform: 'uppercase', paddingRight: 40,
                  borderColor: codeState === 'valid' ? '#00e676' : codeState === 'invalid' ? '#ff5252' : undefined,
                  boxShadow: codeState === 'valid' ? '0 0 0 1px #00e676, 0 0 14px rgba(0,230,118,0.25)' : undefined,
                }}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>
                {codeState === 'checking' && <i className="fa-solid fa-circle-notch fa-spin" style={{ color: '#888' }}></i>}
                {codeState === 'valid' && <i className="fa-solid fa-circle-check" style={{ color: '#00e676' }}></i>}
                {codeState === 'invalid' && <i className="fa-solid fa-circle-xmark" style={{ color: '#ff5252' }}></i>}
              </span>
            </div>
            {codeState === 'valid' && invitedBy && (
              <div style={{ fontSize: 11, color: '#00e676', marginTop: 5, fontFamily: 'monospace' }}>
                <i className="fa-solid fa-user-plus"></i> {lang === 'ru' ? `Приглашение от ${invitedBy}` : `Invited by ${invitedBy}`}
              </div>
            )}
            {codeState === 'invalid' && (
              <div style={{ fontSize: 11, color: '#ff5252', marginTop: 5, fontFamily: 'monospace' }}>
                {lang === 'ru' ? 'Код не найден' : 'Code not found'}
              </div>
            )}
          </div>

          {error && <p style={{ color: '#ff5252', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
            {loading ? (lang === 'ru' ? 'Регистрация...' : 'Registering...') : t('auth.register_title')}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, opacity: 0.5, fontSize: 13 }}>
          {lang === 'ru' ? 'Уже есть аккаунт?' : 'Have an account?'}{' '}
          <Link href="/auth/login" style={{ color: '#00e676', textDecoration: 'none' }}>{t('auth.login_title')}</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 14, fontSize: 10.5, lineHeight: 1.6, opacity: 0.35 }}>
          {lang === 'ru' ? 'Регистрируясь, ты принимаешь ' : 'By registering you accept the '}
          <a href="https://telegra.ph/Polzovatelskoe-soglashenie-04-01-19" target="_blank" rel="noopener noreferrer" style={{ color: '#00e676', textDecoration: 'none' }}>
            {lang === 'ru' ? 'пользовательское соглашение' : 'terms of service'}
          </a>
          {lang === 'ru' ? ' и ' : ' and '}
          <a href="https://telegra.ph/Politika-konfidencialnosti-06-21-31" target="_blank" rel="noopener noreferrer" style={{ color: '#00e676', textDecoration: 'none' }}>
            {lang === 'ru' ? 'политику конфиденциальности' : 'privacy policy'}
          </a>
        </p>
      </div>
    </div>
  );
}
