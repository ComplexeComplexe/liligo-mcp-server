import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    status: 'healthy',
    uptime_since: new Date().toISOString(),
    platform: 'vercel',
    services: {
      autocomplete: { name: 'autocomplete', status: 'healthy', requestCount: 0, errorCount: 0 },
      'flight-cache': { name: 'flight-cache', status: 'healthy', requestCount: 0, errorCount: 0 },
      'lowcost-map': { name: 'lowcost-map', status: 'healthy', requestCount: 0, errorCount: 0 },
    },
    cache: {},
    rate_limits: {},
  });
}
