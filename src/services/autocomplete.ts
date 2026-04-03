import type { ResolvedCity, SupportedTld } from "../schemas/types.js";
import { getMarket } from "../config/markets.js";
import { TTLCache } from "../utils/cache.js";
import { RateLimiter } from "../utils/rate-limiter.js";
import { fetchWithRetry } from "../utils/retry.js";
import { monitor } from "../utils/monitor.js";

const SERVICE_NAME = "autocomplete";
monitor.registerService(SERVICE_NAME);

export const autocompleteCache = new TTLCache<ResolvedCity[]>(10 * 60 * 1000, 200); // 10 min TTL
export const autocompleteRateLimiter = new RateLimiter(30, 60_000); // 30 req/min

interface AutocompleteRawResult {
  id: string;
  name: string;
  iata?: string;
  country?: string;
  score?: number;
  type?: string;
}

export async function searchCities(
  query: string,
  tld?: SupportedTld,
  maxRows = 15,
): Promise<ResolvedCity[]> {
  const market = getMarket(tld);
  const cacheKey = `${market.tld}:${query.toLowerCase()}:${maxRows}`;

  // Check cache
  const cached = autocompleteCache.get(cacheKey);
  if (cached) return cached;

  // Rate limit
  if (!autocompleteRateLimiter.tryAcquire()) {
    throw new Error("Rate limit exceeded for Autocomplete API. Please wait before retrying.");
  }

  const url = `${market.baseUrl}/servlet/comp?type=flight&apiVersion=1&frag=${encodeURIComponent(query)}&maxrows=${maxRows}`;

  monitor.recordRequest(SERVICE_NAME);

  try {
    const response = await fetchWithRetry(url, {
      headers: { Accept: "application/json" },
    });

    const data = await response.json() as AutocompleteRawResult[];

    if (!Array.isArray(data)) {
      monitor.recordSuccess(SERVICE_NAME);
      return [];
    }

    const results = data
      .filter((item) => item.iata && item.name)
      .map((item) => ({
        name: item.name,
        iata_code: item.iata!,
        liligo_id: item.id ?? item.iata!,
        country: item.country ?? "",
        score: item.score ?? 0,
      }));

    autocompleteCache.set(cacheKey, results);
    monitor.recordSuccess(SERVICE_NAME);
    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    monitor.recordError(SERVICE_NAME, message);
    throw error;
  }
}
