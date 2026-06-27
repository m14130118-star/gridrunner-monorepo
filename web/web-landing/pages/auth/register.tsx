import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useT } from '../../src/lib/i18n';

export default function Register() {
  const { t, lang } = useT();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 4) { setError(t('auth.password_short')); return; }
    try {
      const r = await fetch('http://localhost:3003/api/v1/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await r.json();
      if (!data.success) { setError(data.message); return; }
      localStorage.setItem('gridrunner_user', JSON.stringify({
        id: data.user.id, username: data.user.username, email: data.user.email, vip: false, level: 1, gold: 0, xp: 0,
      }));
      localStorage.setItem('gridrunner_token', data.token);
      window.location.href = 'http://localhost:3000/profile';
    } catch { setError('Connection error'); }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-3xl font-bold"><span className="bg-gradient-to-r from-[#7c3aed] via-purple-400 to-[#f59e0b] bg-clip-text text-transparent">Grid</span><span className="text-white">Runner</span></a>
          <p className="text-[#94a3b8] mt-2 text-sm">{t('auth.create')}</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-[#1e293b]/50 border border-white/5 rounded-2xl p-8 space-y-4">
          <input type="text" placeholder={lang === 'ru' ? 'Имя' : 'Username'} value={username} onChange={e => setUsername(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-white/10 text-white placeholder-[#64748b] outline-none focus:border-[#7c3aed] transition-colors" />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-white/10 text-white placeholder-[#64748b] outline-none focus:border-[#7c3aed] transition-colors" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-white/10 text-white placeholder-[#64748b] outline-none focus:border-[#7c3aed] transition-colors" />
          {error && <p className="text-[#ff5252] text-sm text-center">{error}</p>}
          <button type="submit" className="w-full py-3 rounded-xl bg-[#7c3aed] text-white font-semibold hover:bg-[#6d28d9] transition-colors shadow-lg shadow-[#7c3aed]/25">{t('auth.register')}</button>
        </form>
        <p className="text-center mt-6 text-sm text-[#64748b]">
          {t('auth.has_account')} <Link href="/auth/login" className="text-[#7c3aed] hover:text-[#6d28d9]">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
}
