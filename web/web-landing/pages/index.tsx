import { useEffect, useRef, useState, type ReactNode } from "react";
import Head from "next/head";
import { useT } from "../src/lib/i18n";

const GAME_URL = "https://game-gridrunner.vercel.app";

// Inline SVG icon set (no emoji) — consistent neon stroke style
const ICON_PATHS: Record<string, ReactNode> = {
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.5" fill="currentColor" /></>),
  flag: (<><path d="M5 22V3" /><path d="M5 4h12.5l-2.2 4 2.2 4H5" /></>),
  car: (<><path d="M4 16l1.8-5.2A2 2 0 0 1 7.7 9.5h8.6a2 2 0 0 1 1.9 1.3L20 16" /><path d="M3.5 16h17v3.5h-2.3a1.6 1.6 0 0 1-3.2 0H9a1.6 1.6 0 0 1-3.2 0H3.5z" /></>),
  trophy: (<><path d="M8 21h8M12 17v4" /><path d="M7 4h10v6a5 5 0 0 1-10 0z" /><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5A3.5 3.5 0 0 1 16.5 11" /></>),
  zap: (<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />),
  headphones: (<><path d="M4 15a8 8 0 0 1 16 0" /><rect x="3" y="14.5" width="4.2" height="6" rx="1.6" /><rect x="16.8" y="14.5" width="4.2" height="6" rx="1.6" /></>),
  map: (<><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z" /><path d="M9 4v14M15 6v14" /></>),
  pin: (<><path d="M12 21.5S5 15.2 5 10a7 7 0 1 1 14 0c0 5.2-7 11.5-7 11.5z" /><circle cx="12" cy="10" r="2.6" /></>),
  users: (<><circle cx="9" cy="8" r="3.4" /><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" /><circle cx="17.3" cy="9.2" r="2.7" /><path d="M15.8 14.6a5.3 5.3 0 0 1 5.7 5.4" /></>),
  compass: (<><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>),
  crown: (<><path d="m3 9 4.5 3L12 5l4.5 7L21 9l-1.8 9.5H4.8z" /><path d="M4.8 21.5h14.4" /></>),
  briefcase: (<><rect x="3" y="8" width="18" height="12.5" rx="2" /><path d="M9 8V6.2A2.2 2.2 0 0 1 11.2 4h1.6A2.2 2.2 0 0 1 15 6.2V8M3 13.5h18" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18" /></>),
  share: (<><path d="M12 15V4M8.5 7.5 12 4l3.5 3.5" /><path d="M5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12" /></>),
  android: (<path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.463 11.463 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 0 0 1 18h22a10.78 10.78 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />),
};

function Icon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const filled = name === "android" || name === "zap";
  return (
    <svg viewBox="0 0 24 24" className={className}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  );
}

// Scroll-reveal: adds .visible to .reveal elements as they enter the viewport
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// Animated counter that starts when scrolled into view
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started) {
        started = true;
        const t0 = performance.now();
        const dur = 1600;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  return <span ref={ref}>{val.toLocaleString("ru-RU")}{suffix}</span>;
}

// CSS/SVG phone mockup with a live mini-map: zones, marching route, pulsing player
function PhoneMockup() {
  return (
    <div className="float-phone relative mx-auto w-[280px] select-none sm:w-[300px]">
      <div className="glass-strong relative overflow-hidden rounded-[2.4rem] p-2 shadow-2xl shadow-black/60">
        <div className="relative overflow-hidden rounded-[1.9rem] bg-dark">
          {/* notch */}
          <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-black/80" />
          {/* map */}
          <svg viewBox="0 0 300 560" className="block w-full">
            <rect width="300" height="560" fill="#0d2137" />
            {/* streets */}
            <g stroke="#1b3a57" strokeWidth="6">
              <path d="M0 90 H300 M0 210 H300 M0 340 H300 M0 460 H300" />
              <path d="M70 0 V560 M160 0 V560 M245 0 V560" />
            </g>
            <g stroke="#16324b" strokeWidth="3">
              <path d="M0 150 H300 M0 275 H300 M0 400 H300 M115 0 V560 M205 0 V560" />
            </g>
            {/* zones */}
            <polygon points="10,100 150,100 150,200 10,200" fill="#00e676" className="zone-anim" fillOpacity="0.16" stroke="#00e676" strokeOpacity="0.6" strokeWidth="1.5" />
            <polygon points="170,220 292,220 292,330 170,330" fill="#ff1744" className="zone-anim-delay" fillOpacity="0.16" stroke="#ff1744" strokeOpacity="0.6" strokeWidth="1.5" />
            <polygon points="80,350 220,350 220,450 80,450" fill="#2979ff" fillOpacity="0.16" stroke="#2979ff" strokeOpacity="0.6" strokeWidth="1.5" />
            {/* route */}
            <path d="M40 500 L70 460 L70 340 L160 340 L160 210 L245 210 L245 120" fill="none" stroke="#00e676" strokeWidth="3" strokeLinecap="round" className="route-anim" />
            {/* checkpoints */}
            <circle cx="70" cy="340" r="6" fill="#0d2137" stroke="#00e5ff" strokeWidth="2.5" />
            <circle cx="160" cy="210" r="6" fill="#0d2137" stroke="#00e5ff" strokeWidth="2.5" />
            <circle cx="245" cy="120" r="7" fill="#00e676" opacity="0.9" />
            {/* player */}
            <circle cx="40" cy="500" r="7" fill="#00e676" />
            <circle cx="40" cy="500" r="13" fill="none" stroke="#00e676" strokeOpacity="0.5" strokeWidth="2">
              <animate attributeName="r" values="9;20" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.6;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </svg>
          {/* HUD overlay */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-9 font-mono text-[10px]">
            <span className="rounded-md bg-black/50 px-2 py-1 text-primary">LVL 12 · 4 350 XP</span>
            <span className="rounded-md bg-black/50 px-2 py-1 text-gold">GC 780</span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-4 font-mono text-[10px]">
            <div className="glass rounded-xl px-3 py-2">
              <div className="mb-1 flex justify-between text-white/80">
                <span>HP</span><span className="text-primary">86/100</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-primary-dark to-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* glow under phone */}
      <div className="absolute -bottom-8 left-1/2 h-10 w-3/4 -translate-x-1/2 rounded-full bg-primary/20 blur-2xl" />
    </div>
  );
}

export default function Home() {
  const { t, lang, setLang } = useT();
  useReveal();
  const [menuOpen, setMenuOpen] = useState(false);

  const FEATURES = [
    { title: t("features.gps"), desc: t("features.gps_desc"), icon: "target" },
    { title: t("features.clans"), desc: t("features.clans_desc"), icon: "flag" },
    { title: t("features.garage"), desc: t("features.garage_desc"), icon: "car" },
    { title: t("features.arena"), desc: t("features.arena_desc"), icon: "trophy" },
    { title: t("features.items"), desc: t("features.items_desc"), icon: "zap" },
    { title: t("features.music"), desc: t("features.music_desc"), icon: "headphones" },
  ];

  const PRICING = [
    { name: t("pricing.free"), price: t("pricing.free_price"), period: t("pricing.free_period"), features: t("pricing.free_features"), cta: t("pricing.free_cta"), highlighted: false, icon: "compass", href: `${GAME_URL}/auth/register` },
    { name: t("pricing.vip"), price: t("pricing.vip_price"), period: t("pricing.vip_period"), features: t("pricing.vip_features"), cta: t("pricing.vip_cta"), highlighted: true, icon: "crown", href: `${GAME_URL}/vip` },
    { name: t("pricing.biz"), price: t("pricing.biz_price"), period: t("pricing.biz_period"), features: t("pricing.biz_features"), cta: t("pricing.biz_cta"), highlighted: false, icon: "briefcase", href: "/business" },
  ];

  const FAQ = [1, 2, 3, 4, 5].map((i) => ({ q: t(`faq.q${i}`), a: t(`faq.a${i}`) }));
  const ticker: string[] = t("ticker");

  const navLinks = (
    <>
      <a href="#how" className="text-sm text-muted transition-colors hover:text-primary">{t("nav.how")}</a>
      <a href="#features" className="text-sm text-muted transition-colors hover:text-primary">{t("nav.features")}</a>
      <a href="#gangs" className="text-sm text-muted transition-colors hover:text-primary">{t("nav.gangs")}</a>
      <a href="#pricing" className="text-sm text-muted transition-colors hover:text-primary">{t("nav.pricing")}</a>
      <a href="#faq" className="text-sm text-muted transition-colors hover:text-primary">FAQ</a>
    </>
  );

  return (
    <div className="min-h-screen bg-darker">
      <Head>
        <title>GridRunner — GPS-игра: захватывай районы своего города</title>
        <meta name="description" content="GridRunner превращает реальные улицы в поле боя. Ходи и катайся по городу, захватывай зоны для своей банды, ставь ловушки, прокачивай ELO. Играй в браузере или на Android." />
        <meta property="og:title" content="GridRunner — твой город, твоя арена" />
        <meta property="og:description" content="GPS-игра с территориальным захватом. Банды, зоны, ловушки, ELO-рейтинг — на реальных улицах твоего города." />
        <meta property="og:type" content="website" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0d2137" />
      </Head>
      {/* Nav */}
      <nav className="glass fixed top-0 left-0 right-0 z-50 border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <a href="/" className="font-mono text-xl font-bold tracking-tight">
            <span className="neon-text">GRID</span><span className="text-white">RUNNER</span>
          </a>
          <div className="hidden items-center gap-6 md:flex">
            {navLinks}
            <button onClick={() => setLang(lang === "ru" ? "en" : "ru")} className="font-mono text-xs text-muted transition-colors hover:text-white">
              {lang === "ru" ? "EN" : "RU"}
            </button>
            <a href={GAME_URL} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-darker shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark hover:shadow-primary/40">
              {t("nav.play")}
            </a>
          </div>
          <button className="p-1 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="menu">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
        {menuOpen && (
          <div className="flex flex-col gap-4 border-t border-white/5 px-5 py-4 md:hidden" onClick={() => setMenuOpen(false)}>
            {navLinks}
            <div className="flex items-center gap-4">
              <a href={GAME_URL} className="flex-1 rounded-lg bg-primary px-5 py-2 text-center text-sm font-bold text-darker">{t("nav.play")}</a>
              <button onClick={(e) => { e.stopPropagation(); setLang(lang === "ru" ? "en" : "ru"); }} className="font-mono text-xs text-muted">{lang === "ru" ? "EN" : "RU"}</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden px-5 pt-24 pb-12">
        <div className="cyber-grid" />
        <div className="scanline" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(0,230,118,0.10),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(0,229,255,0.06),transparent_55%)]" />

        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 font-mono text-xs text-primary">
              <span className="pulse-dot h-2 w-2 rounded-full bg-primary" />
              {t("hero.badge")}
            </div>
            <h1 className="mb-6 text-4xl font-extrabold leading-[1.05] sm:text-6xl lg:text-7xl">
              <span className="gradient-text flicker">{t("hero.title")}</span>
            </h1>
            <p className="mx-auto mb-9 max-w-xl text-base leading-relaxed text-muted sm:text-lg lg:mx-0">{t("hero.desc")}</p>
            <div className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start sm:justify-center">
              <a href={GAME_URL} className="group flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-9 py-4 font-bold text-darker shadow-xl shadow-primary/30 transition-all hover:bg-primary-dark hover:shadow-primary/50 sm:w-auto">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                {t("hero.cta")}
              </a>
              <a href="/gridrunner.apk" className="neon-border flex w-full items-center justify-center gap-3 rounded-xl bg-surface/40 px-9 py-4 font-bold text-primary transition-all hover:bg-surface/80 sm:w-auto">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.463 11.463 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 0 0 1 18h22a10.78 10.78 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" /></svg>
                {t("hero.cta2")}
              </a>
            </div>
            {/* stats */}
            <div className="mt-12 grid max-w-md grid-cols-3 gap-4 font-mono max-lg:mx-auto">
              <div className="glass rounded-xl px-3 py-4 text-center">
                <div className="text-2xl font-bold text-primary"><Counter target={400} suffix="+" /></div>
                <div className="mt-1 text-[11px] text-muted">{t("stats.zones")}</div>
              </div>
              <div className="glass rounded-xl px-3 py-4 text-center">
                <div className="text-2xl font-bold text-accent"><Counter target={120} suffix="+" /></div>
                <div className="mt-1 text-[11px] text-muted">{t("stats.pois")}</div>
              </div>
              <div className="glass rounded-xl px-3 py-4 text-center">
                <div className="text-2xl font-bold text-gold"><Counter target={4} /></div>
                <div className="mt-1 text-[11px] text-muted">{t("stats.vehicles")}</div>
              </div>
            </div>
          </div>

          <div className="max-lg:order-first">
            <PhoneMockup />
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce font-mono text-[11px] text-muted">
          ↓ {t("hero.scroll")}
        </div>
      </section>

      {/* Ticker */}
      <div className="overflow-hidden border-y border-primary/15 bg-surface/30 py-3">
        <div className="ticker-track flex w-max gap-8 font-mono text-xs tracking-[0.25em] text-primary/70">
          {[...ticker, ...ticker].map((w, i) => (
            <span key={i} className="flex items-center gap-8 whitespace-nowrap">{w} <span className="text-primary/30">◆</span></span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section id="how" className="relative px-5 py-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="reveal mb-3 text-center text-3xl font-bold sm:text-4xl">{t("how.title")}</h2>
          <p className="reveal mx-auto mb-16 max-w-xl text-center text-muted">{t("how.subtitle")}</p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { n: "01", title: t("how.s1"), desc: t("how.s1_desc"), icon: "map" },
              { n: "02", title: t("how.s2"), desc: t("how.s2_desc"), icon: "pin" },
              { n: "03", title: t("how.s3"), desc: t("how.s3_desc"), icon: "flag" },
            ].map((s, i) => (
              <div key={s.n} className="reveal glass card-hover relative rounded-2xl p-8" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="absolute right-6 top-5 font-mono text-5xl font-bold text-primary/10">{s.n}</div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon name={s.icon} /></div>
                <h3 className="mb-2 text-lg font-semibold text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative px-5 py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,230,118,0.05),transparent_65%)]" />
        <div className="relative mx-auto max-w-6xl">
          <h2 className="reveal mb-3 text-center text-3xl font-bold sm:text-4xl">{t("features.title")}</h2>
          <p className="reveal mx-auto mb-16 max-w-xl text-center text-muted">{t("features.subtitle")}</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="reveal glass card-hover group rounded-2xl p-8" style={{ transitionDelay: `${(i % 3) * 100}ms` }}>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-primary/20"><Icon name={f.icon} /></div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gangs */}
      <section id="gangs" className="px-5 py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="reveal mb-3 text-center text-3xl font-bold sm:text-4xl">{t("gangs.title")}</h2>
          <p className="reveal mx-auto mb-16 max-w-xl text-center text-muted">{t("gangs.subtitle")}</p>
          <div className="grid items-stretch gap-6 md:grid-cols-2">
            {/* Join a gang */}
            <div className="reveal glass card-hover rounded-2xl p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon name="users" /></div>
              <h3 className="mb-2 text-lg font-semibold">{t("gangs.join")}</h3>
              <p className="mb-6 text-sm leading-relaxed text-muted">{t("gangs.join_desc")}</p>
              <ul className="space-y-3">
                {[t("gangs.join_f1"), t("gangs.join_f2"), t("gangs.join_f3")].map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted">
                    <span className="mt-0.5 text-primary">▸</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            {/* Create your own — decorative creation form mockup */}
            <div className="reveal glass card-hover rounded-2xl p-8" style={{ transitionDelay: "120ms" }}>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon name="flag" /></div>
              <h3 className="mb-2 text-lg font-semibold">{t("gangs.create")}</h3>
              <p className="mb-6 text-sm leading-relaxed text-muted">{t("gangs.create_desc")}</p>
              <div className="glass-strong select-none rounded-xl p-4 font-mono text-xs" aria-hidden="true">
                <div className="mb-1.5 text-muted">{t("gangs.form_name")}</div>
                <div className="mb-4 flex items-center gap-1 rounded-lg bg-black/30 px-3 py-2.5 text-white/90">
                  {lang === "ru" ? "Ночные Коты" : "Night Cats"}
                  <span className="inline-block h-4 w-[2px] animate-pulse bg-primary" />
                </div>
                <div className="mb-1.5 text-muted">{t("gangs.form_color")}</div>
                <div className="mb-4 flex gap-2">
                  {["#00e676", "#ff1744", "#2979ff", "#ffd54f", "#b388ff"].map((c, i) => (
                    <span key={c} className="h-6 w-6 rounded-full" style={{ background: c, boxShadow: i === 0 ? `0 0 10px ${c}` : "none", outline: i === 0 ? "2px solid rgba(255,255,255,0.7)" : "none", outlineOffset: 2 }} />
                  ))}
                </div>
                <div className="rounded-lg bg-primary py-2.5 text-center font-bold text-darker">{t("gangs.form_btn")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-5 py-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="reveal mb-3 text-center text-3xl font-bold sm:text-4xl">{t("pricing.title")}</h2>
          <p className="reveal mx-auto mb-16 max-w-xl text-center text-muted">{t("pricing.subtitle")}</p>
          <div className="grid items-start gap-8 md:grid-cols-3">
            {PRICING.map((p, i) => (
              <div key={p.name} className={`reveal relative rounded-2xl p-8 ${p.highlighted ? "glass-strong neon-border md:-mt-4 md:pb-12" : "glass"}`} style={{ transitionDelay: `${i * 120}ms` }}>
                {p.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 font-mono text-[11px] font-bold text-darker">{t("pricing.popular")}</div>
                )}
                <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${p.highlighted ? "bg-primary/20 text-primary" : "bg-white/5 text-muted"}`}><Icon name={p.icon} /></div>
                <h3 className="mb-1 font-mono text-lg font-bold">{p.name}</h3>
                <div className="mb-1">
                  <span className={`text-4xl font-extrabold ${p.highlighted ? "text-primary" : ""}`}>{p.price}</span>
                  <span className="text-sm text-muted"> {p.period}</span>
                </div>
                {p.highlighted && <div className="mb-4 font-mono text-[11px] text-gold">{t("pricing.yearly_hint")}</div>}
                <ul className="mb-8 mt-4 space-y-3">
                  {(typeof p.features === "string" ? p.features.split("\n") : p.features).map((f: string) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted">
                      <span className="mt-0.5 text-primary">▸</span> {f}
                    </li>
                  ))}
                </ul>
                <a href={p.href} className={`block rounded-xl py-3 text-center text-sm font-bold transition-all ${p.highlighted ? "bg-primary text-darker shadow-lg shadow-primary/30 hover:bg-primary-dark" : "border border-white/10 text-white hover:border-primary/40 hover:bg-white/5"}`}>{p.cta}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="px-5 py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="reveal mb-3 text-center text-3xl font-bold sm:text-4xl">{t("download.title")}</h2>
          <p className="reveal mx-auto mb-16 max-w-xl text-center text-muted">{t("download.subtitle")}</p>
          <div className="grid gap-6 md:grid-cols-3">
            <a href={GAME_URL} className="reveal glass card-hover group rounded-2xl p-8">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon name="globe" className="h-7 w-7" /></div>
                <div>
                  <h3 className="text-lg font-bold">{t("download.web")}</h3>
                  <p className="text-xs text-muted">{t("download.web_desc")}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-primary/10 px-5 py-3">
                <span className="font-mono text-sm font-bold text-primary">{t("nav.play")}</span>
                <svg className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>
            </a>
            <a href="/gridrunner.apk" className="reveal glass card-hover group rounded-2xl p-8" style={{ transitionDelay: "100ms" }}>
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon name="android" className="h-7 w-7" /></div>
                <div>
                  <h3 className="text-lg font-bold">Android</h3>
                  <p className="text-xs text-muted">{t("download.apk_desc")}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-5 py-3">
                <span className="font-mono text-sm font-bold">{t("download.apk")}</span>
                <svg className="h-5 w-5 text-primary transition-transform group-hover:translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
              </div>
            </a>
            <a href={GAME_URL} className="reveal glass card-hover group rounded-2xl p-8" style={{ transitionDelay: "200ms" }}>
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.31.12 2.29.64 2.94 1.6-2.73 1.59-2.2 4.86.44 5.74-.5 1.4-1.36 2.7-2.03 3.67M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t("download.ios")}</h3>
                  <p className="text-xs text-muted">{t("download.ios_desc")}</p>
                </div>
              </div>
              <ol className="mb-4 space-y-2 font-mono text-xs text-muted">
                <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/15 text-[10px] font-bold text-primary">1</span>{t("download.ios_s1")}</li>
                <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/15 text-[10px] font-bold text-primary">2</span><span className="inline-flex items-center gap-1.5">{t("download.ios_s2")}<Icon name="share" className="h-3.5 w-3.5 text-primary" /></span></li>
                <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/15 text-[10px] font-bold text-primary">3</span>{t("download.ios_s3")}</li>
              </ol>
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-5 py-3">
                <span className="font-mono text-sm font-bold">{t("download.ios_btn")}</span>
                <svg className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-5 py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="reveal mb-14 text-center text-3xl font-bold sm:text-4xl">{t("faq.title")}</h2>
          <div className="space-y-4">
            {FAQ.map((f, i) => (
              <details key={i} className="faq reveal glass rounded-2xl px-6 py-5" style={{ transitionDelay: `${i * 80}ms` }}>
                <summary className="flex items-center justify-between gap-4 font-semibold">
                  <span>{f.q}</span>
                  <span className="faq-icon shrink-0 font-mono text-xl text-primary">+</span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-5 py-28">
        <div className="cyber-grid opacity-60" />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="reveal glass-strong rounded-3xl p-10 sm:p-16">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">{t("cta.title")}</h2>
            <p className="mb-9 text-muted">{t("cta.desc")}</p>
            <a href={GAME_URL} className="inline-flex items-center gap-3 rounded-xl bg-primary px-10 py-4 font-bold text-darker shadow-lg shadow-primary/30 transition-all hover:bg-primary-dark hover:shadow-primary/50">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              {t("cta.btn")}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted sm:flex-row">
          <span className="font-mono">© 2026 <span className="text-primary">GRID</span>RUNNER. {t("footer.rights")}</span>
          <span className="font-mono text-xs text-muted/60">{t("footer.tagline")}</span>
          <div className="flex gap-6">
            <a href="https://t.me/do_re_mi_do_re_do" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">{lang === "ru" ? "Поддержка" : "Support"}</a>
            <a href={GAME_URL} className="transition-colors hover:text-primary">{t("nav.play")}</a>
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-6xl flex-col items-center justify-center gap-2 border-t border-white/5 pt-6 text-xs text-muted/70 sm:flex-row sm:gap-8">
          <a href="https://telegra.ph/Politika-konfidencialnosti-06-21-31" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">
            {lang === "ru" ? "Политика конфиденциальности" : "Privacy Policy"}
          </a>
          <a href="https://telegra.ph/Polzovatelskoe-soglashenie-04-01-19" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">
            {lang === "ru" ? "Пользовательское соглашение" : "Terms of Service"}
          </a>
        </div>
      </footer>
    </div>
  );
}
