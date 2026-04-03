import type { VercelRequest, VercelResponse } from '@vercel/node';
import { suggestDestinations } from '../src/tools/suggest-destinations.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = await suggestDestinations(req.body);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
}
