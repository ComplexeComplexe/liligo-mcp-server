import type { VercelRequest, VercelResponse } from '@vercel/node';
import { trackInteractionEvent } from '../src/analytics/tracker.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.json(trackInteractionEvent(req.body.event_type, req.body.properties, req.body.session_id));
}
