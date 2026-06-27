import type { NextApiRequest, NextApiResponse } from 'next';

const store: { id: string; creator: string; gangId?: string; path: number[][]; checkpoints: any[]; city?: string; createdAt: number }[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // share a route
    const { creator, gangId, path, checkpoints, city } = req.body || {};
    if (!creator || !path) return res.status(400).json({ error: 'creator and path required' });
    const id = `sr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const entry = { id, creator: String(creator), gangId: gangId || undefined, path, checkpoints: checkpoints || [], city: city || '', createdAt: Date.now() };
    store.unshift(entry);
    if (store.length > 200) store.length = 200;
    return res.status(200).json(entry);
  }

  if (req.method === 'GET') {
    // list shared routes, optionally filter by gang
    const { gangId, limit } = req.query;
    let result = store;
    if (gangId && typeof gangId === 'string') result = result.filter(r => r.gangId === gangId);
    const max = Math.min(parseInt(String(limit || '20'), 10) || 20, 50);
    return res.status(200).json(result.slice(0, max));
  }

  res.status(405).json({ error: 'POST or GET only' });
}
