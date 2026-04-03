import type { ResolvedCity, SupportedTld } from "../schemas/types.js";
import { searchCities } from "../services/autocomplete.js";

export async function resolveCityIdentifiers(
  query: string,
  marketTld?: SupportedTld,
): Promise<{ results: ResolvedCity[]; query: string }> {
  const results = await searchCities(query, marketTld);
  return { results, query };
}
