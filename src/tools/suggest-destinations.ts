import { suggestLowcostDestinations, type LowcostDestination, type LowcostMapQuery } from "../services/lowcost-map.js";
import type { SupportedTld } from "../schemas/types.js";

export interface SuggestDestinationsParams {
  departure_city_id: string;
  month?: string;
  max_price?: number;
  market_tld?: SupportedTld;
}

export interface SuggestDestinationsResult {
  destinations: LowcostDestination[];
  query: SuggestDestinationsParams;
  count: number;
}

export async function suggestDestinations(params: SuggestDestinationsParams): Promise<SuggestDestinationsResult> {
  const query: LowcostMapQuery = {
    departure_city_id: params.departure_city_id,
    month: params.month,
    max_price: params.max_price,
    market_tld: params.market_tld,
  };

  const destinations = await suggestLowcostDestinations(query);
  const sorted = [...destinations].sort((a, b) => a.price - b.price);

  return {
    destinations: sorted,
    query: params,
    count: sorted.length,
  };
}
