import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">GridRunner</span>
          <p className="footer-desc">
            Urban exploration game. Open source under MIT license.
          </p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Game</h4>
            <Link href="/profile">Profile</Link>
            <Link href="/garage">Garage</Link>
            <Link href="/arena">Arena</Link>
            <Link href="/vip">VIP</Link>
          </div>
          <div className="footer-col">
            <h4>Community</h4>
            <Link href="/trips">Trips</Link>
            <Link href="/news">News</Link>
            <Link href="/settings">Settings</Link>
          </div>
          <div className="footer-col">
            <h4>Tech</h4>
            <a href="https://github.com/anomalyco/gridrunner" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="#" onClick={(e) => { e.preventDefault(); document.querySelector('.landing')?.scrollIntoView({ behavior: 'smooth' }); }}>Top</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>&copy; {new Date().getFullYear()} GridRunner. Built with Next.js + Express + Capacitor.</span>
      </div>

      <style jsx>{`
        .footer {
          border-top: 1px solid var(--border);
          background: rgba(10,26,15,0.6);
          backdrop-filter: blur(12px);
        }
        .footer-inner {
          max-width: var(--max-w, 1200px);
          margin: 0 auto;
          padding: 48px 24px 32px;
          display: flex;
          gap: 48px;
          flex-wrap: wrap;
        }
        .footer-brand { flex: 1; min-width: 200px; }
        .footer-logo {
          font-size: 20px; font-weight: 800;
          background: linear-gradient(135deg, var(--green), var(--green-light));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .footer-desc { font-size: 13px; opacity: 0.4; margin: 8px 0 0; max-width: 280px; line-height: 1.5; }
        .footer-links {
          display: flex; gap: 40px; flex-wrap: wrap;
        }
        .footer-col h4 {
          font-size: 13px; font-weight: 700; margin: 0 0 12px;
          text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.5;
        }
        .footer-col a {
          display: block; font-size: 14px; opacity: 0.5;
          margin-bottom: 8px; transition: opacity 0.2s; cursor: pointer;
        }
        .footer-col a:hover { opacity: 1; color: var(--green); }
        .footer-bottom {
          border-top: 1px solid var(--border);
          padding: 16px 24px;
          text-align: center;
          font-size: 12px; opacity: 0.3;
        }
        @media (max-width: 639px) {
          .footer-inner { flex-direction: column; gap: 32px; padding: 32px 16px 24px; }
          .footer-links { gap: 24px; }
        }
      `}</style>
    </footer>
  );
}
