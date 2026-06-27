const API = process.env.NEXT_PUBLIC_EMAIL_API || 'http://localhost:3001';

export interface SendCodeResult {
  ok: boolean;
  code?: string;
  cooldownUntil?: number;
  error?: string;
  cooldownRemaining?: number;
}

export async function sendCode(email: string, username?: string): Promise<SendCodeResult> {
  const res = await fetch(`${API}/api/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username }),
  });
  return res.json();
}

export async function verifyCode(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API}/api/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  return res.json();
}
