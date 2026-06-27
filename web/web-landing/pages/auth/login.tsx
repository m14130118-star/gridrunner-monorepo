import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useT } from '../../src/lib/i18n';

export default function Login() {
  const { t, lang } = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3003/api/v1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const r = await fetch(API_URL + '/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!data.success) { setError(data.message); return; }
      localStorage.setItem('gridrunner_user', JSON.stringify({
        id: data.user.id, username: data.user.username, email: data.user.email, vip: false, level: 1, gold: 0, xp: 0,
      }));
      localStorage.setItem('gridrunner_token', data.token);
      setDone(true);
    } catch { setError('Connection error'); }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-6">🚀</div>
          <h2 className="text-2xl font-bold text-white mb-2">{lang === 'ru' ? 'С возвращением!' : 'Welcome back!'}</h2>
          <p className="text-[#94a3b8] mb-8">{lang === 'ru' ? 'Открой приложение и продолжай исследовать' : 'Open the app and continue exploring'}</p>
          <a href="/gridrunner.apk" className="inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 font-semibold text-dark shadow-xl transition-all hover:bg-white/90">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.32-1.32c.2-.2.2-.51 0-.71s-.51-.2-.71 0l-1.32 1.32c-.77-.35-1.63-.54-2.53-.54s-1.76.19-2.53.54L7.86.13c-.2-.2-.51-.2-.71 0s-.2.51 0 .71l1.32 1.32C7.13 2.91 6.43 4.34 6.19 6h11.62c-.24-1.66-.94-3.09-2.28-3.84zM10 4.75c0-.41.34-.75.75-.75h2.5c.41 0 .75.34.75.75s-.34.75-.75.75h-2.5c-.41 0-.75-.34-.75-.75z"/></svg>
            {lang === 'ru' ? 'Скачать APK' : 'Download APK'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-3xl font-bold"><span className="bg-gradient-to-r from-[#7c3aed] via-purple-400 to-[#f59e0b] bg-clip-text text-transparent">Grid</span><span className="text-white">Runner</span></a>
          <p className="text-[#94a3b8] mt-2 text-sm">{t('auth.login_desc')}</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-[#1e293b]/50 border border-white/5 rounded-2xl p-8 space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-white/10 text-white placeholder-[#64748b] outline-none focus:border-[#7c3aed] transition-colors" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-white/10 text-white placeholder-[#64748b] outline-none focus:border-[#7c3aed] transition-colors" />
          {error && <p className="text-[#ff5252] text-sm text-center">{error}</p>}
          <button type="submit" className="w-full py-3 rounded-xl bg-[#7c3aed] text-white font-semibold hover:bg-[#6d28d9] transition-colors shadow-lg shadow-[#7c3aed]/25">{t('auth.login')}</button>
        </form>
        <p className="text-center mt-6 text-sm text-[#64748b]">
          {t('auth.no_account')} <Link href="/auth/register" className="text-[#7c3aed] hover:text-[#6d28d9]">{t('auth.register')}</Link>
        </p>
      </div>
    </div>
  );
}
