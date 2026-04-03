import { CabinClassCode, type DeeplinkRequest, type DeeplinkResponse, type SupportedTld } from "../schemas/types.js";
import { getMarket } from "../config/markets.js";

export function buildDeeplink(request: DeeplinkRequest): DeeplinkResponse {
  const warnings: string[] = [];

  // Step 1: Validate required fields
  if (!request.origin_iata) {
    return { url: "", valid: false, warnings: ["Missing required field: origin_iata"] };
  }
  if (!request.departure_date) {
    return { url: "", valid: false, warnings: ["Missing required field: departure_date"] };
  }

  // Step 2: Determine market TLD
  const tld: SupportedTld = request.market_tld ?? "fr";
  const market = getMarket(tld);

  // Step 3: Start building URL params
  const params = new URLSearchParams();

  // Step 10: Add fixed parameters (first so they appear at the start)
  params.set("product", "air");
  params.set("apiVersion", "3");
  params.set("onlySearchIndex", "1");

  // Step 4: Add origin parameters
  params.set("from", request.origin_iata);

  // Step 5: Add destination parameters (optional for open-ended searches)
  if (request.destination_iata) {
    params.set("to", request.destination_iata);
  }

  // Step 6: Add departure date
  params.set("dep", request.departure_date);

  // Step 7: Handle round-trip logic
  if (request.round_trip && request.return_date) {
    params.set("ret", request.return_date);
  } else if (request.round_trip && !request.return_date) {
    warnings.push("Round trip requested but no return_date provided. Generating one-way link.");
  }

  // Step 8: Serialize passengers
  const adults = request.adults ?? 1;
  const children = request.children ?? 0;
  const infants = request.infants ?? 0;
  params.set("passengers", `${adults},${children},${infants}`);

  // Step 9: Map cabin class
  const cabinCode = CabinClassCode[request.cabin_class ?? "economy"];
  params.set("class", cabinCode);

  // Step 11: Add optional sort
  if (request.sort) {
    params.set("sort", request.sort);
  }

  // Step 12: Add tracking parameters
  if (request.utm_source) params.set("utm_source", request.utm_source);
  if (request.utm_medium) params.set("utm_medium", request.utm_medium);
  if (request.utm_content) params.set("utm_content", request.utm_content);

  // Step 13 & 14: Construct and encode URL
  const url = `${market.baseUrl}/flight/results?${params.toString()}`;

  return { url, valid: true, warnings };
}
