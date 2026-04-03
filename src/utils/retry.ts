export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions,
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(15_000),
      });

      if (response.ok) return response;

      const retryable = opts.retryableStatuses.includes(response.status);
      if (!retryable || attempt === opts.maxRetries) {
        throw new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          retryable,
        );
      }

      lastError = new FetchError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        true,
      );
    } catch (error) {
      if (error instanceof FetchError && !error.retryable) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === opts.maxRetries) break;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      opts.baseDelayMs * 2 ** attempt + Math.random() * opts.baseDelayMs,
      opts.maxDelayMs,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw lastError ?? new Error("Fetch failed after retries");
}
