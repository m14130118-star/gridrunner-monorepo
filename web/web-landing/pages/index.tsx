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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            Mobile App — Available Now
          </div>
          <h1 className="mb-6 text-5xl font-extrabold leading-tight md:text-7xl">
            <span className="gradient-text">{t('hero.title')}</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted">{t('hero.desc')}</p>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <a href="/gridrunner.apk" className="group flex w-full items-center justify-center gap-3 rounded-xl bg-white px-8 py-4 font-semibold text-dark shadow-xl transition-all hover:bg-white/90 sm:w-auto">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.32-1.32c.2-.2.2-.51 0-.71s-.51-.2-.71 0l-1.32 1.32c-.77-.35-1.63-.54-2.53-.54s-1.76.19-2.53.54L7.86.13c-.2-.2-.51-.2-.71 0s-.2.51 0 .71l1.32 1.32C7.13 2.91 6.43 4.34 6.19 6h11.62c-.24-1.66-.94-3.09-2.28-3.84zM10 4.75c0-.41.34-.75.75-.75h2.5c.41 0 .75.34.75.75s-.34.75-.75.75h-2.5c-.41 0-.75-.34-.75-.75z"/></svg>
              <span className="flex flex-col items-start leading-tight">
                <span className="text-xs font-normal opacity-60">Android</span>
                <span className="text-base">{t('hero.android')}</span>
              </span>
            </a>
            <a href="#" className="group flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-8 py-4 font-semibold text-white backdrop-blur transition-all hover:bg-white/10 sm:w-auto">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.31.12 2.29.64 2.94 1.6-2.73 1.59-2.2 4.86.44 5.74-.5 1.4-1.36 2.7-2.03 3.67M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25"/></svg>
              <span className="flex flex-col items-start leading-tight">
                <span className="text-xs font-normal opacity-60">iOS</span>
                <span className="text-base">{t('hero.ios')}</span>
              </span>
            </a>
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
                <a href="/auth/register" className={`block rounded-xl py-3 text-center text-sm font-semibold transition-all ${p.highlighted ? "bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-dark" : "border border-white/10 text-white hover:bg-white/5"}`}>{p.cta}</a>
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
            <a href="/gridrunner.apk" className="inline-block rounded-xl bg-primary px-10 py-4 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark">{t('cta.btn')}</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-sm text-muted">
          <span>© 2026 GridRunner. {t('footer.rights')}</span>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-white">Telegram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
