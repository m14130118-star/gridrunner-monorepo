import type { NextApiRequest, NextApiResponse } from 'next';
import { addCheckin } from '../../../../../src/lib/store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { username, lat, lng } = req.body;
  if (!username || lat === undefined || lng === undefined) return res.status(400).json({ error: 'Missing fields' });
  addCheckin(username, lat, lng);
  res.status(200).json({ success: true, message: 'Trip recorded' });
}
