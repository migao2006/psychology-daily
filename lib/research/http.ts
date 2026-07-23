const retryable = new Set([429, 500, 502, 503, 504]);
export async function fetchJson<T>(url: string, init: RequestInit = {}, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000), headers: { Accept: "application/json", "User-Agent": "psychology-daily/1.0 (public educational project)", ...init.headers } });
      if (response.ok) return await response.json() as T;
      if (!retryable.has(response.status)) throw new Error(`HTTP ${response.status}：${url}`);
      lastError = new Error(`暫時性 HTTP ${response.status}：${url}`);
    } catch (error) { lastError = error; }
    if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  throw lastError instanceof Error ? lastError : new Error(`API 請求失敗：${url}`);
}

