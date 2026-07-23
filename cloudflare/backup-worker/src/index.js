const ALLOWED_ORIGINS = new Set([
  "https://psychology-daily.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3100",
]);
const LOCATOR_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const DEVICE_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_BODY_BYTES = 2_900_000;

const worker = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (
      !origin ||
      (!ALLOWED_ORIGINS.has(origin) && origin !== env.STAGING_ORIGIN)
    ) {
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
      return json({ ok: true, service: "psychology-daily-backup", api: 2 }, 200, cors);
    }

    const bindMatch = /^\/v2\/backups\/([A-Za-z0-9_-]+)\/bind$/.exec(url.pathname);
    if (bindMatch && request.method === "POST") {
      return bindDevice(request, env, bindMatch[1], cors);
    }

    const match = /^\/v2\/backups\/([A-Za-z0-9_-]+)$/.exec(url.pathname);
    if (!match || !LOCATOR_PATTERN.test(match[1])) {
      return json({ error: "找不到資源" }, 404, cors);
    }
    const storageKey = `backup:v2:${match[1]}`;
    const stored = await env.BACKUPS.get(storageKey, "json");

    if (request.method === "GET") {
      if (!stored?.payload) return json({ error: "找不到備份" }, 404, cors);
      return json({ payload: stored.payload, revision: stored.revision }, 200, cors);
    }

    if (request.method === "PUT") {
      const authError = authorizeActiveDevice(request, stored);
      if (authError) return json(authError.body, authError.status, cors);
      const expected = Number(request.headers.get("If-Match"));
      if (!Number.isInteger(expected) || expected !== stored.revision) {
        return json(
          { error: "雲端資料版本已變更", code: "revision_conflict" },
          409,
          cors,
        );
      }
      const payload = await parseEnvelopeRequest(request);
      if (payload.error) return json({ error: payload.error }, payload.status, cors);
      const revision = stored.revision + 1;
      await env.BACKUPS.put(
        storageKey,
        JSON.stringify({
          ...stored,
          payload: payload.value,
          revision,
          updatedAt: new Date().toISOString(),
        }),
      );
      return json({ revision, updatedAt: payload.value.updatedAt }, 200, cors);
    }

    if (request.method === "DELETE") {
      const authError = authorizeActiveDevice(request, stored);
      if (authError) return json(authError.body, authError.status, cors);
      await env.BACKUPS.delete(storageKey);
      return json({ ok: true }, 200, cors);
    }

    return json({ error: "不支援的操作" }, 405, cors);
  },
};

export default worker;

async function bindDevice(request, env, locator, cors) {
  if (!LOCATOR_PATTERN.test(locator)) {
    return json({ error: "找不到資源" }, 404, cors);
  }
  const writeToken = request.headers.get("X-Backup-Write-Token") || "";
  const deviceId = request.headers.get("X-Device-Id") || "";
  if (!TOKEN_PATTERN.test(writeToken) || !DEVICE_PATTERN.test(deviceId)) {
    return json({ error: "缺少有效的綁定憑證" }, 401, cors);
  }
  const storageKey = `backup:v2:${locator}`;
  const existing = await env.BACKUPS.get(storageKey, "json");
  if (existing && !timingSafeEqual(existing.writeToken, writeToken)) {
    return json({ error: "復原碼無法存取這份資料" }, 403, cors);
  }
  const next = {
    ...existing,
    writeToken,
    activeDeviceId: deviceId,
    revision: existing?.revision ?? 0,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    boundAt: new Date().toISOString(),
  };
  await env.BACKUPS.put(storageKey, JSON.stringify(next));
  return json({ revision: next.revision }, 200, cors);
}

function authorizeActiveDevice(request, stored) {
  if (!stored) return { status: 404, body: { error: "找不到備份" } };
  const token = request.headers.get("X-Backup-Write-Token") || "";
  const deviceId = request.headers.get("X-Device-Id") || "";
  if (!TOKEN_PATTERN.test(token) || !timingSafeEqual(stored.writeToken, token)) {
    return { status: 403, body: { error: "復原碼無權修改此資料" } };
  }
  if (!DEVICE_PATTERN.test(deviceId) || stored.activeDeviceId !== deviceId) {
    return {
      status: 409,
      body: { error: "這台裝置已被取代", code: "device_replaced" },
    };
  }
  return null;
}

async function parseEnvelopeRequest(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return { error: "備份資料超過大小限制", status: 413 };
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return { error: "備份資料超過大小限制", status: 413 };
  }
  try {
    const value = JSON.parse(raw);
    return validEnvelope(value)
      ? { value }
      : { error: "備份格式無效", status: 400 };
  } catch {
    return { error: "備份格式無效", status: 400 };
  }
}

function validEnvelope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    Object.keys(value).sort().join(",") === "ciphertext,iv,updatedAt,version" &&
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
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) {
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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Backup-Write-Token, X-Device-Id, If-Match",
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
