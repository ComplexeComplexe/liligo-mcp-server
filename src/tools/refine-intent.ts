import type { TravelIntent } from "../schemas/types.js";

export interface RefinementQuestion {
  field: string;
  question: string;
  suggestions?: string[];
  priority: "required" | "recommended" | "optional";
}

export interface RefineIntentResult {
  is_complete: boolean;
  questions: RefinementQuestion[];
  current_intent: Partial<TravelIntent>;
}

export function refineTravelIntent(intent: Partial<TravelIntent>): RefineIntentResult {
  const questions: RefinementQuestion[] = [];

  // Required fields
  if (!intent.origin && !intent.origin_iata) {
    questions.push({
      field: "origin",
      question: "Where would you like to depart from?",
      suggestions: ["Paris", "London", "Barcelona", "Rome", "Berlin"],
      priority: "required",
    });
  }

  if (!intent.destination && !intent.destination_iata) {
    questions.push({
      field: "destination",
      question: "Where would you like to go?",
      suggestions: ["Barcelona", "Lisbon", "Rome", "London", "New York"],
      priority: "required",
    });
  }

  if (!intent.departure_date) {
    questions.push({
      field: "departure_date",
      question: "When would you like to depart? (YYYY-MM-DD)",
      priority: "required",
    });
  }

  // Recommended fields
  if (intent.round_trip !== false && !intent.return_date) {
    questions.push({
      field: "return_date",
      question: "When would you like to return? (YYYY-MM-DD) Or is this a one-way trip?",
      priority: "recommended",
    });
  }

  // Ambiguity checks
  if (intent.origin && !intent.origin_iata) {
    questions.push({
      field: "origin_iata",
      question: `You mentioned "${intent.origin}" as origin. Could you confirm the city? Use resolve_city_identifiers to get the IATA code.`,
      priority: "recommended",
    });
  }

  if (intent.destination && !intent.destination_iata) {
    questions.push({
      field: "destination_iata",
      question: `You mentioned "${intent.destination}" as destination. Could you confirm the city? Use resolve_city_identifiers to get the IATA code.`,
      priority: "recommended",
    });
  }

  // Optional enhancements
  if (intent.adults === undefined || intent.adults === 1) {
    questions.push({
      field: "passengers",
      question: "How many passengers? (adults, children, infants)",
      priority: "optional",
    });
  }

  if (!intent.cabin_class || intent.cabin_class === "economy") {
    questions.push({
      field: "cabin_class",
      question: "Which cabin class do you prefer?",
      suggestions: ["economy", "business", "first"],
      priority: "optional",
    });
  }

  const hasRequired = questions.filter((q) => q.priority === "required").length === 0;

  return {
    is_complete: hasRequired,
    questions,
    current_intent: intent,
  };
}
