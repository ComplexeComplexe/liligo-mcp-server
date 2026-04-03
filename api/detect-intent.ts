import type { VercelRequest, VercelResponse } from '@vercel/node';
import { detectTravelIntent } from '../src/tools/detect-intent.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { user_message } = req.body;
  res.json(detectTravelIntent(user_message));
}
