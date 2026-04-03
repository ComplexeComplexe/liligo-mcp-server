import { searchFlightCache, type FlightCacheQuery, type FlightCacheResult } from "../services/flight-cache.js";
import type { SupportedTld } from "../schemas/types.js";

export interface SearchPricesParams {
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  return_date?: string;
  direct_only?: boolean;
  range?: number;
  market_tld?: SupportedTld;
}

export interface SearchPricesResult {
  results: FlightCacheResult[];
  query: SearchPricesParams;
  cheapest?: FlightCacheResult;
  count: number;
}

export async function searchCachedPrices(params: SearchPricesParams): Promise<SearchPricesResult> {
  const query: FlightCacheQuery = {
    from: params.origin_iata,
    to: params.destination_iata,
    departure_date: params.departure_date,
    return_date: params.return_date,
    direct_only: params.direct_only,
    range: params.range,
    market_tld: params.market_tld,
  };

  const results = await searchFlightCache(query);

  const sorted = [...results].sort((a, b) => a.price - b.price);

  return {
    results: sorted,
    query: params,
    cheapest: sorted[0] ?? undefined,
    count: results.length,
  };
}
