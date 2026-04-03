import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDeeplink } from "../src/deeplink/builder.js";
import { validateTravelIntent } from "../src/tools/validate-intent.js";
import { detectTravelIntent } from "../src/tools/detect-intent.js";

describe("buildDeeplink", () => {
  it("Paris → Barcelona, round-trip, 1 adult, economy", () => {
    const result = buildDeeplink({
      origin_iata: "PAR",
      departure_date: "2026-06-15",
      return_date: "2026-06-22",
      round_trip: true,
      adults: 1,
      children: 0,
      infants: 0,
      cabin_class: "economy",
      market_tld: "fr",
    });

    assert.equal(result.valid, true);
    assert.ok(result.url.includes("liligo.fr/flight/results"));
    assert.ok(result.url.includes("from=PAR"));
    assert.ok(result.url.includes("dep=2026-06-15"));
    assert.ok(result.url.includes("ret=2026-06-22"));
    assert.ok(result.url.includes("passengers=1%2C0%2C0"));
    assert.ok(result.url.includes("class=EC"));
    assert.ok(result.url.includes("product=air"));
    assert.ok(result.url.includes("apiVersion=3"));
    assert.ok(result.url.includes("onlySearchIndex=1"));
  });

  it("London → New York, one-way, 2 adults, business", () => {
    const result = buildDeeplink({
      origin_iata: "LHR",
      departure_date: "2026-05-10",
      round_trip: false,
      adults: 2,
      children: 0,
      infants: 0,
      cabin_class: "business",
      market_tld: "com",
    });

    assert.equal(result.valid, true);
    assert.ok(result.url.includes("liligo.com/flight/results"));
    assert.ok(result.url.includes("from=LHR"));
    assert.ok(result.url.includes("dep=2026-05-10"));
    assert.ok(!result.url.includes("ret="), "One-way should not have return date");
    assert.ok(result.url.includes("passengers=2%2C0%2C0"));
    assert.ok(result.url.includes("class=BC"));
  });

  it("Lyon → Lisbon, family: 2 adults + 2 children + 1 infant", () => {
    const result = buildDeeplink({
      origin_iata: "LYS",
      departure_date: "2026-06-15",
      return_date: "2026-06-25",
      round_trip: true,
      adults: 2,
      children: 2,
      infants: 1,
      cabin_class: "economy",
      market_tld: "fr",
    });

    assert.equal(result.valid, true);
    assert.ok(result.url.includes("from=LYS"));
    assert.ok(result.url.includes("passengers=2%2C2%2C1"));
    assert.ok(result.url.includes("ret=2026-06-25"));
  });

  it("returns error when origin_iata is missing", () => {
    const result = buildDeeplink({
      origin_iata: "",
      departure_date: "2026-06-15",
      round_trip: true,
      adults: 1,
      children: 0,
      infants: 0,
      cabin_class: "economy",
      market_tld: "fr",
    });

    assert.equal(result.valid, false);
    assert.ok(result.warnings.length > 0);
  });

  it("warns when round_trip but no return_date", () => {
    const result = buildDeeplink({
      origin_iata: "PAR",
      departure_date: "2026-06-15",
      round_trip: true,
      adults: 1,
      children: 0,
      infants: 0,
      cabin_class: "economy",
      market_tld: "fr",
    });

    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.includes("Round trip")));
  });

  it("includes sort and UTM parameters when provided", () => {
    const result = buildDeeplink({
      origin_iata: "PAR",
      destination_iata: "BCN",
      departure_date: "2026-06-15",
      round_trip: false,
      adults: 1,
      children: 0,
      infants: 0,
      cabin_class: "economy",
      market_tld: "fr",
      sort: "cheapest",
      utm_source: "claude",
      utm_medium: "chat",
    });

    assert.ok(result.url.includes("sort=cheapest"));
    assert.ok(result.url.includes("utm_source=claude"));
    assert.ok(result.url.includes("utm_medium=chat"));
  });
});

describe("validateTravelIntent", () => {
  it("valid complete intent passes", () => {
    const result = validateTravelIntent({
      origin_iata: "PAR",
      destination_iata: "BCN",
      departure_date: "2026-12-15",
      return_date: "2026-12-22",
      round_trip: true,
      adults: 1,
      children: 0,
      infants: 0,
      cabin_class: "economy",
    });

    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it("detects missing required fields", () => {
    const result = validateTravelIntent({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("origin")));
    assert.ok(result.errors.some((e) => e.includes("destination")));
    assert.ok(result.errors.some((e) => e.includes("departure_date")));
  });

  it("detects return_date before departure_date", () => {
    const result = validateTravelIntent({
      origin_iata: "PAR",
      destination_iata: "BCN",
      departure_date: "2026-12-22",
      return_date: "2026-12-15",
      round_trip: true,
      adults: 1,
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("return_date must be after")));
  });

  it("detects too many passengers", () => {
    const result = validateTravelIntent({
      origin_iata: "PAR",
      destination_iata: "BCN",
      departure_date: "2026-12-15",
      adults: 5,
      children: 3,
      infants: 2,
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("exceeds maximum")));
  });

  it("detects more infants than adults", () => {
    const result = validateTravelIntent({
      origin_iata: "PAR",
      destination_iata: "BCN",
      departure_date: "2026-12-15",
      adults: 1,
      infants: 2,
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("infants cannot exceed")));
  });
});

describe("detectTravelIntent", () => {
  it("extracts dates in ISO format", () => {
    const result = detectTravelIntent("I want to fly from Paris to Barcelona on 2026-06-15 returning 2026-06-22");
    assert.equal(result.intent.departure_date, "2026-06-15");
    assert.equal(result.intent.return_date, "2026-06-22");
  });

  it("extracts IATA codes", () => {
    const result = detectTravelIntent("Flight from PAR to BCN on 2026-06-15");
    assert.equal(result.intent.origin_iata, "PAR");
    assert.equal(result.intent.destination_iata, "BCN");
  });

  it("detects business class", () => {
    const result = detectTravelIntent("Business class flight from Paris to New York");
    assert.equal(result.intent.cabin_class, "business");
  });

  it("detects one-way trip", () => {
    const result = detectTravelIntent("One way flight from London to Paris on 2026-05-10");
    assert.equal(result.intent.round_trip, false);
  });

  it("lists missing fields", () => {
    const result = detectTravelIntent("I want a cheap flight");
    assert.ok(result.missing_fields.includes("origin"));
    assert.ok(result.missing_fields.includes("destination"));
    assert.ok(result.missing_fields.includes("departure_date"));
    assert.equal(result.confidence, 0);
  });

  it("extracts passenger counts", () => {
    const result = detectTravelIntent("Flight for 2 adults and 1 child from PAR to BCN on 2026-06-15");
    assert.equal(result.intent.adults, 2);
    assert.equal(result.intent.children, 1);
  });
});
