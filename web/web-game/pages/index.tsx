import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Footer from '../src/components/Footer';

const FEATURES = [
  { icon: 'fa-map-location-dot', titleRu: 'Атмосферные маршруты', titleEn: 'Atmospheric Routes', descRu: 'Алгоритм подбирает точки под твой транспорт, погоду и музыкальный вайб', descEn: 'Algorithm picks spots matching your ride, weather & music vibe' },
  { icon: 'fa-trophy', titleRu: 'Система прогресса', titleEn: 'Progression', descRu: 'XP, уровень, золото, достижения — каждая поездка качает', descEn: 'XP, levels, gold, achievements — every ride matters' },
  { icon: 'fa-crosshairs', titleRu: 'Arena-режим', titleEn: 'Arena Mode', descRu: 'Сражайся за районы, ставь ловушки, захватывай территорию', descEn: 'Fight for districts, place traps, capture territory' },
  { icon: 'fa-crown', titleRu: 'VIP-привилегии', titleEn: 'VIP Perks', descRu: 'Эксклюзивный транспорт, двойной XP и золото', descEn: 'Exclusive vehicles, double XP & gold' },
  { icon: 'fa-users', titleRu: 'Сообщество', titleEn: 'Community', descRu: 'Краудсорсинг POI, голосование, общие маршруты', descEn: 'Crowdsourced POI, voting, shared routes' },
  { icon: 'fa-mobile-screen', titleRu: 'APK для Android', titleEn: 'Android APK', descRu: 'Полноценное нативное приложение через Capacitor', descEn: 'Full native app via Capacitor' },
];

const HOW_IT_WORKS = [
  { step: '01', titleRu: 'Выбери транспорт', titleEn: 'Pick Your Ride', descRu: 'Ноги, скейт, велик или тачка — под каждый свой стиль', descEn: 'Feet, skateboard, bicycle or car — each has its own style' },
  { step: '02', titleRu: 'Укажи вайб', titleEn: 'Set Your Vibe', descRu: 'Агрессивный, круиз, ночной, панорамный — алгоритм подстроится', descEn: 'Aggressive, cruise, dark, scenic — the algorithm adapts' },
  { step: '03', titleRu: 'Стартуй трип', titleEn: 'Start the Trip', descRu: 'GPS ведёт по точкам, собирай XP и золото в реальном времени', descEn: 'GPS navigates waypoints, earn XP & gold in real-time' },
  { step: '04', titleRu: 'Прокачивайся', titleEn: 'Level Up', descRu: 'Достижения, новые районы, рейтинг — становись легендой', descEn: 'Achievements, new districts, rankings — become a legend' },
];

export default function Home() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    try {
      const u = localStorage.getItem('gridrunner_user');
      if (u && JSON.parse(u)) setAuthed(true);
    } catch {}
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div className="landing">
        {/* Hero */}
        <section className="hero">
          <div className="hero-bg" />
          <div className="hero-content">
            <div className="hero-badge">v2.0 — Open Source</div>
            <h1 className="hero-title">GridRunner</h1>
            <p className="hero-subtitle">
              Urban exploration game. Algorithm generates atmospheric routes matching your vibe, vehicle & weather.
            </p>
            <div className="hero-actions">
              {authed ? (
                <Link href="/profile" className="btn btn-primary btn-hero" data-sound="success">
                  <i className="fa-solid fa-play"></i> Start Playing
                </Link>
              ) : (
                <>
                  <Link href="/auth/register" className="btn btn-primary btn-hero" data-sound="success">
                    <i className="fa-solid fa-user-plus"></i> Get Started
                  </Link>
                  <Link href="/auth/login" className="btn btn-secondary btn-hero" data-sound="none">
                    <i className="fa-solid fa-right-to-bracket"></i> Sign In
                  </Link>
                </>
              )}
              <button onClick={() => scrollTo('features')} className="btn btn-ghost btn-hero-ghost" data-sound="none">
                Learn more <i className="fa-solid fa-chevron-down"></i>
              </button>
            </div>
            <div className="hero-stats">
              <span><strong>10+</strong> Districts</span>
              <span><strong>50+</strong> POI Spots</span>
              <span><strong>4</strong> Vehicles</span>
              <span><strong>6</strong> Vibes</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="landing-section">
          <div className="landing-container">
            <h2 className="section-title">Built for the streets</h2>
            <p className="section-desc">Every feature designed around real urban exploration</p>
            <div className="features-grid">
              {FEATURES.map((f, i) => (
                <div key={i} className="feature-card card">
                  <div className="feature-icon">
                    <i className={`fa-solid ${f.icon}`}></i>
                  </div>
                  <h3 className="feature-title">{f.titleEn}</h3>
                  <p className="feature-desc">{f.descEn}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="landing-section landing-section-alt">
          <div className="landing-container">
            <h2 className="section-title">How it works</h2>
            <p className="section-desc">Four steps to your first ride</p>
            <div className="steps-grid">
              {HOW_IT_WORKS.map((s, i) => (
                <div key={i} className="step-card">
                  <div className="step-number">{s.step}</div>
                  <h3 className="step-title">{s.titleEn}</h3>
                  <p className="step-desc">{s.descEn}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* APK Download */}
        <section className="landing-section">
          <div className="landing-container">
            <div className="download-card card">
              <div className="download-icon">
                <i className="fa-solid fa-mobile-screen"></i>
              </div>
              <h2 className="download-title">Mobile APK</h2>
              <p className="download-desc">Native Android app with GPS tracking, real-time sync & full game features</p>
              <a href="/GridRunner.apk" download className="btn btn-primary btn-lg" data-sound="success">
                <i className="fa-solid fa-download"></i> Download APK
              </a>
              <p className="download-note">Requires Android 8+. Backend runs on your PC.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="landing-section landing-section-alt">
          <div className="landing-container text-center">
            <h2 className="section-title">Ready to ride?</h2>
            <p className="section-desc">Join the community and start exploring your city</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {authed ? (
                <Link href="/profile" className="btn btn-primary btn-lg" data-sound="success">
                  <i className="fa-solid fa-arrow-right"></i> Go to Profile
                </Link>
              ) : (
                <>
                  <Link href="/auth/register" className="btn btn-primary btn-lg" data-sound="success">
                    <i className="fa-solid fa-user-plus"></i> Create Account
                  </Link>
                  <Link href="/auth/login" className="btn btn-secondary btn-lg" data-sound="none">
                    <i className="fa-solid fa-right-to-bracket"></i> Sign In
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

        /* Hero */
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

        /* Sections */
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

        /* Features */
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

        /* Steps */
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

        /* Download */
        .download-card {
          text-align: center; padding: 48px 32px; max-width: 480px; margin: 0 auto;
        }
        .download-icon { font-size: 48px; color: var(--green); margin-bottom: 16px; }
        .download-title { font-size: 24px; font-weight: 800; margin: 0 0 8px; }
        .download-desc { font-size: 14px; opacity: 0.5; margin: 0 0 24px; line-height: 1.6; }
        .download-note { font-size: 12px; opacity: 0.3; margin-top: 12px; }
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
