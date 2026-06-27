import type { NextApiRequest, NextApiResponse } from 'next';
import { store } from '../../../../src/lib/store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) return res.status(400).json({ error: 'Missing fields' });
  store.checkpoints.push({ lat, lng, createdAt: Date.now() });
  res.status(200).json({ success: true, id: store.checkpoints.length, message: 'Checkpoint saved' });
}
