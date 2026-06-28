import { useEffect } from 'react';

export default function BusinessRedirect() {
  useEffect(() => {
    window.location.href = 'https://gridrunner-business.duckdns.org';
  }, []);
  return null;
}
