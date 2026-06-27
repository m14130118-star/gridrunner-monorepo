import { useEffect, useState } from "react";
import { useT } from "../src/lib/i18n";

export default function Home() {
  const { t, lang, setLang } = useT();

  const FEATURES = [
    { title: t('features.gps'), desc: t('features.gps_desc'), icon: "🎯" },
    { title: t('features.clans'), desc: t('features.clans_desc'), icon: "🏴" },
    { title: t('features.garage'), desc: t('features.garage_desc'), icon: "🏎️" },
    { title: t('features.b2b'), desc: t('features.b2b_desc'), icon: "📊" },
    { title: t('features.music'), desc: t('features.music_desc'), icon: "🎵" },
    { title: t('features.vip'), desc: t('features.vip_desc'), icon: "👑" },
  ];

  const PRICING = [
    { name: t('pricing.free'), price: t('pricing.free_price'), period: t('pricing.free_period'), features: t('pricing.free_features'), cta: t('pricing.free_cta'), highlighted: false, icon: "🌿" },
    { name: t('pricing.vip'), price: t('pricing.vip_price'), period: t('pricing.vip_period'), features: t('pricing.vip_features'), cta: t('pricing.vip_cta'), highlighted: true, icon: "👑" },
    { name: t('pricing.biz'), price: t('pricing.biz_price'), period: t('pricing.biz_period'), features: t('pricing.biz_features'), cta: t('pricing.biz_cta'), highlighted: false, icon: "💼" },
  ];

  return (
    <div className="min-h-screen bg-darker">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-darker/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="text-2xl font-bold">
            <span className="gradient-text">Grid</span>
            <span className="text-white">Runner</span>
          </a>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-muted transition-colors hover:text-white">{t('nav.features')}</a>
            <a href="#pricing" className="text-sm text-muted transition-colors hover:text-white">{t('nav.pricing')}</a>
            <a href="/auth/register" className="text-sm text-muted transition-colors hover:text-white">{t('nav.register')}</a>
            <a href="http://localhost:3000" className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark">{t('nav.play')}</a>
            <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')} className="text-sm text-muted hover:text-white transition-colors px-2">
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.15),transparent_70%)]" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-5xl font-extrabold leading-tight md:text-7xl">
            <span className="gradient-text">{t('hero.title')}</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted">{t('hero.desc')}</p>
          <div className="flex items-center justify-center gap-4">
            <a href="http://localhost:3000" className="rounded-xl bg-primary px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark">{t('hero.cta')}</a>
            <a href="#features" className="gradient-border rounded-xl px-8 py-4 text-sm font-semibold text-white transition-all hover:opacity-80">{t('hero.learn')}</a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-4xl font-bold">
            {t('features.title')}
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-muted">{t('features.subtitle')}</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-white/5 bg-surface/50 p-8 transition-all hover:border-primary/30 hover:bg-surface/80">
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-4xl font-bold">
            {t('pricing.title')}
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-muted">{t('pricing.subtitle')}</p>
          <div className="grid gap-8 md:grid-cols-3">
            {PRICING.map((p) => (
              <div key={p.name} className={`relative rounded-2xl border p-8 ${p.highlighted ? "border-primary/50 bg-primary/10 shadow-xl shadow-primary/10" : "border-white/5 bg-surface/50"}`}>
                {p.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-1 text-xs font-semibold">{t('pricing.popular')}</div>
                )}
                <div className="mb-2 text-2xl">{p.icon}</div>
                <h3 className="mb-1 text-xl font-bold">{p.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">{p.price}</span>
                  <span className="text-sm text-muted">{p.period}</span>
                </div>
                <ul className="mb-8 space-y-3">
                  {(typeof p.features === 'string' ? p.features.split('\n') : p.features).map((f: string) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted"><span className="text-primary">✓</span> {f}</li>
                  ))}
                </ul>
                <a href="http://localhost:3000" className={`block rounded-xl py-3 text-center text-sm font-semibold transition-all ${p.highlighted ? "bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-dark" : "border border-white/10 text-white hover:bg-white/5"}`}>{p.cta}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-3xl bg-gradient-to-br from-primary/20 via-purple-900/20 to-accent/10 p-16">
            <h2 className="mb-4 text-4xl font-bold">{t('cta.title')}</h2>
            <p className="mb-8 text-muted">{t('cta.desc')}</p>
            <a href="http://localhost:3000" className="inline-block rounded-xl bg-primary px-10 py-4 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark">{t('cta.btn')}</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-sm text-muted">
          <span>© 2026 GridRunner. {t('footer.rights')}</span>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-white">Telegram</a>
            <a href="#" className="transition-colors hover:text-white">VK</a>
            <a href="#" className="transition-colors hover:text-white">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
