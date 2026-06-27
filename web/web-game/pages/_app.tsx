import { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { I18nProvider, useT } from '../src/lib/i18n';
import { initSounds } from '../src/lib/sound';
import AmbientBackground from '../src/components/AmbientBackground';
import Onboarding from '../src/components/Onboarding';
import MusicPlayer from '../src/components/MusicPlayer';
import '../styles/globals.css';

const NAV = [
  { href: '/profile', icon: 'fa-solid fa-user', label: 'nav.profile' },
  { href: '/garage', icon: 'fa-solid fa-warehouse', label: 'nav.garage' },
  { href: '/arena', icon: 'fa-solid fa-crosshairs', label: 'nav.arena' },
  { href: '/trips', icon: 'fa-solid fa-clock-rotate-left', label: 'nav.trips' },
  { href: '/news', icon: 'fa-solid fa-newspaper', label: 'nav.news' },
  { href: '/vip', icon: 'fa-solid fa-crown', label: 'VIP' },
  { href: '/leaderboard', icon: 'fa-solid fa-trophy', label: 'nav.leaderboard' },
];

function Header() {
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('gridrunner_theme');
    if (saved === 'dark' || saved === 'light') setTheme(saved);
  }, []);

  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('gridrunner_theme', theme);
  }, [theme]);

  useEffect(() => {
    const load = () => {
      try { const u = localStorage.getItem('gridrunner_user'); setUser(u ? JSON.parse(u) : null); } catch {}
      try { const a = localStorage.getItem('gridrunner_avatar'); if (a) setAvatar(a); } catch {}
    };
    load();
    window.addEventListener('user-update', load);
    window.addEventListener('avatar-update', load);
    return () => { window.removeEventListener('user-update', load); window.removeEventListener('avatar-update', load); };
  }, []);

  useEffect(() => { setMenuOpen(false); }, [router.asPath]);

  const isAdmin = user?.username === 'hexvel';
  const authed = !!user;

  const logout = () => {
    localStorage.removeItem('gridrunner_user');
    localStorage.removeItem('gridrunner_token');
    setUser(null);
    window.dispatchEvent(new Event('user-update'));
    router.push('/auth/login');
  };

  return (
    <header className="header">
      <div className="header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setMenuOpen(!menuOpen)} className="header-mobile-toggle" style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px', fontSize: 20 }}>
            <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
          </button>
          <Link href={authed ? '/profile' : '/auth/login'} className="header-logo">GridRunner</Link>
          <div className="header-links header-desktop-only">
            {NAV.map(n => (
              <Link key={n.href} href={n.href} className={router.pathname === n.href ? 'active' : ''}>
                <i className={n.icon} style={{ marginRight: 4 }}></i>{n.label === 'VIP' ? 'VIP' : t(n.label)}
              </Link>
            ))}
            <Link href="/settings" className={router.pathname === '/settings' ? 'active' : ''}>
              <i className="fa-solid fa-sliders" style={{ marginRight: 4 }}></i>{t('nav.settings')}
            </Link>
            {isAdmin && (
              <Link href="/admin/dashboard" className={router.pathname.startsWith('/admin') ? 'active' : ''}>
                <i className="fa-solid fa-chart-simple" style={{ marginRight: 4 }}></i>{t('nav.admin')}
              </Link>
            )}
          </div>
        </div>
        <div className="header-right">


          {authed ? (
            <Link href="/settings" className="header-user">
              <div className="header-avatar" style={avatar ? { background: 'none', overflow: 'hidden', fontSize: 0 } : {}}>
                {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : user!.username[0].toUpperCase()}
              </div>
              <span className="header-desktop-only" style={{ fontSize: 13 }}>{user!.username}</span>
            </Link>
          ) : (
            <div className="header-desktop-only" style={{ display: 'flex', gap: 6 }}>
              <Link href="/auth/login" className="btn btn-primary btn-sm">{t('nav.login')}</Link>
              <Link href="/auth/register" className="btn btn-secondary btn-sm">{t('nav.register')}</Link>
            </div>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}>
              <i className={n.icon} style={{ marginRight: 8, width: 20, textAlign: 'center' }}></i>
              {n.label === 'VIP' ? 'VIP' : t(n.label)}
            </Link>
          ))}
          <Link href="/settings">
            <i className="fa-solid fa-sliders" style={{ marginRight: 8, width: 20, textAlign: 'center' }}></i>
            {t('nav.settings')}
          </Link>
          {isAdmin && (
            <Link href="/admin/dashboard">
              <i className="fa-solid fa-chart-simple" style={{ marginRight: 8, width: 20, textAlign: 'center' }}></i>
              {t('nav.admin')}
            </Link>
          )}
          <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
          {authed ? (
            <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', maxWidth: 320 }}>
              <i className="fa-solid fa-right-from-bracket" style={{ marginRight: 8 }}></i>
              {t('nav.logout')}
            </button>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-primary" style={{ width: '100%', maxWidth: 320 }}>{t('nav.login')}</Link>
              <Link href="/auth/register" className="btn btn-secondary" style={{ width: '100%', maxWidth: 320 }}>{t('nav.register')}</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => { initSounds(); }, []);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const user = localStorage.getItem('gridrunner_user');
      const done = localStorage.getItem('gridrunner_onboarding_done');
      if (user && !done) setShowOnboarding(true);
    }
  }, []);
  return (
    <I18nProvider>
      <AmbientBackground />
      <Header />
      <main style={{ paddingTop: 'var(--header-h)', minHeight: '100vh' }}>
        <Component {...pageProps} />
      </main>
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
      <MusicPlayer />
    </I18nProvider>
  );
}
