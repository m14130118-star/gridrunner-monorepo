import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

export default function Business() {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_AUTH_URL?.replace('/api/v1', '') || 'https://gridrunner-api.vercel.app';
      const res = await fetch(`${apiBase}/api/v1/payment/business-pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 1000, paymentMethod: 2 }) });
      const data = await res.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        alert('Ошибка: ' + (data.message || 'Не удалось создать платеж'));
      }
    } catch {
      alert('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#e0f0e0', fontFamily: 'monospace' }}>
      <Head><title>GridRunner — Бизнесу</title></Head>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '80px 20px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 40, color: '#00ffcc', textDecoration: 'none', fontSize: 14, opacity: 0.6 }}>← На главную</Link>
        
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: 2, marginBottom: 8 }}>GRIDRUNNER <span style={{ color: '#00ffcc' }}>BUSINESS</span></h1>
        <p style={{ fontSize: 14, opacity: 0.4, marginBottom: 40, maxWidth: 500 }}>Привлеки клиентов через дополненную реальность. Твоя точка — на карте города в нашей игре.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: 24, borderRadius: 12, border: '1px solid rgba(0,255,200,0.15)', background: 'rgba(0,255,200,0.03)' }}>
            <svg viewBox='0 0 24 24' width='26' height='26' fill='none' stroke='#00ffcc' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round' style={{ marginBottom: 8 }}><path d='M12 21.5S5 15.2 5 10a7 7 0 1 1 14 0c0 5.2-7 11.5-7 11.5z' /><circle cx='12' cy='10' r='2.6' /></svg>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Точка интереса на карте</h3>
            <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>Твой бизнес появится на игровой карте. Игроки будут получать уведомления, когда проходят рядом, и заходить к тебе за бонусами.</p>
          </div>

          <div style={{ padding: 24, borderRadius: 12, border: '1px solid rgba(255,0,85,0.15)', background: 'rgba(255,0,85,0.03)' }}>
            <svg viewBox='0 0 24 24' width='26' height='26' fill='none' stroke='#ff0055' strokeWidth='1.7' style={{ marginBottom: 8 }}><circle cx='12' cy='12' r='9' /><circle cx='12' cy='12' r='4.5' /><circle cx='12' cy='12' r='0.6' fill='#ff0055' /></svg>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Квесты и акции</h3>
            <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>Создавай квесты: «Приди, отметься, получи скидку». Игроки выполняют задания — ты получаешь живых клиентов.</p>
          </div>

          <div style={{ padding: 24, borderRadius: 12, border: '1px solid rgba(255,215,0,0.15)', background: 'rgba(255,215,0,0.03)' }}>
            <svg viewBox='0 0 24 24' width='26' height='26' fill='none' stroke='#ffd700' strokeWidth='1.7' strokeLinecap='round' style={{ marginBottom: 8 }}><path d='M4 20V10M10 20V4M16 20v-8M21 20H3' /></svg>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Аналитика посещений</h3>
            <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>Дашборд с данными: сколько игроков зашло, в какое время, какой маршрут построили до тебя.</p>
          </div>
        </div>

        <div style={{ marginTop: 40, padding: 24, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
          <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 16 }}>Хочешь добавить свой бизнес на карту GridRunner? Цена договорная.</p>
          <a href="https://t.me/do_re_mi_do_re_do" style={{ display: 'inline-block', padding: '12px 32px', background: '#00ffcc', color: '#000', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', letterSpacing: 1 }}>НАПИСАТЬ В ТГ</a>
          
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 10 }}>Оплатить услуги:</p>
            <button 
              onClick={handlePay}
              disabled={loading}
              style={{ padding: '10px 20px', background: loading ? '#555' : '#ff0055', color: '#fff', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}
            >
              {loading ? 'Создание платежа...' : 'Оплатить через Platega'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
