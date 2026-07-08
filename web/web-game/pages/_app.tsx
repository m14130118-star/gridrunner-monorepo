import { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import { I18nProvider } from '../src/lib/i18n';
import { TripProvider } from '../src/lib/trip-context';
import { initSounds } from '../src/lib/sound';
import AmbientBackground from '../src/components/AmbientBackground';
import Onboarding from '../src/components/Onboarding';
import LiveNotifications from '../src/components/LiveNotifications';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => { initSounds(); }, []);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const user = localStorage.getItem('gridrunner_user');
      const done = localStorage.getItem('gridrunner_onboarding_done');
      if (user && !done) setShowOnboarding(true);
    }
  }, []);
  return (
    <I18nProvider>
      <TripProvider>
      <AmbientBackground />
      <LiveNotifications />
      <main style={{ minHeight: '100vh' }}>
        <Component {...pageProps} />
      </main>
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
      </TripProvider>
    </I18nProvider>
  );
}
