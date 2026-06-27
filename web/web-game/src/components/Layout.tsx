import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useState } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isTripPage = router.pathname.startsWith('/trip/');

  return (
    <main style={{ minHeight: '100vh', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: isTripPage ? 0 : 24 }}>
      {children}
    </main>
  );
}
