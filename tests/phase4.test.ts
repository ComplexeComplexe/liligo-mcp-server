import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TTLCache } from "../src/utils/cache.js";
import { RateLimiter } from "../src/utils/rate-limiter.js";
import { Monitor } from "../src/utils/monitor.js";

describe("TTLCache", () => {
  it("stores and retrieves values", () => {
    const cache = new TTLCache<string>(60_000);
    cache.set("key1", "value1");
    assert.equal(cache.get("key1"), "value1");
  });

  it("returns undefined for missing keys", () => {
    const cache = new TTLCache<string>();
    assert.equal(cache.get("missing"), undefined);
  });

  it("expires entries after TTL", async () => {
    const cache = new TTLCache<string>(50); // 50ms TTL
    cache.set("key1", "value1");
    assert.equal(cache.get("key1"), "value1");
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(cache.get("key1"), undefined);
  });

  it("respects max size and evicts oldest", () => {
    const cache = new TTLCache<string>(60_000, 3);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    cache.set("d", "4"); // should evict "a"
    assert.equal(cache.get("a"), undefined);
    assert.equal(cache.get("d"), "4");
    assert.equal(cache.size, 3);
  });

  it("tracks hit/miss stats", () => {
    const cache = new TTLCache<string>();
    cache.set("key", "val");
    cache.get("key"); // hit
    cache.get("miss"); // miss
    const stats = cache.stats;
    assert.equal(stats.hits, 1);
    assert.equal(stats.misses, 1);
    assert.equal(stats.hitRate, 0.5);
  });

  it("prunes expired entries", async () => {
    const cache = new TTLCache<string>(50);
    cache.set("a", "1");
    cache.set("b", "2");
    await new Promise((r) => setTimeout(r, 80));
    cache.set("c", "3"); // fresh
    const pruned = cache.prune();
    assert.equal(pruned, 2);
    assert.equal(cache.size, 1);
  });
});

describe("RateLimiter", () => {
  it("allows requests within limit", () => {
    const limiter = new RateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) {
      assert.equal(limiter.tryAcquire(), true);
    }
  });

  it("blocks requests over limit", () => {
    const limiter = new RateLimiter(3, 60_000);
    assert.equal(limiter.tryAcquire(), true);
    assert.equal(limiter.tryAcquire(), true);
    assert.equal(limiter.tryAcquire(), true);
    assert.equal(limiter.tryAcquire(), false);
  });

  it("reports remaining slots", () => {
    const limiter = new RateLimiter(5, 60_000);
    assert.equal(limiter.remaining, 5);
    limiter.tryAcquire();
    limiter.tryAcquire();
    assert.equal(limiter.remaining, 3);
  });

  it("provides stats", () => {
    const limiter = new RateLimiter(10, 30_000);
    const stats = limiter.stats;
    assert.equal(stats.total, 10);
    assert.equal(stats.windowMs, 30_000);
    assert.equal(stats.remaining, 10);
  });
});

describe("Monitor", () => {
  it("registers and tracks services", () => {
    const mon = new Monitor();
    mon.registerService("test-api");
    mon.recordRequest("test-api");
    mon.recordRequest("test-api");
    mon.recordSuccess("test-api");

    const report = mon.getHealthReport();
    const svc = (report.services as Record<string, { requestCount: number; status: string }>)["test-api"];
    assert.equal(svc.requestCount, 2);
    assert.equal(svc.status, "healthy");
  });

  it("marks service degraded on errors", () => {
    const mon = new Monitor();
    mon.registerService("flaky");
    mon.recordRequest("flaky");
    mon.recordError("flaky", "timeout");

    const report = mon.getHealthReport();
    const svc = (report.services as Record<string, { status: string; lastError: string }>)["flaky"];
    assert.equal(svc.status, "degraded");
    assert.equal(svc.lastError, "timeout");
  });

  it("marks service unhealthy at high error rate", () => {
    const mon = new Monitor();
    mon.registerService("broken");
    for (let i = 0; i < 4; i++) {
      mon.recordRequest("broken");
      mon.recordError("broken", "fail");
    }

    const report = mon.getHealthReport();
    const svc = (report.services as Record<string, { status: string }>)["broken"];
    assert.equal(svc.status, "unhealthy");
    assert.equal(report.status, "unhealthy");
  });

  it("includes cache and rate limiter stats in report", () => {
    const mon = new Monitor();
    const cache = new TTLCache<string>();
    const limiter = new RateLimiter();

    const report = mon.getHealthReport({ test: cache }, { test: limiter });
    assert.ok("cache" in report);
    assert.ok("rate_limits" in report);
  });
});
