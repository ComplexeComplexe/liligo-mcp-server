import type { DetectedIntent, TravelIntent } from "../schemas/types.js";

const DATE_PATTERNS = [
  /(\d{4}-\d{2}-\d{2})/g,
  /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/g,
  /(\d{1,2})\s+(jan(?:uary|vier)?|feb(?:ruary|rier)?|mar(?:ch|s)?|apr(?:il)?|avr(?:il)?|may|mai|jun(?:e|i)?|jul(?:y|let)?|aug(?:ust)?|ao[uû]t?|sep(?:tember|tembre)?|oct(?:ober|obre)?|nov(?:ember|embre)?|dec(?:ember|embre)?)\s+(\d{4})/gi,
];

const MONTH_MAP: Record<string, string> = {
  jan: "01", january: "01", janvier: "01",
  feb: "02", february: "02", fevrier: "02", février: "02",
  mar: "03", march: "03", mars: "03",
  apr: "04", april: "04", avr: "04", avril: "04",
  may: "05", mai: "05",
  jun: "06", june: "06", juin: "06",
  jul: "07", july: "07", juillet: "07",
  aug: "08", august: "08", aout: "08", août: "08",
  sep: "09", september: "09", septembre: "09",
  oct: "10", october: "10", octobre: "10",
  nov: "11", november: "11", novembre: "11",
  dec: "12", december: "12", decembre: "12", décembre: "12",
};

const CABIN_PATTERNS: Record<string, string> = {
  economy: "economy", eco: "economy", economique: "economy", économique: "economy",
  business: "business", affaires: "business",
  first: "first", premiere: "first", première: "first", "first class": "first",
};

const ROUND_TRIP_KEYWORDS = ["round trip", "round-trip", "return", "aller-retour", "aller retour", "ida y vuelta", "andata e ritorno", "hin und zurück"];
const ONE_WAY_KEYWORDS = ["one way", "one-way", "aller simple", "solo ida", "solo andata", "einfach"];

function extractDates(message: string): string[] {
  const dates: string[] = [];
  const isoMatch = message.match(/\d{4}-\d{2}-\d{2}/g);
  if (isoMatch) dates.push(...isoMatch);

  const dayMonthYear = /(\d{1,2})\s+(jan(?:uary|vier)?|feb(?:ruary|rier)?|mar(?:ch|s)?|apr(?:il)?|avr(?:il)?|may|mai|jun(?:e|i)?|jul(?:y|let)?|aug(?:ust)?|ao[uû]t?|sep(?:tember|tembre)?|oct(?:ober|obre)?|nov(?:ember|embre)?|dec(?:ember|embre)?)\s+(\d{4})/gi;
  let match;
  while ((match = dayMonthYear.exec(message)) !== null) {
    const day = match[1].padStart(2, "0");
    const monthKey = match[2].toLowerCase();
    const month = MONTH_MAP[monthKey];
    if (month) {
      dates.push(`${match[3]}-${month}-${day}`);
    }
  }

  return [...new Set(dates)];
}

function extractPassengers(message: string): { adults?: number; children?: number; infants?: number } {
  const result: { adults?: number; children?: number; infants?: number } = {};
  const adultMatch = message.match(/(\d+)\s*adult/i);
  if (adultMatch) result.adults = parseInt(adultMatch[1]);

  const childMatch = message.match(/(\d+)\s*child(?:ren)?/i) ?? message.match(/(\d+)\s*enfant/i);
  if (childMatch) result.children = parseInt(childMatch[1]);

  const infantMatch = message.match(/(\d+)\s*infant/i) ?? message.match(/(\d+)\s*b[eé]b[eé]/i);
  if (infantMatch) result.infants = parseInt(infantMatch[1]);

  return result;
}

function extractCabinClass(message: string): string | undefined {
  const lower = message.toLowerCase();
  for (const [keyword, cabin] of Object.entries(CABIN_PATTERNS)) {
    if (lower.includes(keyword)) return cabin;
  }
  return undefined;
}

function detectTripType(message: string): boolean | undefined {
  const lower = message.toLowerCase();
  if (ONE_WAY_KEYWORDS.some((kw) => lower.includes(kw))) return false;
  if (ROUND_TRIP_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  return undefined;
}

export function detectTravelIntent(userMessage: string): DetectedIntent {
  const intent: Partial<TravelIntent> = {};
  const missingFields: string[] = [];

  // Extract dates
  const dates = extractDates(userMessage);
  if (dates.length >= 1) intent.departure_date = dates[0];
  if (dates.length >= 2) intent.return_date = dates[1];

  // Extract passengers
  const passengers = extractPassengers(userMessage);
  if (passengers.adults !== undefined) intent.adults = passengers.adults;
  if (passengers.children !== undefined) intent.children = passengers.children;
  if (passengers.infants !== undefined) intent.infants = passengers.infants;

  // Extract cabin class
  const cabin = extractCabinClass(userMessage);
  if (cabin) intent.cabin_class = cabin as TravelIntent["cabin_class"];

  // Detect trip type
  const roundTrip = detectTripType(userMessage);
  if (roundTrip !== undefined) intent.round_trip = roundTrip;
  else if (dates.length >= 2) intent.round_trip = true;

  // Extract city names (heuristic: look for "from X to Y" or "X to Y" patterns)
  const fromTo = userMessage.match(/(?:from|de|da|von|desde)\s+([A-Za-zÀ-ÿ-]{2,}(?:\s+[A-Za-zÀ-ÿ-]{2,})*)(?:\s+(?:to|à|nach|hacia)\s+)([A-Za-zÀ-ÿ-]{2,}(?:\s+[A-Za-zÀ-ÿ-]{2,})*)(?:\s+(?:on|le|il|am|el|,|\d))/i);
  if (fromTo) {
    intent.origin = fromTo[1].trim();
    intent.destination = fromTo[2].trim();
  } else {
    const simpleFromTo = userMessage.match(/([A-Za-zÀ-ÿ-]{2,}(?:\s+[A-Za-zÀ-ÿ-]{2,})*)\s+(?:to|→|->|vers|nach|hacia)\s+([A-Za-zÀ-ÿ-]{2,}(?:\s+[A-Za-zÀ-ÿ-]{2,})*)(?:\s|,|$)/i);
    if (simpleFromTo) {
      intent.origin = simpleFromTo[1].trim();
      intent.destination = simpleFromTo[2].trim();
    }
  }

  // Check for IATA codes (3 uppercase letters)
  const iataCodes = userMessage.match(/\b([A-Z]{3})\b/g);
  if (iataCodes && iataCodes.length >= 1 && !intent.origin_iata) {
    intent.origin_iata = iataCodes[0];
  }
  if (iataCodes && iataCodes.length >= 2 && !intent.destination_iata) {
    intent.destination_iata = iataCodes[1];
  }

  // Determine missing fields
  if (!intent.origin && !intent.origin_iata) missingFields.push("origin");
  if (!intent.destination && !intent.destination_iata) missingFields.push("destination");
  if (!intent.departure_date) missingFields.push("departure_date");

  // Calculate confidence
  const totalFields = 3; // origin, destination, departure_date
  const foundFields = totalFields - missingFields.length;
  const confidence = Math.round((foundFields / totalFields) * 100) / 100;

  return {
    intent,
    confidence,
    missing_fields: missingFields,
    raw_message: userMessage,
  };
}
