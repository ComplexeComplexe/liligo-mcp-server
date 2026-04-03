import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankClickOptions } from "../src/tools/rank-options.js";

const SAMPLE_OPTIONS = [
  { id: "a", price: 150, duration_minutes: 120, stops: 0, departure_time: "09:00", airline: "Vueling", direct: true },
  { id: "b", price: 80, duration_minutes: 300, stops: 1, departure_time: "05:30", airline: "Ryanair", direct: false },
  { id: "c", price: 200, duration_minutes: 90, stops: 0, departure_time: "14:00", airline: "Air France", direct: true },
  { id: "d", price: 120, duration_minutes: 180, stops: 1, departure_time: "22:00", airline: "EasyJet", direct: false },
];

describe("rankClickOptions", () => {
  it("ranks options by composite score by default", () => {
    const result = rankClickOptions(SAMPLE_OPTIONS);
    assert.equal(result.length, 4);
    assert.equal(result[0].rank, 1);
    assert.equal(result[3].rank, 4);
    // Scores should be descending
    assert.ok(result[0].score >= result[1].score);
    assert.ok(result[1].score >= result[2].score);
  });

  it("sorts by price when requested", () => {
    const result = rankClickOptions(SAMPLE_OPTIONS, undefined, "price");
    assert.equal(result[0].id, "b"); // cheapest at 80
    assert.equal(result[0].price, 80);
    assert.equal(result[3].price, 200);
  });

  it("sorts by duration when requested", () => {
    const result = rankClickOptions(SAMPLE_OPTIONS, undefined, "duration");
    assert.equal(result[0].id, "c"); // fastest at 90 min
    assert.equal(result[0].duration_minutes, 90);
  });

  it("respects custom weights", () => {
    // Price-only ranking
    const priceOnly = rankClickOptions(SAMPLE_OPTIONS, { price: 1, duration: 0, stops: 0, departure_time: 0 });
    assert.equal(priceOnly[0].id, "b"); // cheapest

    // Duration-only ranking
    const durationOnly = rankClickOptions(SAMPLE_OPTIONS, { price: 0, duration: 1, stops: 0, departure_time: 0 });
    assert.equal(durationOnly[0].id, "c"); // fastest
  });

  it("includes score breakdown", () => {
    const result = rankClickOptions(SAMPLE_OPTIONS);
    const first = result[0];
    assert.ok("price_score" in first.score_breakdown);
    assert.ok("duration_score" in first.score_breakdown);
    assert.ok("stops_score" in first.score_breakdown);
    assert.ok("time_score" in first.score_breakdown);
  });

  it("handles single option", () => {
    const result = rankClickOptions([SAMPLE_OPTIONS[0]]);
    assert.equal(result.length, 1);
    assert.equal(result[0].rank, 1);
    assert.equal(result[0].score_breakdown.price_score, 1);
  });

  it("handles empty array", () => {
    const result = rankClickOptions([]);
    assert.equal(result.length, 0);
  });
});
