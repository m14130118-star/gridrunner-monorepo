import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ArenaIndex() {
  const router = useRouter();
  useEffect(() => { router.replace('/arena/active'); }, []);
  return null;
}
