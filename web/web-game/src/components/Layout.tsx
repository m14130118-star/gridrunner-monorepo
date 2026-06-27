import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useState } from 'react';
import { useT } from '../lib/i18n';

const NAV_ITEMS = [
  { href: '/profile', icon: '👤', labelKey: 'nav.profile' },
  { href: '/news', icon: '📰', labelKey: 'nav.news' },
  { href: '/arena', icon: '⚔️', labelKey: 'nav.arena' },
  { href: '/vip', icon: '⭐', label: 'VIP' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const load = () => {
      try { const u = localStorage.getItem('gridrunner_user'); setUser(u ? JSON.parse(u) : null); } catch {}
    };
    load();
    window.addEventListener('user-update', load);
    return () => window.removeEventListener('user-update', load);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [router.asPath]);

  const ADMIN_USER = 'hexvel';
  const isAdmin = user?.username === ADMIN_USER;

  const logout = () => {
    localStorage.removeItem('gridrunner_user');
    localStorage.removeItem('gridrunner_token');
    setUser(null);
    window.dispatchEvent(new Event('user-update'));
    router.push('/auth/login');
  };

  return (
    <>
      {/* ─── Top Nav ───────────────────────────────────────── */}
      <nav className="topnav">
        <div className="topnav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="topnav-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? '✕' : '☰'}
            </button>
            <Link href={user ? '/profile' : '/auth/login'} className="topnav-logo">GridRunner</Link>
            <div className="topnav-desktop-only topnav-links">
              {NAV_ITEMS.map(item => (
                <Link key={item.href} href={item.href}
                  className={router.pathname === item.href || router.pathname.startsWith(item.href + '/') ? 'active' : ''}>
                  {item.labelKey ? t(item.labelKey) : item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link href="/admin/dashboard" className={router.pathname.startsWith('/admin') ? 'active' : ''}>
                  {t('nav.admin')}
                </Link>
              )}
            </div>
          </div>
          <div className="topnav-right topnav-desktop-only">
            <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', color: 'inherit', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
            {user ? (
              <>
                <Link href="/profile" className="topnav-user">
                  <div className="topnav-avatar">{user.username[0].toUpperCase()}</div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{user.username}</span>
                </Link>
                <button onClick={logout} className="btn btn-secondary btn-sm" style={{ borderColor: 'rgba(255,255,255,0.1)', padding: '4px 10px' }}>
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn btn-primary btn-sm" style={{ padding: '6px 14px' }}>{t('nav.login')}</Link>
                <Link href="/auth/register" className="btn btn-secondary btn-sm" style={{ padding: '6px 14px' }}>{t('nav.register')}</Link>
              </>
            )}
          </div>
          {/* Lang button for mobile in top-right */}
          <div className="topnav-hamburger" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', color: 'inherit', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Mobile Menu Overlay ──────────────────────────── */}
      {menuOpen && (
        <div className="mobile-menu">
          <Link href="/profile">{t('nav.profile')}</Link>
          <Link href="/news">{t('nav.news')}</Link>
          <Link href="/arena">{t('nav.arena')}</Link>
          <Link href="/vip">VIP</Link>
          {isAdmin && <Link href="/admin/dashboard">{t('nav.admin')}</Link>}
          <hr style={{ width: '80%', border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
          {user ? (
            <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', maxWidth: 320 }}>{t('nav.logout')}</button>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-primary">{t('nav.login')}</Link>
              <Link href="/auth/register" className="btn btn-secondary">{t('nav.register')}</Link>
            </>
          )}
        </div>
      )}

      {/* ─── Main Content ─────────────────────────────────── */}
      <main style={{ paddingTop: 'calc(var(--nav-height, 56px) + env(safe-area-inset-top, 0px))', minHeight: '100vh' }}>
        {children}
      </main>

      {/* ─── Bottom Nav (mobile) ──────────────────────────── */}
      <nav className="bottomnav">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/profile'
            ? (router.pathname === '/profile' || router.pathname === '/')
            : (router.pathname === item.href || router.pathname.startsWith(item.href + '/'));
          return (
            <Link key={item.href} href={item.href} className={isActive ? 'active' : ''}>
              <div className="bottomnav-icon">{item.icon}</div>
              {item.labelKey ? t(item.labelKey) : item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link href="/admin/dashboard" className={router.pathname.startsWith('/admin') ? 'active' : ''}>
            <div className="bottomnav-icon">⚙️</div>
            {t('nav.admin')}
          </Link>
        )}
      </nav>
    </>
  );
}
