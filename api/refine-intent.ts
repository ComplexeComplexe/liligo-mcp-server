import type { VercelRequest, VercelResponse } from '@vercel/node';
import { refineTravelIntent } from '../src/tools/refine-intent.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.json(refineTravelIntent(req.body));
}
