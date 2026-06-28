import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { BackButton } from '../src/components/BackButton';
import { useT } from '../src/lib/i18n';
import { setApiUrl, getApiUrl } from '../src/lib/api';
import { useAuth } from '../src/lib/auth-context';

export default function SettingsPage() {
  const { t, lang, setLang } = useT();
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const [volume, setVolume] = useState(80);
  const [garageMode, setGarageMode] = useState<'complex' | 'simple'>('complex');
  const [mapTheme, setMapTheme] = useState<'schema' | 'satellite'>('schema');
  const [saved, setSaved] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://localhost:3003');
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const v = localStorage.getItem('gridrunner_volume');
    const g = localStorage.getItem('gridrunner_garage_mode') as 'complex' | 'simple' | null;
    const m = localStorage.getItem('gridrunner_map_theme') as 'schema' | 'satellite' | null;
    const a = localStorage.getItem('gridrunner_avatar');
    if (v) setVolume(parseInt(v));
    if (g) setGarageMode(g);
    if (m) setMapTheme(m);
    if (a) setAvatar(a);
    document.body.className = 'theme-dark';
    document.documentElement.style.colorScheme = 'dark';
    localStorage.setItem('gridrunner_theme', 'dark');
  }, []);

  useEffect(() => {
    localStorage.setItem('gridrunner_volume', volume.toString());
  }, [volume]);

  const handleDeleteAccount = () => {
    const confirmed = confirm(t('settings.delete_confirm'));
    if (!confirmed) return;
    fetch(getApiUrl() + '/api/v1/auth/register', { method: 'DELETE' }).catch(() => {});
    logout();
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatar(dataUrl);
      localStorage.setItem('gridrunner_avatar', dataUrl);
      window.dispatchEvent(new Event('avatar-update'));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <BackButton />
        <h1 className="settings-title">
          <i className="fa-solid fa-gear" style={{ marginRight: 10 }}></i>
          {t('settings.title')}
        </h1>

        {/* Volume */}
        <section className="settings-section">
          <h2><i className="fa-solid fa-volume-high"></i> {t('settings.volume')}</h2>
          <div className="volume-control">
            <i className="fa-solid fa-volume-low" style={{ opacity: 0.5 }}></i>
            <input
              type="range" min="0" max="100" value={volume}
              onChange={e => setVolume(parseInt(e.target.value))}
              className="volume-slider"
            />
            <i className="fa-solid fa-volume-high"></i>
            <span className="volume-value">{volume}%</span>
          </div>
        </section>

        {/* Garage Mode */}
        <section className="settings-section">
          <h2><i className="fa-solid fa-warehouse"></i> {lang === 'ru' ? 'Гараж' : 'Garage'}</h2>
          <div className="theme-options">
            {(['complex', 'simple'] as const).map(m => (
              <button key={m} data-sound="toggle" className={`theme-btn ${garageMode === m ? 'active' : ''}`} onClick={() => { setGarageMode(m); localStorage.setItem('gridrunner_garage_mode', m); }}>
                <i className={`fa-solid ${m === 'complex' ? 'fa-cubes' : 'fa-list'}`}></i>
                {m === 'complex'
                  ? (lang === 'ru' ? 'Сложный' : 'Complex')
                  : (lang === 'ru' ? 'Простой' : 'Simple')}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, opacity: 0.4, marginTop: 8 }}>
            {lang === 'ru'
              ? 'Сложный — 3D гараж с погодой. Простой — быстрый выбор транспорта.'
              : 'Complex — 3D garage with weather. Simple — quick vehicle selector.'}
          </p>
        </section>

        {/* Map Theme */}
        <section className="settings-section">
          <h2><i className="fa-solid fa-map"></i> {lang === 'ru' ? 'Стиль карты' : 'Map Style'}</h2>
          <div className="theme-options">
            <button className={`theme-btn ${mapTheme === 'schema' ? 'active' : ''}`} onClick={() => { setMapTheme('schema'); localStorage.setItem('gridrunner_map_theme', 'schema'); }}>
              <i className="fa-solid fa-map"></i> {lang === 'ru' ? 'Схема' : 'Schema'}
            </button>
            <button className={`theme-btn ${mapTheme === 'satellite' ? 'active' : ''}`} onClick={() => { setMapTheme('satellite'); localStorage.setItem('gridrunner_map_theme', 'satellite'); }}>
              <i className="fa-solid fa-satellite"></i> {lang === 'ru' ? 'Спутник' : 'Satellite'}
            </button>
          </div>
        </section>

        {/* Avatar */}
        <section className="settings-section">
          <h2><i className="fa-solid fa-user"></i> {t('settings.avatar')}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                background: avatar ? 'none' : 'linear-gradient(135deg, var(--green), var(--green-light))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 700, color: '#000',
              }}>
                {avatar ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : user ? user.username[0].toUpperCase() : '?'}
              </div>
              <label style={{
                position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%',
                background: 'var(--green)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '2px solid #0d1117',
              }}>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                <i className="fa-solid fa-camera"></i>
              </label>
            </div>
            <span style={{ opacity: 0.6, fontSize: 13 }}>{t('settings.avatar_hint')}</span>
          </div>
        </section>

        {/* Language */}
        <section className="settings-section">
          <h2><i className="fa-solid fa-language"></i> {t('settings.language')}</h2>
          <div className="lang-options">
            <button className={`lang-btn ${lang === 'ru' ? 'active' : ''}`} onClick={() => setLang('ru')}>Русский</button>
            <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>English</button>
          </div>
        </section>

        {/* Account */}
        <section className="settings-section" style={{ padding: 0, overflow: 'hidden' }}>
          {isAuthenticated ? (
            <>
              <div style={{ padding: 24, textAlign: 'center', background: 'linear-gradient(180deg, rgba(0,230,118,0.06) 0%, transparent 100%)', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
                  background: 'linear-gradient(135deg, var(--green), var(--green-light))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, color: '#000',
                  boxShadow: '0 0 20px rgba(0,230,118,0.15)',
                }}>
                  {user!.username[0].toUpperCase()}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{user!.username}</div>
                <div style={{ fontSize: 13, opacity: 0.4, marginTop: 2 }}>{user!.email}</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                  <span className="badge" style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676', fontSize: 12 }}>ID: {(user! as any).id || '—'}</span>
                  {user!.vip && <span className="badge" style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd740', fontSize: 12 }}>VIP</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 16 }}>
                <button className="btn btn-secondary" onClick={logout} style={{ width: '100%', justifyContent: 'center', padding: '12px 0' }}>
                  <i className="fa-solid fa-right-from-bracket"></i> {t('nav.logout')}
                </button>
                <button className="btn btn-danger" onClick={handleDeleteAccount} style={{ width: '100%', justifyContent: 'center', padding: '12px 0' }}>
                  <i className="fa-solid fa-trash"></i> {t('settings.delete')}
                </button>
              </div>
            </>
          ) : null}
        </section>

        {saved && <p className="settings-saved">{t('settings.saved')}</p>}
      </div>

      <style jsx>{`
        .settings-page {
          min-height: calc(100vh - var(--header-h, 60px));
          padding: 24px 16px;
          color: var(--text);
        }
        .settings-container {
          max-width: 560px;
          margin: 0 auto;
        }
        .settings-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 28px;
        }
        .settings-section {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .settings-section h2 {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0.7;
        }
        .theme-options, .lang-options {
          display: flex;
          gap: 8px;
        }
        .theme-btn, .lang-btn {
          flex: 1;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text);
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .theme-btn.active, .lang-btn.active {
          border-color: var(--primary);
          background: var(--primary);
          color: #fff;
        }
        .volume-control {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .volume-slider {
          flex: 1;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          border-radius: 3px;
          background: var(--border);
          outline: none;
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
        }
        .volume-value {
          min-width: 40px;
          text-align: right;
          font-size: 14px;
          font-weight: 600;
        }
        .account-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .btn-danger {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #ff5252;
          background: transparent;
          color: #ff5252;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .btn-danger:hover {
          background: #ff5252;
          color: #fff;
        }
        .settings-saved {
          text-align: center;
          font-size: 13px;
          color: var(--primary);
          margin-top: 12px;
        }
      `}</style>
    </div>
  );
}
