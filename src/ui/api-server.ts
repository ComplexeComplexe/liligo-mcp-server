import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

import { detectTravelIntent } from "../tools/detect-intent.js";
import { refineTravelIntent } from "../tools/refine-intent.js";
import { validateTravelIntent } from "../tools/validate-intent.js";
import { buildLiligoDeeplink } from "../tools/build-deeplink.js";
import { searchCachedPrices } from "../tools/search-prices.js";
import { suggestDestinations } from "../tools/suggest-destinations.js";
import { suggestDates } from "../tools/suggest-dates.js";
import { rankClickOptions } from "../tools/rank-options.js";
import { renderInteractiveResults } from "../tools/render-results.js";
import { resolveCityIdentifiers } from "../tools/resolve-city.js";
import { trackInteractionEvent } from "../analytics/tracker.js";
import { monitor } from "../utils/monitor.js";
import { autocompleteCache, autocompleteRateLimiter } from "../services/autocomplete.js";
import { flightCacheCache, flightCacheRateLimiter } from "../services/flight-cache.js";
import { lowcostMapCache, lowcostMapRateLimiter } from "../services/lowcost-map.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = path.resolve(__dirname, "../../../ui/public");
const PORT = parseInt(process.env.UI_PORT ?? "3737");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function cors(res: http.ServerResponse) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end();
}

async function handleAPI(req: http.IncomingMessage, res: http.ServerResponse, route: string) {
  const body = req.method === "POST" ? await parseBody(req) : {};

  switch (route) {
    case "/api/detect-intent":
      json(res, detectTravelIntent(body.user_message as string));
      break;

    case "/api/refine-intent":
      json(res, refineTravelIntent(body as Record<string, unknown>));
      break;

    case "/api/resolve-city":
      try {
        const result = await resolveCityIdentifiers(body.query as string, body.market_tld as any);
        json(res, result);
      } catch (e) {
        json(res, { error: (e as Error).message }, 500);
      }
      break;

    case "/api/validate-intent":
      json(res, validateTravelIntent(body as Record<string, unknown>));
      break;

    case "/api/build-deeplink":
      json(res, buildLiligoDeeplink(body));
      break;

    case "/api/search-prices":
      try {
        const prices = await searchCachedPrices(body as any);
        json(res, prices);
      } catch (e) {
        json(res, { error: (e as Error).message }, 500);
      }
      break;

    case "/api/suggest-destinations":
      try {
        const dests = await suggestDestinations(body as any);
        json(res, dests);
      } catch (e) {
        json(res, { error: (e as Error).message }, 500);
      }
      break;

    case "/api/suggest-dates":
      try {
        const dates = await suggestDates(body as any);
        json(res, dates);
      } catch (e) {
        json(res, { error: (e as Error).message }, 500);
      }
      break;

    case "/api/rank-options":
      json(res, rankClickOptions(body.options as any, body.weights as any, body.sort_by as any));
      break;

    case "/api/render-results":
      json(res, { html: renderInteractiveResults(body.results as any, body.options as any) });
      break;

    case "/api/track-event":
      json(res, trackInteractionEvent(body.event_type as any, body.properties as any, body.session_id as any));
      break;

    case "/api/health":
      json(res, monitor.getHealthReport(
        { autocomplete: autocompleteCache, "flight-cache": flightCacheCache, "lowcost-map": lowcostMapCache },
        { autocomplete: autocompleteRateLimiter, "flight-cache": flightCacheRateLimiter, "lowcost-map": lowcostMapRateLimiter },
      ));
      break;

    default:
      json(res, { error: "Not found" }, 404);
  }
}

function serveStatic(res: http.ServerResponse, urlPath: string) {
  const filePath = path.join(STATIC_DIR, urlPath === "/" ? "/index.html" : urlPath);
  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] ?? "application/octet-stream";

  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": mime });
    res.end(content);
  } catch {
    // SPA fallback
    try {
      const index = fs.readFileSync(path.join(STATIC_DIR, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(index);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    cors(res);
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    try {
      await handleAPI(req, res, url.pathname);
    } catch (e) {
      json(res, { error: (e as Error).message }, 500);
    }
  } else {
    serveStatic(res, url.pathname);
  }
});

server.listen(PORT, () => {
  console.log(`\n  🛫 Liligo MCP UI running at http://localhost:${PORT}\n`);
});
