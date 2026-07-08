import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useT } from '../../src/lib/i18n';
import { getApiUrl } from '../../src/lib/api';
import Link from 'next/link';

export default function LoginPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needVerify, setNeedVerify] = useState(false);
  const [notice, setNotice] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    if (localStorage.getItem('gridrunner_user')) { router.push('/profile'); return; }
    // Banner from the email-verification redirect (?verify=ok|invalid)
    const v = new URLSearchParams(window.location.search).get('verify');
    if (v === 'ok') setNotice(lang === 'ru' ? 'Почта подтверждена! Войди в аккаунт' : 'Email verified! Sign in');
    else if (v === 'invalid') setNotice(lang === 'ru' ? 'Ссылка недействительна или устарела' : 'Link invalid or expired');
  }, [router, lang]);

  const resendVerification = async () => {
    if (resendState === 'sending' || !email) return;
    setResendState('sending');
    try {
      const r = await fetch(getApiUrl() + '/api/v1/auth/resend-verification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (d.success) setResendState('sent');
      else { setError(d.message || 'Ошибка'); setResendState('idle'); }
    } catch { setResendState('idle'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setNeedVerify(false);
    if (!email || !password) { setError(lang === 'ru' ? 'Заполните все поля' : 'Fill all fields'); return; }
    setLoading(true);
    try {
      const r = await fetch(getApiUrl() + '/api/v1/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!data.success) {
        if (data.code === 'EMAIL_UNVERIFIED') { setNeedVerify(true); setError(''); }
        else setError(data.message);
        return;
      }
      const u = { id: data.user.id, username: data.user.username, email: data.user.email, vip: false, level: 1, gold: 0, xp: 0 };
      localStorage.setItem('gridrunner_user', JSON.stringify(u));
      localStorage.setItem('gridrunner_token', data.token);
      window.dispatchEvent(new Event('user-update'));
      router.push('/profile');
    } catch (e: any) {
      setError(e.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'linear-gradient(180deg, #0a1a0f 0%, #0d2415 100%)', color: '#e0f0e0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 4, background: 'linear-gradient(135deg, #00e676, #69f0ae)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GridRunner</h1>
        <p style={{ textAlign: 'center', opacity: 0.4, fontSize: 14, marginBottom: 28 }}>{t('auth.login_title')}</p>

        {notice && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.25)', color: '#00e676', fontSize: 13, textAlign: 'center', fontFamily: 'monospace' }}>
            {notice}
          </div>
        )}

        {needVerify && (
          <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,213,79,0.08)', border: '1px solid rgba(255,213,79,0.3)', textAlign: 'center' }}>
            <div style={{ color: '#ffd54f', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              <i className="fa-solid fa-envelope-circle-check"></i> {lang === 'ru' ? 'Подтверди почту' : 'Verify your email'}
            </div>
            <p style={{ fontSize: 12, opacity: 0.6, margin: '0 0 10px' }}>
              {lang === 'ru' ? `Мы отправили ссылку на ${email}` : `We sent a link to ${email}`}
            </p>
            <button type="button" onClick={resendVerification} disabled={resendState !== 'idle'}
              style={{ fontSize: 12, color: '#00e676', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'monospace' }}>
              {resendState === 'sent' ? (lang === 'ru' ? 'Отправлено' : 'Sent') : resendState === 'sending' ? '...' : (lang === 'ru' ? 'Отправить ещё раз' : 'Resend link')}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="text" placeholder={lang === 'ru' ? 'Email или ник' : 'Email or username'} value={email} onChange={e => setEmail(e.target.value)} required autoCapitalize="none" autoCorrect="off" />
          <input type="password" placeholder={t('auth.password')} value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p style={{ color: '#ff5252', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
            {loading ? (lang === 'ru' ? 'Вход...' : 'Signing in...') : t('auth.login_title')}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, opacity: 0.5, fontSize: 13 }}>
          {lang === 'ru' ? 'Нет аккаунта?' : 'No account?'}{' '}
          <Link href="/auth/register" style={{ color: '#00e676', textDecoration: 'none' }}>{t('auth.register_title')}</Link>
        </p>
      </div>
    </div>
  );
}
