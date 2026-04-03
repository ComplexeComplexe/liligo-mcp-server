import type { TTLCache } from "./cache.js";
import type { RateLimiter } from "./rate-limiter.js";

export interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  lastError?: string;
  lastErrorAt?: string;
  requestCount: number;
  errorCount: number;
}

export class Monitor {
  private services = new Map<string, ServiceHealth>();
  private startedAt = new Date().toISOString();

  registerService(name: string): void {
    this.services.set(name, {
      name,
      status: "healthy",
      requestCount: 0,
      errorCount: 0,
    });
  }

  recordRequest(serviceName: string): void {
    const svc = this.services.get(serviceName);
    if (svc) svc.requestCount++;
  }

  recordError(serviceName: string, error: string): void {
    const svc = this.services.get(serviceName);
    if (svc) {
      svc.errorCount++;
      svc.lastError = error;
      svc.lastErrorAt = new Date().toISOString();
      // Degrade if error rate > 50% (with minimum 3 requests)
      if (svc.requestCount >= 3 && svc.errorCount / svc.requestCount > 0.5) {
        svc.status = "unhealthy";
      } else if (svc.errorCount > 0) {
        svc.status = "degraded";
      }
    }
  }

  recordSuccess(serviceName: string): void {
    const svc = this.services.get(serviceName);
    if (svc && svc.status === "degraded") {
      svc.status = "healthy";
    }
  }

  getHealthReport(
    caches?: Record<string, TTLCache>,
    rateLimiters?: Record<string, RateLimiter>,
  ): Record<string, unknown> {
    const servicesReport: Record<string, unknown> = {};
    for (const [name, svc] of this.services) {
      servicesReport[name] = { ...svc };
    }

    const cacheReport: Record<string, unknown> = {};
    if (caches) {
      for (const [name, cache] of Object.entries(caches)) {
        cacheReport[name] = cache.stats;
      }
    }

    const rateLimitReport: Record<string, unknown> = {};
    if (rateLimiters) {
      for (const [name, limiter] of Object.entries(rateLimiters)) {
        rateLimitReport[name] = limiter.stats;
      }
    }

    const overallStatus = [...this.services.values()].some((s) => s.status === "unhealthy")
      ? "unhealthy"
      : [...this.services.values()].some((s) => s.status === "degraded")
        ? "degraded"
        : "healthy";

    return {
      status: overallStatus,
      uptime_since: this.startedAt,
      services: servicesReport,
      cache: cacheReport,
      rate_limits: rateLimitReport,
    };
  }
}

// Singleton
export const monitor = new Monitor();
