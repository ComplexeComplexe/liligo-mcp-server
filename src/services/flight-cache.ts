import type { SupportedTld } from "../schemas/types.js";
import { getMarket } from "../config/markets.js";
import { TTLCache } from "../utils/cache.js";
import { RateLimiter } from "../utils/rate-limiter.js";
import { fetchWithRetry } from "../utils/retry.js";
import { monitor } from "../utils/monitor.js";

const SERVICE_NAME = "flight-cache";
monitor.registerService(SERVICE_NAME);

export const flightCacheCache = new TTLCache<FlightCacheResult[]>(15 * 60 * 1000, 300); // 15 min TTL
export const flightCacheRateLimiter = new RateLimiter(20, 60_000); // 20 req/min

export interface FlightCacheResult {
  departure_date: string;
  return_date?: string;
  price: number;
  currency: string;
  direct: boolean;
  airline?: string;
}

export interface FlightCacheQuery {
  from: string;
  to: string;
  departure_date: string;
  return_date?: string;
  direct_only?: boolean;
  range?: number;
  market_tld?: SupportedTld;
}

export async function searchFlightCache(query: FlightCacheQuery): Promise<FlightCacheResult[]> {
  const market = getMarket(query.market_tld);
  const cacheKey = `${market.tld}:${query.from}:${query.to}:${query.departure_date}:${query.return_date ?? ""}:${query.direct_only ?? ""}:${query.range ?? 3}`;

  // Check cache
  const cached = flightCacheCache.get(cacheKey);
  if (cached) return cached;

  // Rate limit
  if (!flightCacheRateLimiter.tryAcquire()) {
    throw new Error("Rate limit exceeded for Flight Cache API. Please wait before retrying.");
  }

  const params = new URLSearchParams();
  params.set("from", query.from);
  params.set("to", query.to);
  params.set("depdate", query.departure_date);
  if (query.return_date) params.set("retdate", query.return_date);
  if (query.direct_only) params.set("direct", "true");
  params.set("range", String(query.range ?? 3));

  const url = `${market.baseUrl}/servlet/flight-cache?${params.toString()}`;

  monitor.recordRequest(SERVICE_NAME);

  try {
    const response = await fetchWithRetry(url, {
      headers: { Accept: "application/json" },
    });

    const data = await response.json() as Record<string, unknown>[];

    if (!Array.isArray(data)) {
      monitor.recordSuccess(SERVICE_NAME);
      return [];
    }

    const results = data.map((item) => ({
      departure_date: String(item.depDate ?? item.departure_date ?? ""),
      return_date: item.retDate ? String(item.retDate) : item.return_date ? String(item.return_date) : undefined,
      price: Number(item.price ?? item.totalPrice ?? 0),
      currency: String(item.currency ?? market.currency),
      direct: Boolean(item.direct ?? false),
      airline: item.airline ? String(item.airline) : undefined,
    }));

    flightCacheCache.set(cacheKey, results);
    monitor.recordSuccess(SERVICE_NAME);
    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    monitor.recordError(SERVICE_NAME, message);
    throw error;
  }
}
