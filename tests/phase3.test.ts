import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { refineTravelIntent } from "../src/tools/refine-intent.js";
import { renderInteractiveResults } from "../src/tools/render-results.js";
import { trackInteractionEvent, clearEvents, getSessionEvents } from "../src/analytics/tracker.js";

describe("refineTravelIntent", () => {
  it("returns questions for empty intent", () => {
    const result = refineTravelIntent({});
    assert.equal(result.is_complete, false);
    assert.ok(result.questions.some((q) => q.field === "origin"));
    assert.ok(result.questions.some((q) => q.field === "destination"));
    assert.ok(result.questions.some((q) => q.field === "departure_date"));
  });

  it("marks complete when required fields present", () => {
    const result = refineTravelIntent({
      origin_iata: "PAR",
      destination_iata: "BCN",
      departure_date: "2026-06-15",
    });
    assert.equal(result.is_complete, true);
    // Should still have optional/recommended questions
    assert.ok(result.questions.length > 0);
  });

  it("asks to resolve city names without IATA", () => {
    const result = refineTravelIntent({
      origin: "Paris",
      destination: "Barcelona",
      departure_date: "2026-06-15",
    });
    assert.ok(result.questions.some((q) => q.field === "origin_iata"));
    assert.ok(result.questions.some((q) => q.field === "destination_iata"));
  });

  it("asks for return date when round_trip not explicitly false", () => {
    const result = refineTravelIntent({
      origin_iata: "PAR",
      destination_iata: "BCN",
      departure_date: "2026-06-15",
    });
    assert.ok(result.questions.some((q) => q.field === "return_date"));
  });

  it("does not ask for return date when one-way", () => {
    const result = refineTravelIntent({
      origin_iata: "PAR",
      destination_iata: "BCN",
      departure_date: "2026-06-15",
      round_trip: false,
    });
    assert.ok(!result.questions.some((q) => q.field === "return_date"));
  });
});

describe("renderInteractiveResults", () => {
  const SAMPLE_RESULTS = [
    {
      id: "1", rank: 1, price: 89, currency: "EUR",
      origin_iata: "PAR", destination_iata: "BCN",
      departure_date: "2026-06-15", departure_time: "09:30",
      return_date: "2026-06-22",
      duration_minutes: 120, stops: 0, airline: "Vueling", direct: true,
      deeplink: { url: "https://www.liligo.fr/flight/results?from=PAR&to=BCN", valid: true, warnings: [] },
    },
    {
      id: "2", rank: 2, price: 65, currency: "EUR",
      origin_iata: "PAR", destination_iata: "BCN",
      departure_date: "2026-06-15", departure_time: "06:00",
      duration_minutes: 300, stops: 1, airline: "Ryanair", direct: false,
    },
  ];

  it("renders markdown format", () => {
    const output = renderInteractiveResults(SAMPLE_RESULTS, { format: "markdown" });
    assert.ok(output.includes("Flight Results"));
    assert.ok(output.includes("89€"));
    assert.ok(output.includes("PAR → BCN"));
    assert.ok(output.includes("Direct"));
    assert.ok(output.includes("Vueling"));
  });

  it("renders compact format", () => {
    const output = renderInteractiveResults(SAMPLE_RESULTS, { format: "compact" });
    assert.ok(output.includes("89€"));
    assert.ok(output.includes("PAR→BCN"));
  });

  it("renders detailed JSON format", () => {
    const output = renderInteractiveResults(SAMPLE_RESULTS, { format: "detailed" });
    const parsed = JSON.parse(output);
    assert.equal(parsed.length, 2);
    assert.ok(parsed[0].price.includes("89"));
  });

  it("includes deeplinks when show_deeplinks is true", () => {
    const output = renderInteractiveResults(SAMPLE_RESULTS, { format: "markdown", show_deeplinks: true });
    assert.ok(output.includes("liligo.fr"));
  });

  it("respects max_results", () => {
    const output = renderInteractiveResults(SAMPLE_RESULTS, { format: "compact", max_results: 1 });
    const lines = output.trim().split("\n");
    assert.equal(lines.length, 1);
  });
});

describe("trackInteractionEvent", () => {
  it("tracks an event and returns confirmation", () => {
    clearEvents();
    const result = trackInteractionEvent("search_initiated", { origin: "PAR", destination: "BCN" }, "test-session");
    assert.equal(result.tracked, true);
    assert.equal(result.event.event_type, "search_initiated");
    assert.ok(result.event.timestamp);
    assert.equal(result.events_in_session, 1);
  });

  it("accumulates events in session", () => {
    clearEvents();
    trackInteractionEvent("intent_detected", { origin: "PAR" }, "s1");
    trackInteractionEvent("city_resolved", { query: "Paris" }, "s1");
    const result = trackInteractionEvent("deeplink_generated", { url: "https://..." }, "s1");
    assert.equal(result.events_in_session, 3);
  });

  it("retrieves session events", () => {
    clearEvents();
    trackInteractionEvent("search_initiated", {}, "s1");
    trackInteractionEvent("search_initiated", {}, "s2");
    trackInteractionEvent("deeplink_clicked", {}, "s1");
    const events = getSessionEvents("s1");
    assert.equal(events.length, 2);
  });
});
