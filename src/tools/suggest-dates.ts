import { searchFlightCache, type FlightCacheResult } from "../services/flight-cache.js";
import type { SupportedTld } from "../schemas/types.js";

export interface SuggestDatesParams {
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  return_date?: string;
  range?: number;
  market_tld?: SupportedTld;
}

export interface DateSuggestion {
  departure_date: string;
  return_date?: string;
  price: number;
  currency: string;
  savings_vs_requested?: number;
  direct: boolean;
}

export interface SuggestDatesResult {
  suggestions: DateSuggestion[];
  requested_date_price?: number;
  cheapest_alternative?: DateSuggestion;
  query: SuggestDatesParams;
}

export async function suggestDates(params: SuggestDatesParams): Promise<SuggestDatesResult> {
  const range = params.range ?? 3;

  const results = await searchFlightCache({
    from: params.origin_iata,
    to: params.destination_iata,
    departure_date: params.departure_date,
    return_date: params.return_date,
    range,
    market_tld: params.market_tld,
  });

  // Find the price for the originally requested date
  const requestedPrice = results.find(
    (r) => r.departure_date === params.departure_date,
  )?.price;

  // Build suggestions sorted by price
  const suggestions: DateSuggestion[] = results
    .map((r) => ({
      departure_date: r.departure_date,
      return_date: r.return_date,
      price: r.price,
      currency: r.currency,
      direct: r.direct,
      savings_vs_requested: requestedPrice ? Math.round((requestedPrice - r.price) * 100) / 100 : undefined,
    }))
    .sort((a, b) => a.price - b.price);

  const cheapest = suggestions[0];

  return {
    suggestions,
    requested_date_price: requestedPrice,
    cheapest_alternative: cheapest?.departure_date !== params.departure_date ? cheapest : suggestions[1],
    query: params,
  };
}
