import type { NextApiRequest, NextApiResponse } from 'next';
import { getAnalytics } from '../../../../src/lib/store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const data = getAnalytics();
  res.status(200).json(data);
}
