import type { TravelIntent, ValidationResult } from "../schemas/types.js";

export function validateTravelIntent(intent: Partial<TravelIntent>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!intent.origin && !intent.origin_iata) {
    errors.push("Missing origin: provide either origin name or origin_iata code");
  }
  if (!intent.destination && !intent.destination_iata) {
    errors.push("Missing destination: provide either destination name or destination_iata code");
  }
  if (!intent.departure_date) {
    errors.push("Missing departure_date (format: YYYY-MM-DD)");
  }

  // Date format validation
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (intent.departure_date && !dateRegex.test(intent.departure_date)) {
    errors.push("Invalid departure_date format. Expected YYYY-MM-DD");
  }
  if (intent.return_date && !dateRegex.test(intent.return_date)) {
    errors.push("Invalid return_date format. Expected YYYY-MM-DD");
  }

  // Date logic
  if (intent.departure_date && dateRegex.test(intent.departure_date)) {
    const depDate = new Date(intent.departure_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (depDate < today) {
      errors.push("departure_date is in the past");
    }

    if (intent.return_date && dateRegex.test(intent.return_date)) {
      const retDate = new Date(intent.return_date);
      if (retDate <= depDate) {
        errors.push("return_date must be after departure_date");
      }
    }
  }

  // Round trip consistency
  if (intent.round_trip && !intent.return_date) {
    warnings.push("round_trip is true but no return_date provided. A one-way deeplink will be generated.");
  }
  if (!intent.round_trip && intent.return_date) {
    warnings.push("return_date provided but round_trip is false. The return_date will be ignored.");
  }

  // Passenger validation
  const adults = intent.adults ?? 1;
  const children = intent.children ?? 0;
  const infants = intent.infants ?? 0;
  const totalPassengers = adults + children + infants;

  if (totalPassengers > 9) {
    errors.push(`Total passengers (${totalPassengers}) exceeds maximum of 9`);
  }
  if (infants > adults) {
    errors.push("Number of infants cannot exceed number of adults (infants sit on laps)");
  }
  if (adults < 1) {
    errors.push("At least 1 adult is required");
  }

  // IATA code format
  if (intent.origin_iata && !/^[A-Z]{3}$/.test(intent.origin_iata)) {
    warnings.push(`origin_iata "${intent.origin_iata}" doesn't look like a standard 3-letter IATA code`);
  }
  if (intent.destination_iata && !/^[A-Z]{3}$/.test(intent.destination_iata)) {
    warnings.push(`destination_iata "${intent.destination_iata}" doesn't look like a standard 3-letter IATA code`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
