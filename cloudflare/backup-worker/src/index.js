const ALLOWED_ORIGINS = new Set([
  "https://psychology-daily.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3100",
]);
const LOCATOR_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_BODY_BYTES = 2_900_000;

const worker = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "不允許的來源" }, 403);
    }

    const cors = corsHeaders(origin);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (env.BACKUP_RATE_LIMITER) {
      const { success } = await env.BACKUP_RATE_LIMITER.limit({ key: ip });
      if (!success) return json({ error: "操作太頻繁，請稍後再試" }, 429, cors);
    }

    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, service: "psychology-daily-backup" }, 200, cors);
    }

    const match = /^\/v1\/backups\/([A-Za-z0-9_-]+)$/.exec(url.pathname);
    if (!match || !LOCATOR_PATTERN.test(match[1])) {
      return json({ error: "找不到資源" }, 404, cors);
    }
    const locator = match[1];
    const storageKey = `backup:${locator}`;

    if (request.method === "GET") {
      const stored = await env.BACKUPS.get(storageKey, "json");
      if (!stored) return json({ error: "找不到備份" }, 404, cors);
      return json(stored.payload, 200, cors);
    }

    if (request.method === "PUT") {
      const writeToken = request.headers.get("X-Backup-Write-Token") || "";
      if (!TOKEN_PATTERN.test(writeToken)) {
        return json({ error: "缺少有效的寫入憑證" }, 401, cors);
      }
      const contentLength = Number(request.headers.get("Content-Length") || 0);
      if (contentLength > MAX_BODY_BYTES) {
        return json({ error: "備份資料超過大小限制" }, 413, cors);
      }
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
        return json({ error: "備份資料超過大小限制" }, 413, cors);
      }
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return json({ error: "備份格式無效" }, 400, cors);
      }
      if (!validEnvelope(payload)) {
        return json({ error: "備份格式無效" }, 400, cors);
      }
      const existing = await env.BACKUPS.get(storageKey, "json");
      if (existing && !timingSafeEqual(existing.writeToken, writeToken)) {
        return json({ error: "這組復原碼無法覆寫此備份" }, 403, cors);
      }
      await env.BACKUPS.put(
        storageKey,
        JSON.stringify({
          payload,
          writeToken,
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      );
      return json({ ok: true, updatedAt: payload.updatedAt }, 200, cors);
    }

    if (request.method === "DELETE") {
      const writeToken = request.headers.get("X-Backup-Write-Token") || "";
      const existing = await env.BACKUPS.get(storageKey, "json");
      if (!existing) return json({ error: "找不到備份" }, 404, cors);
      if (
        !TOKEN_PATTERN.test(writeToken) ||
        !timingSafeEqual(existing.writeToken, writeToken)
      ) {
        return json({ error: "復原碼無權刪除此備份" }, 403, cors);
      }
      await env.BACKUPS.delete(storageKey);
      return json({ ok: true }, 200, cors);
    }

    return json({ error: "不支援的操作" }, 405, cors);
  },
};

export default worker;

function validEnvelope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort().join(",");
  if (keys !== "ciphertext,iv,updatedAt,version") return false;
  return (
    value.version === 1 &&
    typeof value.iv === "string" &&
    value.iv.length === 16 &&
    BASE64URL_PATTERN.test(value.iv) &&
    typeof value.ciphertext === "string" &&
    value.ciphertext.length > 20 &&
    value.ciphertext.length <= 2_850_000 &&
    BASE64URL_PATTERN.test(value.ciphertext) &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

function timingSafeEqual(left, right) {
  if (
    typeof left !== "string" ||
    typeof right !== "string" ||
    left.length !== right.length
  ) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Backup-Write-Token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}
