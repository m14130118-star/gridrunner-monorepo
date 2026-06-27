import { getApiUrl } from './api';

export interface AuthUser { id: number; username: string; email: string; role: string; vip?: boolean; }

export async function register(username: string, email: string, password: string) {
  const r = await fetch(`${getApiUrl()}/api/v1/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await r.json();
  if (!data.success) throw new Error(data.message);
  return data as { success: true; token: string; user: AuthUser };
}

export async function login(email: string, password: string) {
  const r = await fetch(`${getApiUrl()}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (!data.success) throw new Error(data.message);
  return data as { success: true; token: string; user: AuthUser };
}

export async function getMe(token: string) {
  const r = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await r.json();
  if (!data.success) throw new Error(data.message);
  return data as { success: true; user: AuthUser };
}
