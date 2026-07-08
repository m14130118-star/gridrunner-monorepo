import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useT } from '../src/lib/i18n';
import { getApiUrl } from '../src/lib/api';

export default function VipPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const [step, setStep] = useState<'plans' | 'payment' | 'success'>('plans');
  const [selectedPlanId, setSelectedPlanId] = useState('vip_monthly');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const autoConfirmed = useRef(false);

  // Auto-confirm after Platega redirect
  useEffect(() => {
    if (autoConfirmed.current) return;
    if (router.query.success === '1') {
      const s = (router.query.session_id as string) || sessionId;
      if (s) { autoConfirmed.current = true; setSessionId(s); setStep('payment'); confirmPaymentWithId(s); }
    }
  }, [router.query.success, router.query.session_id]);

  const confirmPaymentWithId = async (sid: string) => {
    setPaying(true);
    try {
      const r = await fetch(getApiUrl() + '/api/v1/payment/confirm', {
        method: 'POST', ...hdrs(), body: JSON.stringify({ session_id: sid }),
      });
      const d = await r.json();
      if (d.success) {
        try {
          const u = localStorage.getItem('gridrunner_user');
          if (u) { const user = JSON.parse(u); user.vip = true; user.vipUntil = d.vip_until; localStorage.setItem('gridrunner_user', JSON.stringify(user)); window.dispatchEvent(new Event('user-update')); }
        } catch {}
        setStep('success');
      }
    } catch {}
    setPaying(false);
  };

  const plans = [
    { id: 'vip_monthly', priceUsd: '$1.99', priceRub: '200 ₽', label: lang === 'ru' ? 'Месячная' : 'Monthly', planLabel: lang === 'ru' ? 'VIP Monthly' : 'VIP Monthly' },
    { id: 'vip_yearly', priceUsd: '$14.99', priceRub: '1 490 ₽', label: lang === 'ru' ? 'Годовая' : 'Yearly', badge: lang === 'ru' ? 'Выгода 37%' : 'Save 37%' },
  ];

  const activePlan = plans.find(p => p.id === selectedPlanId) || plans[0];
  const price = lang === 'ru' ? activePlan.priceRub : activePlan.priceUsd;

  const token = typeof window !== 'undefined' ? localStorage.getItem('gridrunner_token') : null;
  const hdrs = () => ({ headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } });

  const createSession = async () => {
    setPayError('');
    try {
      const r = await fetch(getApiUrl() + '/api/v1/payment/create-session', {
        method: 'POST', ...hdrs(), body: JSON.stringify({ plan_id: selectedPlanId }),
      });
      const d = await r.json();
      if (d.success) {
        setSessionId(d.session_id);
        setPaymentUrl(d.payment_url || '');
        setStep('payment');
      } else {
        setPayError(d.message || 'Session creation failed');
      }
    } catch {
      setPayError('Network error');
    }
  };

  const confirmPayment = async () => {
    if (!sessionId) return;
    setPaying(true);
    try {
      const r = await fetch(getApiUrl() + '/api/v1/payment/confirm', {
        method: 'POST', ...hdrs(), body: JSON.stringify({ session_id: sessionId }),
      });
      const d = await r.json();
      if (d.success) {
        try {
          const u = localStorage.getItem('gridrunner_user');
          if (u) {
            const user = JSON.parse(u);
            user.vip = true;
            user.vipUntil = d.vip_until || Date.now() + 30 * 86400000;
            localStorage.setItem('gridrunner_user', JSON.stringify(user));
            window.dispatchEvent(new Event('user-update'));
          }
        } catch {}
        setPaying(false);
        setStep('success');
      } else {
        setPayError(d.message || 'Confirmation failed');
        setPaying(false);
      }
    } catch {
      setPayError('Network error');
      setPaying(false);
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
        <p style={{ opacity: 0.5 }}>Войди в профиль, чтобы купить VIP</p>
        <Link href="/auth/login" style={{ color: '#ff9100' }}>Войти</Link>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #ff9100, #ff6d00)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, fontWeight: 800, color: '#000' }}>V</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, background: 'linear-gradient(135deg, #ff9100, #ff6d00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{lang === 'ru' ? 'VIP активирован!' : 'VIP activated!'}</h1>
        <p style={{ opacity: 0.5, marginBottom: 24 }}>{lang === 'ru' ? 'Автомобиль открыт. Спасибо за поддержку!' : 'Car mode unlocked. Thanks for your support!'}</p>
        <Link href="/profile" style={{ background: '#00e676', color: '#000', border: 'none', borderRadius: 12, padding: '14px 36px', fontSize: 16, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>{t('trip.start')}</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '60px 16px' }}>
      <Link href="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, color: 'inherit', textDecoration: 'none', fontSize: 14, opacity: 0.5 }}>← {lang === 'ru' ? 'Назад' : 'Back'}</Link>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, background: 'linear-gradient(135deg, #ff9100, #ff6d00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('landing.vip')}</h1>
      <p style={{ opacity: 0.4, fontSize: 14, marginBottom: 28 }}>{t('landing.vip_desc')}</p>

      {step === 'plans' && (
        <div>
          <div style={{ marginBottom: 24 }}>
            {plans.map(p => {
              const active = p.id === selectedPlanId;
              return (
                <div key={p.id} onClick={() => setSelectedPlanId(p.id)}
                  style={{ padding: 16, borderRadius: 12, border: active ? '2px solid #ff9100' : '1px solid rgba(255,255,255,0.06)', background: active ? 'rgba(255,145,0,0.06)' : 'rgba(255,255,255,0.02)', marginBottom: 8, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#ff9100', marginTop: 2 }}>{lang === 'ru' ? p.priceRub : p.priceUsd}</div>
                    </div>
                    {(p as any).badge && <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255,145,0,0.15)', color: '#ff9100', fontSize: 11, fontWeight: 700 }}>{(p as any).badge}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {payError && <p style={{ color: '#ff1744', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>{payError}</p>}
          <button onClick={createSession} style={{ width: '100%', background: 'linear-gradient(135deg, #ff9100, #ff6d00)', color: '#000', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            {lang === 'ru' ? 'Оплатить' : 'Pay'} — {price}
          </button>
        </div>
      )}

      {step === 'payment' && (
        <div>
          <div style={{ padding: 24, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, opacity: 0.4, marginBottom: 12 }}>Оплата картой или СБП</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#ff9100', marginBottom: 8 }}>{price}</div>
            <div style={{ fontSize: 11, opacity: 0.3, marginBottom: 16 }}>Visa, MasterCard, МИР, СБП</div>

            {paymentUrl && (
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', width: '100%', padding: '14px 0', borderRadius: 12, background: 'linear-gradient(135deg, #ff9100, #ff6d00)', color: '#000', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', marginBottom: 12, textAlign: 'center' }}>
                {lang === 'ru' ? 'Перейти к оплате' : 'Proceed to payment'}
              </a>
            )}
          </div>

          {payError && <p style={{ color: '#ff1744', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>{payError}</p>}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginTop: 8 }}>
            <p style={{ fontSize: 11, opacity: 0.4, textAlign: 'center', marginBottom: 12 }}>
              {lang === 'ru' ? 'Уже оплатили? Нажмите кнопку ниже, чтобы активировать VIP' : 'Already paid? Click below to activate VIP'}
            </p>
            <button onClick={confirmPayment} disabled={paying}
              style={{ width: '100%', background: paying ? 'rgba(255,145,0,0.3)' : 'rgba(255,145,0,0.1)', border: '1px solid rgba(255,145,0,0.3)', borderRadius: 12, padding: '14px 0', fontSize: 16, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer', color: '#ff9100', fontFamily: 'inherit' }}>
              {paying ? (lang === 'ru' ? 'Проверяем...' : 'Checking...') : (lang === 'ru' ? 'Я оплатил — активировать' : 'I paid — activate')}
            </button>
          </div>

          {/* Юридические документы — обязательны для платёжного провайдера */}
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', fontSize: 11, lineHeight: 1.8 }}>
            <p style={{ opacity: 0.35, marginBottom: 6 }}>
              {lang === 'ru'
                ? 'Оплачивая подписку, вы соглашаетесь с условиями:'
                : 'By paying you agree to the terms:'}
            </p>
            <a href="https://telegra.ph/Polzovatelskoe-soglashenie-04-01-19" target="_blank" rel="noopener noreferrer"
              style={{ color: '#00e676', opacity: 0.7, textDecoration: 'none', display: 'block' }}>
              {lang === 'ru' ? 'Пользовательское соглашение' : 'Terms of Service'}
            </a>
            <a href="https://telegra.ph/Politika-konfidencialnosti-06-21-31" target="_blank" rel="noopener noreferrer"
              style={{ color: '#00e676', opacity: 0.7, textDecoration: 'none', display: 'block' }}>
              {lang === 'ru' ? 'Политика конфиденциальности' : 'Privacy Policy'}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
