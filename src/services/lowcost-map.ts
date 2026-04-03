import type { SupportedTld } from "../schemas/types.js";
import { getMarket } from "../config/markets.js";
import { TTLCache } from "../utils/cache.js";
import { RateLimiter } from "../utils/rate-limiter.js";
import { fetchWithRetry } from "../utils/retry.js";
import { monitor } from "../utils/monitor.js";

const SERVICE_NAME = "lowcost-map";
monitor.registerService(SERVICE_NAME);

export const lowcostMapCache = new TTLCache<LowcostDestination[]>(30 * 60 * 1000, 100); // 30 min TTL
export const lowcostMapRateLimiter = new RateLimiter(15, 60_000); // 15 req/min

export interface LowcostDestination {
  city_name: string;
  city_id: string;
  iata_code: string;
  country: string;
  price: number;
  currency: string;
  month: string;
}

export interface LowcostMapQuery {
  departure_city_id: string;
  month?: string;
  max_price?: number;
  market_tld?: SupportedTld;
}

export async function suggestLowcostDestinations(query: LowcostMapQuery): Promise<LowcostDestination[]> {
  const market = getMarket(query.market_tld);
  const cacheKey = `${market.tld}:${query.departure_city_id}:${query.month ?? ""}:${query.max_price ?? ""}`;

  // Check cache
  const cached = lowcostMapCache.get(cacheKey);
  if (cached) return cached;

  // Rate limit
  if (!lowcostMapRateLimiter.tryAcquire()) {
    throw new Error("Rate limit exceeded for Lowcost Map API. Please wait before retrying.");
  }

  const params = new URLSearchParams();
  params.set("depCityId", query.departure_city_id);
  if (query.month) params.set("month", query.month);
  if (query.max_price) params.set("priceUpper", String(query.max_price));
  params.set("details", "true");

  const url = `${market.baseUrl}/servlet/sc/lcm/?${params.toString()}`;

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
      city_name: String(item.cityName ?? item.name ?? ""),
      city_id: String(item.cityId ?? item.id ?? ""),
      iata_code: String(item.iata ?? item.iataCode ?? ""),
      country: String(item.country ?? item.countryName ?? ""),
      price: Number(item.price ?? item.minPrice ?? 0),
      currency: String(item.currency ?? market.currency),
      month: String(item.month ?? query.month ?? ""),
    }));

    lowcostMapCache.set(cacheKey, results);
    monitor.recordSuccess(SERVICE_NAME);
    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    monitor.recordError(SERVICE_NAME, message);
    throw error;
  }
}
