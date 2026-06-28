import { useState } from 'react';
import { useRouter } from 'next/router';
import { useT } from '../../src/lib/i18n';
import { BackButton } from '../../src/components/BackButton';

const VIBES = [
  { id: 'cruise', icon: 'fa-road', ru: 'Круиз', en: 'Cruise' },
  { id: 'scenic', icon: 'fa-mountain', ru: 'Панорамный', en: 'Scenic' },
  { id: 'urban', icon: 'fa-city', ru: 'Урбан', en: 'Urban' },
];

export default function TripNew() {
  const { t, lang } = useT();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ duration: 60, vibe: 'cruise', eat: false, budget: 'medium', roundTrip: true });

  const nextStep = () => setStep(s => s + 1);

  return (
    <div className="page" style={{ padding: '24px 16px' }}>
      <BackButton />
      
      {step === 1 && (
        <div className="anim-fade">
          <h2 style={{ fontSize: 22, marginBottom: 20 }}>{t('trip.how_long')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[30, 60, 90, 120].map(m => (
              <button key={m} className={`card ${data.duration === m ? 'active' : ''}`} onClick={() => { setData({...data, duration: m}); nextStep(); }}>
                {m} {t('trip.min')}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="anim-fade">
          <h2 style={{ fontSize: 22, marginBottom: 20 }}>{lang === 'ru' ? 'Выбери вайб' : 'Choose vibe'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {VIBES.map(v => (
              <button key={v.id} className={`card ${data.vibe === v.id ? 'active' : ''}`} onClick={() => { setData({...data, vibe: v.id}); nextStep(); }}>
                <i className={`fa-solid ${v.icon}`}></i> {lang === 'ru' ? v.ru : v.en}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="anim-fade">
          <h2 style={{ fontSize: 22, marginBottom: 20 }}>{lang === 'ru' ? 'Желаешь перекусить?' : 'Want to eat?'}</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className={`card ${data.eat ? 'active' : ''}`} onClick={() => { setData({...data, eat: true}); nextStep(); }}>{lang === 'ru' ? 'Да' : 'Yes'}</button>
            <button className={`card ${!data.eat ? 'active' : ''}`} onClick={() => { setData({...data, eat: false}); nextStep(); }}>{lang === 'ru' ? 'Нет' : 'No'}</button>
          </div>
        </div>
      )}
      
      {step === 4 && (
        <div className="anim-fade">
            <h2 style={{ fontSize: 22, marginBottom: 20 }}>{lang === 'ru' ? 'Вернуться в начало?' : 'Return to start?'}</h2>
            <div style={{ display: 'flex', gap: 10 }}>
                <button className={`card ${data.roundTrip ? 'active' : ''}`} onClick={() => { setData({...data, roundTrip: true}); router.push('/trip/generating'); }}>{lang === 'ru' ? 'Да' : 'Yes'}</button>
                <button className={`card ${!data.roundTrip ? 'active' : ''}`} onClick={() => { setData({...data, roundTrip: false}); router.push('/trip/generating'); }}>{lang === 'ru' ? 'Нет' : 'No'}</button>
            </div>
        </div>
      )}
    </div>
  );
}
