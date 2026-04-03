export interface FlightOptionInput {
  id: string;
  price: number;
  duration_minutes: number;
  stops: number;
  departure_time: string;
  airline?: string;
  direct: boolean;
}

export interface RankWeights {
  price: number;
  duration: number;
  stops: number;
  departure_time: number;
}

export interface RankedOption {
  id: string;
  score: number;
  rank: number;
  price: number;
  duration_minutes: number;
  stops: number;
  departure_time: string;
  airline?: string;
  direct: boolean;
  score_breakdown: {
    price_score: number;
    duration_score: number;
    stops_score: number;
    time_score: number;
  };
}

const DEFAULT_WEIGHTS: RankWeights = {
  price: 0.4,
  duration: 0.3,
  stops: 0.2,
  departure_time: 0.1,
};

function normalizeScore(value: number, min: number, max: number): number {
  if (max === min) return 1;
  return 1 - (value - min) / (max - min);
}

function departureTimeScore(time: string): number {
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0.5;
  const hour = parseInt(match[1]);
  // Prefer departures between 8-11 and 14-18
  if (hour >= 8 && hour <= 11) return 1.0;
  if (hour >= 14 && hour <= 18) return 0.8;
  if (hour >= 6 && hour < 8) return 0.6;
  if (hour > 18 && hour <= 21) return 0.5;
  return 0.2; // very early or very late
}

export function rankClickOptions(
  options: FlightOptionInput[],
  weights?: Partial<RankWeights>,
  sortBy?: "score" | "price" | "duration",
): RankedOption[] {
  if (options.length === 0) return [];

  const w = { ...DEFAULT_WEIGHTS, ...weights };

  const prices = options.map((o) => o.price);
  const durations = options.map((o) => o.duration_minutes);
  const stops = options.map((o) => o.stops);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const minStops = Math.min(...stops);
  const maxStops = Math.max(...stops);

  const scored = options.map((opt) => {
    const priceScore = normalizeScore(opt.price, minPrice, maxPrice);
    const durationScore = normalizeScore(opt.duration_minutes, minDuration, maxDuration);
    const stopsScore = normalizeScore(opt.stops, minStops, maxStops);
    const timeScore = departureTimeScore(opt.departure_time);

    const score =
      Math.round(
        (w.price * priceScore +
          w.duration * durationScore +
          w.stops * stopsScore +
          w.departure_time * timeScore) *
          100,
      ) / 100;

    return {
      id: opt.id,
      score,
      rank: 0,
      price: opt.price,
      duration_minutes: opt.duration_minutes,
      stops: opt.stops,
      departure_time: opt.departure_time,
      airline: opt.airline,
      direct: opt.direct,
      score_breakdown: {
        price_score: Math.round(priceScore * 100) / 100,
        duration_score: Math.round(durationScore * 100) / 100,
        stops_score: Math.round(stopsScore * 100) / 100,
        time_score: Math.round(timeScore * 100) / 100,
      },
    };
  });

  // Sort
  if (sortBy === "price") {
    scored.sort((a, b) => a.price - b.price);
  } else if (sortBy === "duration") {
    scored.sort((a, b) => a.duration_minutes - b.duration_minutes);
  } else {
    scored.sort((a, b) => b.score - a.score);
  }

  // Assign ranks
  scored.forEach((opt, i) => {
    opt.rank = i + 1;
  });

  return scored;
}
