const DEV_API = 'http://localhost:3003';

let cachedApiUrl: string | null = null;

function isCapacitor(): boolean {
  return typeof (window as any).Capacitor !== 'undefined';
}

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return true;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

export function getApiUrl(): string {
  if (cachedApiUrl) return cachedApiUrl;

  if (isCapacitor()) {
    // On mobile APK, try to detect the dev server IP or use stored one
    const stored = localStorage.getItem('gridrunner_api_url');
    if (stored) { cachedApiUrl = stored; return stored; }
    // Production API
    cachedApiUrl = 'https://gridrunner.duckdns.org';
    return cachedApiUrl;
  }

  if (isLocalhost()) return DEV_API;

  // Production — use the main API domain
  const apiUrl = localStorage.getItem('gridrunner_api_url');
  if (apiUrl) { cachedApiUrl = apiUrl; return apiUrl; }
  cachedApiUrl = 'https://gridrunner.duckdns.org';
  return cachedApiUrl;
}

export function setApiUrl(url: string) {
  cachedApiUrl = url;
  localStorage.setItem('gridrunner_api_url', url);
}

export async function apiFetch(path: string, options?: RequestInit) {
  const url = `${getApiUrl()}${path}`;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('gridrunner_token') : null;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  return res.json();
}
