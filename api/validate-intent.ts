import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateTravelIntent } from '../src/tools/validate-intent.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.json(validateTravelIntent(req.body));
}
