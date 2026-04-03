import { z } from "zod";

export const CabinClass = z.enum(["economy", "business", "first"]);
export type CabinClass = z.infer<typeof CabinClass>;

export const CabinClassCode: Record<CabinClass, string> = {
  economy: "EC",
  business: "BC",
  first: "FC",
};

export const SortOption = z.enum(["cheapest", "fastest", "best"]);
export type SortOption = z.infer<typeof SortOption>;

export const SupportedTld = z.enum(["fr", "es", "it", "de", "co.uk", "com"]);
export type SupportedTld = z.infer<typeof SupportedTld>;

export const TravelIntentSchema = z.object({
  origin: z.string().optional(),
  origin_iata: z.string().optional(),
  origin_liligo_id: z.string().optional(),
  destination: z.string().optional(),
  destination_iata: z.string().optional(),
  destination_liligo_id: z.string().optional(),
  departure_date: z.string().optional(),
  return_date: z.string().optional(),
  round_trip: z.boolean().default(true),
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(8).default(0),
  infants: z.number().int().min(0).max(4).default(0),
  cabin_class: CabinClass.default("economy"),
  market_tld: SupportedTld.optional(),
  sort: SortOption.optional(),
});
export type TravelIntent = z.infer<typeof TravelIntentSchema>;

export const ResolvedCitySchema = z.object({
  name: z.string(),
  iata_code: z.string(),
  liligo_id: z.string(),
  country: z.string(),
  score: z.number(),
});
export type ResolvedCity = z.infer<typeof ResolvedCitySchema>;

export const DeeplinkRequestSchema = z.object({
  origin_iata: z.string().min(2),
  destination_iata: z.string().min(2).optional(),
  departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  round_trip: z.boolean().default(true),
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(8).default(0),
  infants: z.number().int().min(0).max(4).default(0),
  cabin_class: CabinClass.default("economy"),
  market_tld: SupportedTld.default("fr"),
  sort: SortOption.optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_content: z.string().optional(),
});
export type DeeplinkRequest = z.infer<typeof DeeplinkRequestSchema>;

export const DeeplinkResponseSchema = z.object({
  url: z.string(),
  valid: z.boolean(),
  warnings: z.array(z.string()),
});
export type DeeplinkResponse = z.infer<typeof DeeplinkResponseSchema>;

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const DetectedIntentSchema = z.object({
  intent: TravelIntentSchema.partial(),
  confidence: z.number().min(0).max(1),
  missing_fields: z.array(z.string()),
  raw_message: z.string(),
});
export type DetectedIntent = z.infer<typeof DetectedIntentSchema>;
