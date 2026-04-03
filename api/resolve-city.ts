import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolveCityIdentifiers } from '../src/tools/resolve-city.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = await resolveCityIdentifiers(req.body.query, req.body.market_tld);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
}
