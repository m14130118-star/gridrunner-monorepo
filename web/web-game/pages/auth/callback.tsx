import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const { token, user } = router.query;
    if (token && user) {
      try {
        localStorage.setItem('gridrunner_token', token as string);
        localStorage.setItem('gridrunner_user', user as string);
        window.dispatchEvent(new Event('user-update'));
        router.push('/profile');
      } catch { router.push('/auth/login'); }
    } else {
      router.push('/auth/login');
    }
  }, [router.isReady, router.query]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a1a0f' }}>
      <div className="w-8 h-8 border-2 border-[#00e676] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
