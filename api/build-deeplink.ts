import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildLiligoDeeplink } from '../src/tools/build-deeplink.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.json(buildLiligoDeeplink(req.body));
}
