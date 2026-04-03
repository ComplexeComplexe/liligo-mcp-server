export class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 30, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /** Returns true if the request is allowed, false if rate limited */
  tryAcquire(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxRequests) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  }

  /** Wait until a slot is available, then acquire */
  async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      const oldest = this.timestamps[0];
      const waitMs = oldest ? this.windowMs - (Date.now() - oldest) + 10 : 100;
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 1000)));
    }
  }

  /** Time in ms until next slot is available (0 if available now) */
  get waitTimeMs(): number {
    const now = Date.now();
    const active = this.timestamps.filter((t) => now - t < this.windowMs);
    if (active.length < this.maxRequests) return 0;
    const oldest = active[0]!;
    return this.windowMs - (now - oldest);
  }

  get remaining(): number {
    const now = Date.now();
    const active = this.timestamps.filter((t) => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - active.length);
  }

  get stats(): { remaining: number; total: number; windowMs: number } {
    return {
      remaining: this.remaining,
      total: this.maxRequests,
      windowMs: this.windowMs,
    };
  }
}
