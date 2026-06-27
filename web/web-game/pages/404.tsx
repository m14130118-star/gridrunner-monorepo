import { useState } from 'react';
import Link from 'next/link';
import { useT } from '../src/lib/i18n';

export default function Custom404() {
  const { t, lang } = useT();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || !email.includes('.')) return;
    try {
      const list = JSON.parse(localStorage.getItem('gridrunner_waitlist') || '[]');
      if (!list.includes(email)) list.push(email);
      localStorage.setItem('gridrunner_waitlist', JSON.stringify(list));
    } catch {}
    setSubscribed(true);
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 8, opacity: 0.3 }}>🚧</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          {lang === 'ru' ? 'Скоро будет' : 'Coming Soon'}
        </h1>
        <p style={{ fontSize: 15, opacity: 0.5, marginBottom: 32, lineHeight: 1.6 }}>
          {lang === 'ru'
            ? 'Мы строим нативное приложение под iOS и Android. Оставь почту — скажем, когда всё готово.'
            : 'We\'re building native iOS and Android apps. Leave your email — we\'ll let you know when it\'s ready.'}
        </p>

        {subscribed ? (
          <div style={{ padding: 24, borderRadius: 16, background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.15)' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>✅</div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>{lang === 'ru' ? 'Ты в списке!' : 'You\'re on the list!'}</p>
            <p style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>
              {lang === 'ru' ? 'Напишем, как только приложение выйдет' : 'We\'ll write when the app launches'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder={lang === 'ru' ? 'your@email.com' : 'your@email.com'}
              style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: 14, outline: 'none' }} />
            <button type="submit" style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: '#00e676', color: '#000', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {lang === 'ru' ? 'Сообщить' : 'Notify me'}
            </button>
          </form>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
          <Link href="/" style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none', color: 'inherit', fontSize: 14, fontWeight: 600 }}>
            ← {t('nav.home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
