import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import { useT } from '../src/lib/i18n';

const FEATURES = [
  { icon: 'fa-map-location-dot', key: 'routes' },
  { icon: 'fa-trophy', key: 'progression' },
  { icon: 'fa-crosshairs', key: 'arena' },
  { icon: 'fa-crown', key: 'vip' },
  { icon: 'fa-users', key: 'community' },
  { icon: 'fa-globe', key: 'web' },
];

const HOW_IT_WORKS = [
  { step: '01', key: 'pick' },
  { step: '02', key: 'vibe' },
  { step: '03', key: 'start_trip' },
  { step: '04', key: 'levelup' },
];

export default function Home() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const { t, lang, setLang } = useT();

  useEffect(() => {
    try {
      const u = localStorage.getItem('gridrunner_user');
      if (u && JSON.parse(u)) setAuthed(true);
    } catch {}
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const features: Record<string, { titleRu: string; titleEn: string; descRu: string; descEn: string }> = {
    routes: { titleRu: 'Атмосферные маршруты', titleEn: 'Atmospheric Routes', descRu: 'Алгоритм подбирает точки под твой транспорт, погоду и музыкальный вайб', descEn: 'Algorithm picks spots matching your ride, weather & music vibe' },
    progression: { titleRu: 'Система прогресса', titleEn: 'Progression', descRu: 'XP, уровень, золото, достижения — каждая поездка качает', descEn: 'XP, levels, gold, achievements — every ride matters' },
    arena: { titleRu: 'Arena-режим', titleEn: 'Arena Mode', descRu: 'Сражайся за районы, ставь ловушки, захватывай территорию', descEn: 'Fight for districts, place traps, capture territory' },
    vip: { titleRu: 'VIP-привилегии', titleEn: 'VIP Perks', descRu: 'Эксклюзивный транспорт, двойной XP и золото', descEn: 'Exclusive vehicles, double XP & gold' },
    community: { titleRu: 'Сообщество', titleEn: 'Community', descRu: 'Краудсорсинг POI, голосование, общие маршруты', descEn: 'Crowdsourced POI, voting, shared routes' },
    web: { titleRu: 'Веб-версия', titleEn: 'Web Version', descRu: 'Играй прямо в браузере без установки', descEn: 'Play directly in your browser, no install needed' },
  };

  const steps: Record<string, { titleRu: string; titleEn: string; descRu: string; descEn: string }> = {
    pick: { titleRu: 'Выбери транспорт', titleEn: 'Pick Your Ride', descRu: 'Ноги, скейт, велик или тачка — под каждый свой стиль', descEn: 'Feet, skateboard, bicycle or car — each has its own style' },
    vibe: { titleRu: 'Укажи вайб', titleEn: 'Set Your Vibe', descRu: 'Агрессивный, круиз, ночной, панорамный — алгоритм подстроится', descEn: 'Aggressive, cruise, dark, scenic — the algorithm adapts' },
    start_trip: { titleRu: 'Стартуй трип', titleEn: 'Start the Trip', descRu: 'GPS ведёт по точкам, собирай XP и золото в реальном времени', descEn: 'GPS navigates waypoints, earn XP & gold in real-time' },
    levelup: { titleRu: 'Прокачивайся', titleEn: 'Level Up', descRu: 'Достижения, новые районы, рейтинг — становись легендой', descEn: 'Achievements, new districts, rankings — become a legend' },
  };

  const feat = (k: string) => features[k] || { titleRu: '', titleEn: '', descRu: '', descEn: '' };
  const st = (k: string) => steps[k] || { titleRu: '', titleEn: '', descRu: '', descEn: '' };

  return (
    <>
      <div className="landing">
        {/* Lang toggle */}
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, display: 'flex', gap: 4 }}>
          <button onClick={() => setLang('ru')} className={`lang-toggle ${lang === 'ru' ? 'active' : ''}`}>RU</button>
          <button onClick={() => setLang('en')} className={`lang-toggle ${lang === 'en' ? 'active' : ''}`}>EN</button>
        </div>

        {/* Hero */}
        <section className="hero">
          <div className="hero-bg" />
          <div className="hero-content">
            <div className="hero-badge">v2.0 — Open Source</div>
            <h1 className="hero-title">GridRunner</h1>
            <p className="hero-subtitle">{t('landing.subtitle')}</p>
            <div className="hero-actions">
              {authed ? (
                <Link href="/profile" className="btn btn-primary btn-hero" data-sound="success">
                  <i className="fa-solid fa-play"></i> {t('landing.get_started')}
                </Link>
              ) : (
                <>
                  <Link href="/auth/register" className="btn btn-primary btn-hero" data-sound="success">
                    <i className="fa-solid fa-user-plus"></i> {t('landing.get_started')}
                  </Link>
                  <Link href="/auth/login" className="btn btn-secondary btn-hero" data-sound="none">
                    <i className="fa-solid fa-right-to-bracket"></i> {t('nav.login')}
                  </Link>
                </>
              )}
              <button onClick={() => scrollTo('features')} className="btn btn-ghost btn-hero-ghost" data-sound="none">
                {t('landing.learn')} <i className="fa-solid fa-chevron-down"></i>
              </button>
            </div>
            <div className="hero-stats">
              <span><strong>10+</strong> {lang === 'ru' ? 'Районов' : 'Districts'}</span>
              <span><strong>50+</strong> POI</span>
              <span><strong>4</strong> {lang === 'ru' ? 'Транспорта' : 'Vehicles'}</span>
              <span><strong>6</strong> {lang === 'ru' ? 'Вайбов' : 'Vibes'}</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="landing-section">
          <div className="landing-container">
            <h2 className="section-title">{lang === 'ru' ? 'Создано для улиц' : 'Built for the streets'}</h2>
            <p className="section-desc">{lang === 'ru' ? 'Каждая фича заточена под реальный городской исследовэйшн' : 'Every feature designed around real urban exploration'}</p>
            <div className="features-grid">
              {FEATURES.map((f, i) => (
                <div key={i} className="feature-card card">
                  <div className="feature-icon">
                    <i className={`fa-solid ${f.icon}`}></i>
                  </div>
                  <h3 className="feature-title">{feat(f.key)[lang === 'ru' ? 'titleRu' : 'titleEn']}</h3>
                  <p className="feature-desc">{feat(f.key)[lang === 'ru' ? 'descRu' : 'descEn']}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="landing-section landing-section-alt">
          <div className="landing-container">
            <h2 className="section-title">{lang === 'ru' ? 'Как это работает' : 'How it works'}</h2>
            <p className="section-desc">{lang === 'ru' ? 'Четыре шага до первой поездки' : 'Four steps to your first ride'}</p>
            <div className="steps-grid">
              {HOW_IT_WORKS.map((s, i) => (
                <div key={i} className="step-card">
                  <div className="step-number">{s.step}</div>
                  <h3 className="step-title">{st(s.key)[lang === 'ru' ? 'titleRu' : 'titleEn']}</h3>
                  <p className="step-desc">{st(s.key)[lang === 'ru' ? 'descRu' : 'descEn']}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="landing-section landing-section-alt">
          <div className="landing-container text-center">
            <h2 className="section-title">{lang === 'ru' ? 'Готов кататься?' : 'Ready to ride?'}</h2>
            <p className="section-desc">{lang === 'ru' ? 'Вступай в сообщество и исследуй свой город' : 'Join the community and start exploring your city'}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {authed ? (
                <Link href="/profile" className="btn btn-primary btn-lg" data-sound="success">
                  <i className="fa-solid fa-arrow-right"></i> {lang === 'ru' ? 'В профиль' : 'Go to Profile'}
                </Link>
              ) : (
                <>
                  <Link href="/auth/register" className="btn btn-primary btn-lg" data-sound="success">
                    <i className="fa-solid fa-user-plus"></i> {lang === 'ru' ? 'Создать аккаунт' : 'Create Account'}
                  </Link>
                  <Link href="/auth/login" className="btn btn-secondary btn-lg" data-sound="none">
                    <i className="fa-solid fa-right-to-bracket"></i> {t('nav.login')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <Footer />

      <style jsx>{`
        .landing { overflow-x: hidden; }

        .lang-toggle {
          padding: 4px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.6); color: rgba(255,255,255,0.5); cursor: pointer;
          font-size: 12px; font-weight: 700; font-family: inherit;
          backdrop-filter: blur(8px); transition: all 0.2s;
        }
        .lang-toggle.active { color: var(--green); border-color: var(--green); background: rgba(0,230,118,0.1); }
        .lang-toggle:hover { color: var(--green); }

        .hero {
          position: relative; min-height: 90vh;
          display: flex; align-items: center; justify-content: center;
          padding: 80px 24px; text-align: center;
          overflow: hidden;
        }
        .hero-bg {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 0%, rgba(0,230,118,0.06) 0%, transparent 60%),
                      radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.04) 0%, transparent 50%);
          pointer-events: none;
        }
        .hero-content { position: relative; z-index: 1; max-width: 680px; }
        .hero-badge {
          display: inline-block; padding: 4px 14px; border-radius: 20px;
          background: rgba(0,230,118,0.1); color: var(--green);
          font-size: 12px; font-weight: 600; letter-spacing: 0.5px;
          margin-bottom: 20px; border: 1px solid rgba(0,230,118,0.15);
        }
        .hero-title {
          font-size: clamp(48px, 10vw, 96px); font-weight: 900; line-height: 1;
          margin: 0 0 16px;
          background: linear-gradient(135deg, var(--green), var(--green-light), #b388ff);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }
        .hero-subtitle {
          font-size: clamp(16px, 3vw, 20px); opacity: 0.6; line-height: 1.6;
          margin: 0 0 32px; max-width: 520px; margin-left: auto; margin-right: auto;
        }
        .hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px; }
        .btn-hero { padding: 14px 32px; font-size: 17px; font-weight: 700; border-radius: 14px; }
        .btn-hero-ghost { font-size: 14px; opacity: 0.5; }
        .hero-stats {
          display: flex; gap: 24px; justify-content: center; flex-wrap: wrap;
          font-size: 13px; opacity: 0.35;
        }
        .hero-stats strong { color: var(--green); opacity: 1; font-size: 15px; }

        .landing-section { padding: 100px 24px; }
        .landing-section-alt { background: rgba(255,255,255,0.02); }
        .landing-container { max-width: 960px; margin: 0 auto; }
        .section-title {
          font-size: clamp(28px, 5vw, 40px); font-weight: 800;
          text-align: center; margin: 0 0 8px;
        }
        .section-desc {
          text-align: center; font-size: 16px; opacity: 0.4;
          margin: 0 0 48px;
        }

        .features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .feature-card { padding: 28px; text-align: center; transition: transform 0.3s, border-color 0.3s; }
        .feature-card:hover { transform: translateY(-4px); border-color: rgba(0,230,118,0.2); }
        .feature-icon {
          width: 56px; height: 56px; margin: 0 auto 16px;
          border-radius: 16px; background: rgba(0,230,118,0.08);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; color: var(--green);
        }
        .feature-title { font-size: 16px; font-weight: 700; margin: 0 0 8px; }
        .feature-desc { font-size: 13px; opacity: 0.5; line-height: 1.6; margin: 0; }

        .steps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 24px; }
        .step-card { text-align: center; }
        .step-number {
          font-size: 48px; font-weight: 900; opacity: 0.08;
          line-height: 1; margin-bottom: 12px;
          background: linear-gradient(135deg, var(--green), var(--green-light));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .step-title { font-size: 16px; font-weight: 700; margin: 0 0 6px; }
        .step-desc { font-size: 13px; opacity: 0.4; line-height: 1.5; margin: 0; }

        .btn-lg { padding: 14px 36px; font-size: 16px; border-radius: 14px; font-weight: 700; }

        @media (max-width: 639px) {
          .hero { min-height: 80vh; padding: 60px 16px; }
          .landing-section { padding: 60px 16px; }
          .features-grid { grid-template-columns: 1fr; }
          .steps-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
        }
      `}</style>
    </>
  );
}
