import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { detectTravelIntent } from "./tools/detect-intent.js";
import { resolveCityIdentifiers } from "./tools/resolve-city.js";
import { validateTravelIntent } from "./tools/validate-intent.js";
import { buildLiligoDeeplink } from "./tools/build-deeplink.js";
import { searchCachedPrices } from "./tools/search-prices.js";
import { suggestDestinations } from "./tools/suggest-destinations.js";
import { suggestDates } from "./tools/suggest-dates.js";
import { rankClickOptions } from "./tools/rank-options.js";
import { refineTravelIntent } from "./tools/refine-intent.js";
import { renderInteractiveResults } from "./tools/render-results.js";
import { trackInteractionEvent } from "./analytics/tracker.js";
import { monitor } from "./utils/monitor.js";
import { autocompleteCache, autocompleteRateLimiter } from "./services/autocomplete.js";
import { flightCacheCache, flightCacheRateLimiter } from "./services/flight-cache.js";
import { lowcostMapCache, lowcostMapRateLimiter } from "./services/lowcost-map.js";

const server = new McpServer({
  name: "liligo-mcp-server",
  version: "1.0.0",
});

// Tool 1: detect_travel_intent
server.tool(
  "detect_travel_intent",
  "Parses a user message to extract travel parameters (cities, dates, passengers, cabin class) and identify the travel intention. Returns a partial TravelIntent with confidence score and list of missing fields.",
  {
    user_message: z.string().describe("The user's natural language message about travel"),
  },
  async ({ user_message }) => {
    const result = detectTravelIntent(user_message);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

// Tool 3: resolve_city_identifiers
server.tool(
  "resolve_city_identifiers",
  "Converts city names to Liligo IDs and IATA codes using the Liligo Autocomplete API. Use this to resolve ambiguous city names into precise identifiers needed for deeplink generation.",
  {
    query: z.string().describe("City name or partial name to search (e.g. 'Paris', 'Barcelona', 'New York')"),
    market_tld: z.enum(["fr", "es", "it", "de", "co.uk", "com"]).optional().describe("Market TLD for the search context. Defaults to 'fr'."),
  },
  async ({ query, market_tld }) => {
    try {
      const result = await resolveCityIdentifiers(query, market_tld);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: JSON.stringify({ error: message }) }], isError: true };
    }
  },
);

// Tool 4: validate_travel_intent
server.tool(
  "validate_travel_intent",
  "Validates a TravelIntent for consistency and correctness. Checks dates are in the future, return is after departure, passenger limits, and required fields. Returns validation result with errors and warnings.",
  {
    origin: z.string().optional().describe("Origin city name"),
    origin_iata: z.string().optional().describe("Origin IATA code (e.g. 'PAR', 'LHR')"),
    destination: z.string().optional().describe("Destination city name"),
    destination_iata: z.string().optional().describe("Destination IATA code (e.g. 'BCN', 'JFK')"),
    departure_date: z.string().optional().describe("Departure date in YYYY-MM-DD format"),
    return_date: z.string().optional().describe("Return date in YYYY-MM-DD format"),
    round_trip: z.boolean().optional().default(true).describe("Whether this is a round trip"),
    adults: z.number().optional().default(1).describe("Number of adults (1-9)"),
    children: z.number().optional().default(0).describe("Number of children (0-8)"),
    infants: z.number().optional().default(0).describe("Number of infants (0-4)"),
    cabin_class: z.enum(["economy", "business", "first"]).optional().default("economy").describe("Cabin class"),
  },
  async (params) => {
    const result = validateTravelIntent(params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

// Tool 8: build_liligo_deeplink
server.tool(
  "build_liligo_deeplink",
  "Constructs a valid Liligo deeplink URL from travel intent parameters. The generated URL opens the Liligo search results page with pre-filled search criteria. Requires at least origin_iata and departure_date.",
  {
    origin_iata: z.string().describe("Origin IATA code (e.g. 'PAR', 'LHR', 'LYS')"),
    destination_iata: z.string().optional().describe("Destination IATA code (e.g. 'BCN', 'JFK')"),
    departure_date: z.string().describe("Departure date in YYYY-MM-DD format"),
    return_date: z.string().optional().describe("Return date in YYYY-MM-DD format"),
    round_trip: z.boolean().optional().default(true).describe("Whether this is a round trip"),
    adults: z.number().optional().default(1).describe("Number of adults (1-9)"),
    children: z.number().optional().default(0).describe("Number of children (0-8)"),
    infants: z.number().optional().default(0).describe("Number of infants (0-4)"),
    cabin_class: z.enum(["economy", "business", "first"]).optional().default("economy").describe("Cabin class"),
    market_tld: z.enum(["fr", "es", "it", "de", "co.uk", "com"]).optional().default("fr").describe("Market TLD (determines liligo.xx domain)"),
    sort: z.enum(["cheapest", "fastest", "best"]).optional().describe("Sort results by"),
    utm_source: z.string().optional().describe("UTM source for tracking"),
    utm_medium: z.string().optional().describe("UTM medium for tracking"),
    utm_content: z.string().optional().describe("UTM content for tracking"),
  },
  async (params) => {
    const result = buildLiligoDeeplink(params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

// Tool 5: search_cached_prices
server.tool(
  "search_cached_prices",
  "Queries the Liligo Flight Cache API for indicative price information on a route. Returns cached prices around the requested dates (±range days). Useful for quick price estimates without triggering a full search.",
  {
    origin_iata: z.string().describe("Origin IATA code (e.g. 'PAR')"),
    destination_iata: z.string().describe("Destination IATA code (e.g. 'BCN')"),
    departure_date: z.string().describe("Departure date in YYYY-MM-DD format"),
    return_date: z.string().optional().describe("Return date in YYYY-MM-DD format"),
    direct_only: z.boolean().optional().default(false).describe("Only show direct flights"),
    range: z.number().optional().default(3).describe("Date range in days around the requested date (default: 3)"),
    market_tld: z.enum(["fr", "es", "it", "de", "co.uk", "com"]).optional().default("fr").describe("Market TLD"),
  },
  async (params) => {
    try {
      const result = await searchCachedPrices(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: JSON.stringify({ error: message }) }], isError: true };
    }
  },
);

// Tool 6: suggest_destinations
server.tool(
  "suggest_destinations",
  "Suggests inspiring flight destinations from a departure city using the Liligo Lowcost Map API. Returns destinations sorted by price. Great for users who are flexible on where to go and want inspiration.",
  {
    departure_city_id: z.string().describe("Liligo city ID for the departure city (obtained from resolve_city_identifiers)"),
    month: z.string().optional().describe("Target month in YYYY-MM format (e.g. '2026-06')"),
    max_price: z.number().optional().describe("Maximum price filter in the market's currency"),
    market_tld: z.enum(["fr", "es", "it", "de", "co.uk", "com"]).optional().default("fr").describe("Market TLD"),
  },
  async (params) => {
    try {
      const result = await suggestDestinations(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: JSON.stringify({ error: message }) }], isError: true };
    }
  },
);

// Tool 7: suggest_dates
server.tool(
  "suggest_dates",
  "Proposes alternative travel dates based on cached pricing. Shows how much the user can save by shifting their departure/return dates by a few days. Uses the Flight Cache API with a date range.",
  {
    origin_iata: z.string().describe("Origin IATA code"),
    destination_iata: z.string().describe("Destination IATA code"),
    departure_date: z.string().describe("Requested departure date in YYYY-MM-DD format"),
    return_date: z.string().optional().describe("Requested return date in YYYY-MM-DD format"),
    range: z.number().optional().default(3).describe("Date flexibility in days (default: 3)"),
    market_tld: z.enum(["fr", "es", "it", "de", "co.uk", "com"]).optional().default("fr").describe("Market TLD"),
  },
  async (params) => {
    try {
      const result = await suggestDates(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: JSON.stringify({ error: message }) }], isError: true };
    }
  },
);

// Tool 9: rank_click_options
server.tool(
  "rank_click_options",
  "Scores and ranks flight options by a weighted combination of price, duration, number of stops, and departure time preference. Returns options sorted by score (or by price/duration if specified).",
  {
    options: z.array(z.object({
      id: z.string().describe("Unique identifier for this option"),
      price: z.number().describe("Price in local currency"),
      duration_minutes: z.number().describe("Total flight duration in minutes"),
      stops: z.number().describe("Number of stops (0 = direct)"),
      departure_time: z.string().describe("Departure time in HH:MM format"),
      airline: z.string().optional().describe("Airline name"),
      direct: z.boolean().describe("Whether this is a direct flight"),
    })).describe("Array of flight options to rank"),
    weights: z.object({
      price: z.number().optional().describe("Weight for price (0-1, default 0.4)"),
      duration: z.number().optional().describe("Weight for duration (0-1, default 0.3)"),
      stops: z.number().optional().describe("Weight for stops (0-1, default 0.2)"),
      departure_time: z.number().optional().describe("Weight for departure time (0-1, default 0.1)"),
    }).optional().describe("Custom scoring weights"),
    sort_by: z.enum(["score", "price", "duration"]).optional().default("score").describe("How to sort results"),
  },
  async ({ options, weights, sort_by }) => {
    const result = rankClickOptions(options, weights, sort_by);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

// Tool 2: refine_travel_intent
server.tool(
  "refine_travel_intent",
  "Generates clarification questions for an incomplete or ambiguous travel intent. Identifies missing required fields, recommends confirmations, and suggests optional enhancements. Use after detect_travel_intent to guide the conversation.",
  {
    origin: z.string().optional().describe("Origin city name"),
    origin_iata: z.string().optional().describe("Origin IATA code"),
    destination: z.string().optional().describe("Destination city name"),
    destination_iata: z.string().optional().describe("Destination IATA code"),
    departure_date: z.string().optional().describe("Departure date in YYYY-MM-DD"),
    return_date: z.string().optional().describe("Return date in YYYY-MM-DD"),
    round_trip: z.boolean().optional().describe("Whether round trip"),
    adults: z.number().optional().describe("Number of adults"),
    children: z.number().optional().describe("Number of children"),
    infants: z.number().optional().describe("Number of infants"),
    cabin_class: z.enum(["economy", "business", "first"]).optional().describe("Cabin class"),
  },
  async (params) => {
    const result = refineTravelIntent(params);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

// Tool 10: render_interactive_results
server.tool(
  "render_interactive_results",
  "Formats flight search results for user-friendly display. Supports markdown (rich), compact (one-line per result), and detailed (JSON) formats. Includes deeplinks, scores, and airline info.",
  {
    results: z.array(z.object({
      id: z.string(),
      rank: z.number().optional(),
      score: z.number().optional(),
      price: z.number(),
      currency: z.string(),
      origin_iata: z.string(),
      destination_iata: z.string(),
      departure_date: z.string(),
      departure_time: z.string().optional(),
      return_date: z.string().optional(),
      return_time: z.string().optional(),
      duration_minutes: z.number().optional(),
      stops: z.number(),
      airline: z.string().optional(),
      direct: z.boolean(),
      deeplink: z.object({
        url: z.string(),
        valid: z.boolean(),
        warnings: z.array(z.string()),
      }).optional(),
    })).describe("Array of flight results to render"),
    format: z.enum(["markdown", "compact", "detailed"]).optional().default("markdown").describe("Output format"),
    max_results: z.number().optional().default(10).describe("Maximum results to display"),
    show_deeplinks: z.boolean().optional().default(true).describe("Include booking deeplinks"),
    show_scores: z.boolean().optional().default(false).describe("Show ranking scores"),
  },
  async ({ results, format, max_results, show_deeplinks, show_scores }) => {
    const output = renderInteractiveResults(results, { format, max_results, show_deeplinks, show_scores });
    return { content: [{ type: "text", text: output }] };
  },
);

// Tool 11: track_interaction_event
server.tool(
  "track_interaction_event",
  "Records analytics events for user interactions. Tracks searches, deeplink clicks, result views, and other engagement events. Events are stored in-memory for the session.",
  {
    event_type: z.enum([
      "search_initiated", "deeplink_generated", "deeplink_clicked",
      "results_rendered", "destination_suggested", "date_suggested",
      "intent_detected", "intent_refined", "city_resolved", "options_ranked",
    ]).describe("Type of interaction event"),
    properties: z.record(z.unknown()).describe("Event properties (e.g. origin, destination, price)"),
    session_id: z.string().optional().describe("Session identifier for grouping events"),
  },
  async ({ event_type, properties, session_id }) => {
    const result = trackInteractionEvent(event_type, properties, session_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

// Resource: health check
server.resource(
  "health",
  "liligo://health",
  { description: "Server health status including cache stats, rate limits, and API service health" },
  async () => {
    const report = monitor.getHealthReport(
      { autocomplete: autocompleteCache, "flight-cache": flightCacheCache, "lowcost-map": lowcostMapCache },
      { autocomplete: autocompleteRateLimiter, "flight-cache": flightCacheRateLimiter, "lowcost-map": lowcostMapRateLimiter },
    );
    return { contents: [{ uri: "liligo://health", mimeType: "application/json", text: JSON.stringify(report, null, 2) }] };
  },
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Liligo MCP Server v1.0.0 running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
