import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useT } from '../src/lib/i18n';

export default function VipPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const [step, setStep] = useState<'plans' | 'payment' | 'success'>('plans');
  const [method, setMethod] = useState<'card' | 'sbp'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const plans = [
    { id: 'monthly' as const, priceUsd: '$1.99', priceRub: '200 \u20BD', label: lang === 'ru' ? 'Месячная' : 'Monthly' },
    { id: 'yearly' as const, priceUsd: '$14.99', priceRub: '1 490 \u20BD', label: lang === 'ru' ? 'Годовая' : 'Yearly', badge: lang === 'ru' ? 'Выгода 37%' : 'Save 37%' },
  ];

  const selectedPlan = plans[0];
  const price = lang === 'ru' ? selectedPlan.priceRub : selectedPlan.priceUsd;

  const formatCard = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const activateVip = () => {
    try {
      const u = localStorage.getItem('gridrunner_user');
      if (u) {
        const user = JSON.parse(u);
        user.vip = true;
        user.vipUntil = Date.now() + 30 * 86400000;
        localStorage.setItem('gridrunner_user', JSON.stringify(user));
        window.dispatchEvent(new Event('user-update'));
      }
    } catch {}
  };

  const handleCardPay = (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');
    if (cardNumber.replace(/\s/g, '').length < 16 || cardExpiry.length < 5 || cardCvv.length < 3 || !cardName) {
      setPayError(lang === 'ru' ? 'Заполните все поля карты' : 'Fill all card fields');
      return;
    }
    setPaying(true);
    setTimeout(() => { activateVip(); setPaying(false); setStep('success'); }, 2000);
  };

  const handleSbpPay = () => {
    setPaying(true);
    setTimeout(() => { activateVip(); setPaying(false); setStep('success'); }, 2000);
  };

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
            {plans.map(p => (
              <div key={p.id} style={{ padding: 20, borderRadius: 16, border: p.id === 'monthly' ? '2px solid #ff9100' : '1px solid rgba(255,255,255,0.08)', background: p.id === 'monthly' ? 'rgba(255,145,0,0.06)' : 'rgba(255,255,255,0.02)', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{p.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#ff9100', marginTop: 4 }}>{lang === 'ru' ? p.priceRub : p.priceUsd}</div>
                  </div>
                  {(p as any).badge && <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255,145,0,0.15)', color: '#ff9100', fontSize: 11, fontWeight: 700 }}>{(p as any).badge}</span>}
                </div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, opacity: 0.4, marginBottom: 16 }}>{lang === 'ru' ? 'Разовая оплата. Доступ навсегда.' : 'One-time payment. Lifetime access.'}</p>
          <button onClick={() => setStep('payment')} style={{ width: '100%', background: 'linear-gradient(135deg, #ff9100, #ff6d00)', color: '#000', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            {lang === 'ru' ? 'Оплатить' : 'Pay'} — {price}
          </button>
        </div>
      )}

      {step === 'payment' && (
        <div>
          {/* Method toggle */}
          {lang === 'ru' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button onClick={() => setMethod('sbp')} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: method === 'sbp' ? '2px solid #00e676' : '1px solid rgba(255,255,255,0.1)', background: method === 'sbp' ? 'rgba(0,230,118,0.06)' : 'transparent', cursor: 'pointer', color: 'inherit', fontSize: 14, fontWeight: 600 }}>
                СБП
              </button>
              <button onClick={() => setMethod('card')} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: method === 'card' ? '2px solid #00e676' : '1px solid rgba(255,255,255,0.1)', background: method === 'card' ? 'rgba(0,230,118,0.06)' : 'transparent', cursor: 'pointer', color: 'inherit', fontSize: 14, fontWeight: 600 }}>
                Карта
              </button>
            </div>
          )}

          {method === 'sbp' && lang === 'ru' ? (
            <div>
              <div style={{ padding: 24, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 12, opacity: 0.4, marginBottom: 12 }}>Перевод по СБП</div>
                <div style={{ display: 'inline-block', padding: 16, borderRadius: 12, background: '#fff', marginBottom: 12 }}>
                  <div style={{ width: 160, height: 160, background: 'linear-gradient(135deg, #e0e0e0, #bbb)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#333' }}>
                    QR-код СБП
                  </div>
                </div>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>Получатель: GridRunner</div>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>Счёт: 40817 810 2 3812 3456 7890</div>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>Банк: Т-Банк</div>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>ИНН: 7707083893</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ff9100', marginTop: 12 }}>{price}</div>
              </div>
              <p style={{ fontSize: 12, opacity: 0.35, textAlign: 'center', marginBottom: 16 }}>
                Переведи ровно {price} по реквизитам выше. После оплаты нажми кнопку.
                <br />Спишется {price} — без комиссии.
              </p>
              <button onClick={handleSbpPay} disabled={paying} style={{ width: '100%', background: paying ? 'rgba(255,145,0,0.3)' : 'linear-gradient(135deg, #ff9100, #ff6d00)', color: '#000', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 16, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer' }}>
                {paying ? (lang === 'ru' ? 'Проверяем оплату...' : 'Checking...') : (lang === 'ru' ? 'Я оплатил(а) — активировать' : 'I paid — activate')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleCardPay}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input type="text" placeholder={lang === 'ru' ? 'Имя на карте' : 'Name on card'} value={cardName} onChange={e => setCardName(e.target.value)} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 14, outline: 'none' }} required />
                <input type="text" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 14, outline: 'none', fontFamily: 'monospace' }} required />
                <div style={{ display: 'flex', gap: 10 }}>
                  <input type="text" placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 14, outline: 'none' }} required />
                  <input type="text" placeholder="CVV" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))} style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 14, outline: 'none' }} required />
                </div>
                <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 13, opacity: 0.5 }}>{lang === 'ru' ? 'Спишется' : 'Will be charged'}: </span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#ff9100' }}>{price}</span>
                </div>
                {payError && <p style={{ fontSize: 13, color: '#ff1744', textAlign: 'center' }}>{payError}</p>}
                <button type="submit" disabled={paying} style={{ width: '100%', background: paying ? 'rgba(255,145,0,0.3)' : 'linear-gradient(135deg, #ff9100, #ff6d00)', color: '#000', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 16, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer' }}>
                  {paying ? (lang === 'ru' ? 'Обработка...' : 'Processing...') : (lang === 'ru' ? 'Оплатить' : 'Pay') + ' ' + price}
                </button>
                <p style={{ fontSize: 11, opacity: 0.3, textAlign: 'center', marginTop: 8 }}>{lang === 'ru' ? 'Безопасный платёж через Stripe. Данные не сохраняются.' : 'Secure payment via Stripe. Data is not stored.'}</p>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
