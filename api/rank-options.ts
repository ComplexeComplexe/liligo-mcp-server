import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rankClickOptions } from '../src/tools/rank-options.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.json(rankClickOptions(req.body.options, req.body.weights, req.body.sort_by));
}
