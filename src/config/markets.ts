import type { SupportedTld } from "../schemas/types.js";

export interface MarketConfig {
  tld: SupportedTld;
  baseUrl: string;
  language: string;
  currency: string;
}

export const MARKETS: Record<SupportedTld, MarketConfig> = {
  fr: { tld: "fr", baseUrl: "https://www.liligo.fr", language: "fr", currency: "EUR" },
  es: { tld: "es", baseUrl: "https://www.liligo.es", language: "es", currency: "EUR" },
  it: { tld: "it", baseUrl: "https://www.liligo.it", language: "it", currency: "EUR" },
  de: { tld: "de", baseUrl: "https://www.liligo.de", language: "de", currency: "EUR" },
  "co.uk": { tld: "co.uk", baseUrl: "https://www.liligo.co.uk", language: "en", currency: "GBP" },
  com: { tld: "com", baseUrl: "https://www.liligo.com", language: "en", currency: "USD" },
};

export function getMarket(tld?: SupportedTld): MarketConfig {
  const resolved = tld ?? (process.env.LILIGO_DEFAULT_TLD as SupportedTld) ?? "fr";
  return MARKETS[resolved] ?? MARKETS.fr;
}
