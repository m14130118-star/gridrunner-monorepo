import { useState } from 'react';
import Link from 'next/link';
import { useT } from '../lib/i18n';

interface Props {
  onClose: () => void;
}

const STEPS = [
  { icon: 'fa-hand-peace', title: 'onboarding.welcome_title', desc: 'onboarding.welcome_desc', link: '/auth/register', cta: 'onboarding.choose_vibe' },
  { icon: 'fa-warehouse', title: 'onboarding.garage_title', desc: 'onboarding.garage_desc', link: '/garage', cta: 'onboarding.open_garage' },
  { icon: 'fa-route', title: 'onboarding.trip_title', desc: 'onboarding.trip_desc', link: '/trip/new', cta: 'onboarding.start_trip' },
  { icon: 'fa-chart-line', title: 'onboarding.profile_title', desc: 'onboarding.profile_desc', link: '/profile', cta: 'onboarding.view_profile' },
  { icon: 'fa-trophy', title: 'onboarding.leaderboard_title', desc: 'onboarding.leaderboard_desc', link: '/leaderboard', cta: 'onboarding.join_community' },
];

export default function Onboarding({ onClose }: Props) {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  const done = () => {
    localStorage.setItem('gridrunner_onboarding_done', 'true');
    onClose();
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card" key={step}>
        <div className="onboarding-icon">
          <i className={`fa-solid ${s.icon}`} />
        </div>
        <h2 className="onboarding-title">{t(s.title)}</h2>
        <p className="onboarding-desc">{t(s.desc)}</p>
        <Link href={s.link} className="btn btn-primary onboarding-cta" onClick={last ? done : undefined}>
          <i className="fa-solid fa-arrow-right" />
          {t(s.cta)}
        </Link>
        <button className="btn btn-ghost onboarding-skip" onClick={last ? done : () => setStep(n => n + 1)}>
          {last ? t('onboarding.lets_go') : t('common.next')}
        </button>
        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
