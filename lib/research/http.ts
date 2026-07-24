const retryable = new Set([429, 500, 502, 503, 504]);

export class ResearchHttpError extends Error {
  constructor(
    public readonly status: number | null,
    public readonly retryable: boolean,
    endpoint: string,
  ) {
    super(
      status === null
        ? `研究 API 暫時無法連線：${sanitizeEndpoint(endpoint)}`
        : `研究 API HTTP ${status}：${sanitizeEndpoint(endpoint)}`,
    );
    this.name = "ResearchHttpError";
  }
}

export async function fetchJson<T>(url: string, init: RequestInit = {}, attempts = 4, timeoutMs = 15_000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let retryAfterMs = 0;
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), headers: { Accept: "application/json", "User-Agent": "psychology-daily/1.0 (public educational project)", ...init.headers } });
      if (response.ok) return await response.json() as T;
      retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      const error = new ResearchHttpError(
        response.status,
        retryable.has(response.status),
        url,
      );
      if (!error.retryable) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof ResearchHttpError && !error.retryable) throw error;
      lastError =
        error instanceof ResearchHttpError
          ? error
          : new ResearchHttpError(null, true, url);
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(500 * 2 ** attempt, retryAfterMs)),
      );
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new ResearchHttpError(null, true, url);
}

export function parseRetryAfterMs(value: string | null, now = Date.now()): number {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1_000);
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : 0;
}

function sanitizeEndpoint(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "invalid-endpoint";
  }
}
