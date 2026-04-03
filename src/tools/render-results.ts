import type { DeeplinkResponse } from "../schemas/types.js";

export interface FlightResultInput {
  id: string;
  rank?: number;
  score?: number;
  price: number;
  currency: string;
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  departure_time?: string;
  return_date?: string;
  return_time?: string;
  duration_minutes?: number;
  stops: number;
  airline?: string;
  direct: boolean;
  deeplink?: DeeplinkResponse;
}

export interface RenderOptions {
  format: "markdown" | "compact" | "detailed";
  max_results?: number;
  show_deeplinks?: boolean;
  show_scores?: boolean;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };
  const symbol = symbols[currency] ?? currency;
  return `${price}${symbol}`;
}

function stopsLabel(stops: number): string {
  if (stops === 0) return "Direct";
  return stops === 1 ? "1 stop" : `${stops} stops`;
}

function renderMarkdown(results: FlightResultInput[], options: RenderOptions): string {
  const lines: string[] = [];
  const items = results.slice(0, options.max_results ?? 10);

  lines.push(`## ✈️ Flight Results (${items.length} options)\n`);

  for (const r of items) {
    const priceStr = formatPrice(r.price, r.currency);
    const route = `${r.origin_iata} → ${r.destination_iata}`;
    const dateStr = r.return_date
      ? `${r.departure_date} – ${r.return_date}`
      : r.departure_date;
    const durationStr = r.duration_minutes ? ` · ${formatDuration(r.duration_minutes)}` : "";
    const timeStr = r.departure_time ? ` at ${r.departure_time}` : "";
    const airlineStr = r.airline ? ` · ${r.airline}` : "";
    const scoreStr = options.show_scores && r.score !== undefined ? ` (score: ${r.score})` : "";

    lines.push(`### ${r.rank ? `#${r.rank} ` : ""}${priceStr} — ${route}${scoreStr}`);
    lines.push(`📅 ${dateStr}${timeStr}${durationStr}`);
    lines.push(`${stopsLabel(r.stops)}${airlineStr}`);

    if (options.show_deeplinks && r.deeplink?.url) {
      lines.push(`🔗 [Book on Liligo](${r.deeplink.url})`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

function renderCompact(results: FlightResultInput[], options: RenderOptions): string {
  const items = results.slice(0, options.max_results ?? 10);
  const lines: string[] = [];

  for (const r of items) {
    const priceStr = formatPrice(r.price, r.currency);
    const route = `${r.origin_iata}→${r.destination_iata}`;
    const durationStr = r.duration_minutes ? formatDuration(r.duration_minutes) : "";
    const direct = r.direct ? "✓" : `${r.stops}s`;
    const link = options.show_deeplinks && r.deeplink?.url ? ` ${r.deeplink.url}` : "";

    lines.push(`${priceStr} ${route} ${r.departure_date} ${durationStr} ${direct}${r.airline ? ` ${r.airline}` : ""}${link}`);
  }

  return lines.join("\n");
}

function renderDetailed(results: FlightResultInput[], options: RenderOptions): string {
  const items = results.slice(0, options.max_results ?? 10);

  return JSON.stringify(
    items.map((r) => ({
      rank: r.rank,
      price: formatPrice(r.price, r.currency),
      route: `${r.origin_iata} → ${r.destination_iata}`,
      dates: r.return_date ? `${r.departure_date} – ${r.return_date}` : r.departure_date,
      departure_time: r.departure_time ?? null,
      duration: r.duration_minutes ? formatDuration(r.duration_minutes) : null,
      stops: stopsLabel(r.stops),
      airline: r.airline ?? null,
      score: options.show_scores ? r.score : undefined,
      deeplink: options.show_deeplinks ? r.deeplink?.url : undefined,
    })),
    null,
    2,
  );
}

export function renderInteractiveResults(
  results: FlightResultInput[],
  options?: Partial<RenderOptions>,
): string {
  const opts: RenderOptions = {
    format: options?.format ?? "markdown",
    max_results: options?.max_results ?? 10,
    show_deeplinks: options?.show_deeplinks ?? true,
    show_scores: options?.show_scores ?? false,
  };

  switch (opts.format) {
    case "compact":
      return renderCompact(results, opts);
    case "detailed":
      return renderDetailed(results, opts);
    case "markdown":
    default:
      return renderMarkdown(results, opts);
  }
}
