import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Старый дашборд удалён — админка живёт в /cyber-admin. Редирект для старых ссылок.
export default function AdminDashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/cyber-admin'); }, [router]);
  return <div className="page" style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>Переход в админку…</div>;
}
