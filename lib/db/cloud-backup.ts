import { z } from "zod";
import { parseBackup } from "./backup";

export const CLOUD_BACKUP_API_URL =
  process.env.NEXT_PUBLIC_CLOUD_SYNC_API_URL ??
  "https://psychology-daily-backup.a0912647176.workers.dev";

const recoveryCodePattern =
  /^PD1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/;

const encryptedEnvelopeSchema = z.strictObject({
  version: z.literal(1),
  iv: z.string().regex(/^[A-Za-z0-9_-]{16}$/),
  ciphertext: z.string().regex(/^[A-Za-z0-9_-]+$/).max(3_000_000),
  updatedAt: z.iso.datetime({ offset: true }),
});

const remoteSnapshotSchema = z.strictObject({
  payload: encryptedEnvelopeSchema,
  revision: z.number().int().nonnegative(),
});

type EncryptedEnvelope = z.infer<typeof encryptedEnvelopeSchema>;

export type BoundCloudBackup = {
  recoveryCode: string;
  deviceId: string;
  revision: number;
  updatedAt: string;
};

export type DownloadedCloudBackup = {
  raw: string;
  revision: number;
  updatedAt: string;
};

export class CloudSyncConflictError extends Error {
  constructor(
    message: string,
    readonly reason: "device_replaced" | "revision_conflict",
  ) {
    super(message);
  }
}

export async function bindNewCloudBackup(
  backupJson: string,
): Promise<BoundCloudBackup> {
  parseBackup(backupJson);
  const recoveryCode = generateRecoveryCode();
  const deviceId = generateDeviceId();
  const revision = await bindDevice(recoveryCode, deviceId);
  const uploaded = await uploadCloudBackup(
    backupJson,
    recoveryCode,
    deviceId,
    revision,
  );
  return { recoveryCode, deviceId, ...uploaded };
}

export async function restoreAndBindCloudBackup(
  recoveryCode: string,
): Promise<BoundCloudBackup & { raw: string }> {
  const downloaded = await downloadCloudBackup(recoveryCode);
  const deviceId = generateDeviceId();
  const revision = await bindDevice(recoveryCode.trim(), deviceId);
  return {
    recoveryCode: recoveryCode.trim(),
    deviceId,
    revision,
    updatedAt: downloaded.updatedAt,
    raw: downloaded.raw,
  };
}

export async function uploadCloudBackup(
  backupJson: string,
  recoveryCode: string,
  deviceId: string,
  revision: number,
): Promise<{ revision: number; updatedAt: string }> {
  parseBackup(backupJson);
  const { locator, keyBytes } = parseRecoveryCode(recoveryCode.trim());
  const envelope = await encryptBackup(backupJson, locator, keyBytes);
  const response = await fetch(
    `${CLOUD_BACKUP_API_URL}/v2/backups/${encodeURIComponent(locator)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Backup-Write-Token": await deriveWriteToken(keyBytes),
        "X-Device-Id": deviceId,
        "If-Match": String(revision),
      },
      body: JSON.stringify(envelope),
    },
  );
  if (!response.ok) await throwCloudError(response, "雲端同步失敗");
  const body = z
    .strictObject({
      revision: z.number().int().nonnegative(),
      updatedAt: z.iso.datetime({ offset: true }),
    })
    .parse(await response.json());
  return body;
}

export async function downloadCloudBackup(
  recoveryCode: string,
): Promise<DownloadedCloudBackup> {
  const { locator, keyBytes } = parseRecoveryCode(recoveryCode.trim());
  const response = await fetch(
    `${CLOUD_BACKUP_API_URL}/v2/backups/${encodeURIComponent(locator)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) await throwCloudError(response, "找不到這組復原碼的資料");
  const snapshot = remoteSnapshotSchema.parse(await response.json());
  const raw = await decryptBackup(snapshot.payload, locator, keyBytes);
  parseBackup(raw);
  return {
    raw,
    revision: snapshot.revision,
    updatedAt: snapshot.payload.updatedAt,
  };
}

export async function deleteCloudBackup(
  recoveryCode: string,
  deviceId: string,
): Promise<void> {
  const { locator, keyBytes } = parseRecoveryCode(recoveryCode.trim());
  const response = await fetch(
    `${CLOUD_BACKUP_API_URL}/v2/backups/${encodeURIComponent(locator)}`,
    {
      method: "DELETE",
      headers: {
        "X-Backup-Write-Token": await deriveWriteToken(keyBytes),
        "X-Device-Id": deviceId,
      },
    },
  );
  if (!response.ok) await throwCloudError(response, "無法刪除雲端資料");
}

async function bindDevice(
  recoveryCode: string,
  deviceId: string,
): Promise<number> {
  const { locator, keyBytes } = parseRecoveryCode(recoveryCode);
  const response = await fetch(
    `${CLOUD_BACKUP_API_URL}/v2/backups/${encodeURIComponent(locator)}/bind`,
    {
      method: "POST",
      headers: {
        "X-Backup-Write-Token": await deriveWriteToken(keyBytes),
        "X-Device-Id": deviceId,
      },
    },
  );
  if (!response.ok) await throwCloudError(response, "無法綁定這台裝置");
  return z
    .strictObject({ revision: z.number().int().nonnegative() })
    .parse(await response.json()).revision;
}

export function generateRecoveryCode(): string {
  return `PD1.${toBase64Url(randomBytes(16))}.${toBase64Url(randomBytes(32))}`;
}

export function generateDeviceId(): string {
  return toBase64Url(randomBytes(16));
}

export function parseRecoveryCode(code: string): {
  locator: string;
  keyBytes: Uint8Array<ArrayBuffer>;
} {
  const match = recoveryCodePattern.exec(code);
  if (!match) {
    throw new Error("復原碼格式不正確，請貼上完整的 PD1 復原碼");
  }
  return { locator: match[1], keyBytes: fromBase64Url(match[2]) };
}

async function encryptBackup(
  raw: string,
  locator: string,
  keyBytes: Uint8Array<ArrayBuffer>,
): Promise<EncryptedEnvelope> {
  const iv = randomBytes(12);
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
    "encrypt",
  ]);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: new TextEncoder().encode(locator),
    },
    key,
    new TextEncoder().encode(raw),
  );
  return encryptedEnvelopeSchema.parse({
    version: 1,
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(new Uint8Array(ciphertext)),
    updatedAt: new Date().toISOString(),
  });
}

async function decryptBackup(
  envelope: EncryptedEnvelope,
  locator: string,
  keyBytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
  try {
    const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
      "decrypt",
    ]);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: fromBase64Url(envelope.iv),
        additionalData: new TextEncoder().encode(locator),
      },
      key,
      fromBase64Url(envelope.ciphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("復原碼不正確，或雲端資料已損毀");
  }
}

async function deriveWriteToken(
  keyBytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("psychology-daily-backup-write-v1"),
  );
  return toBase64Url(new Uint8Array(signature));
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(length);
  crypto.getRandomValues(output);
  return output;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function throwCloudError(
  response: Response,
  fallback: string,
): Promise<never> {
  let reason: string | undefined;
  try {
    const body = (await response.json()) as { error?: unknown; code?: unknown };
    reason = typeof body.error === "string" ? body.error : undefined;
    if (response.status === 409 && body.code === "device_replaced") {
      throw new CloudSyncConflictError(
        "這台裝置已被新的裝置取代，請重新綁定。",
        "device_replaced",
      );
    }
    if (response.status === 409 && body.code === "revision_conflict") {
      throw new CloudSyncConflictError(
        "雲端資料已更新，請先重新載入。",
        "revision_conflict",
      );
    }
  } catch (error) {
    if (error instanceof CloudSyncConflictError) throw error;
  }
  if (response.status === 404) throw new Error("找不到這組復原碼的資料");
  if (response.status === 429) throw new Error("操作太頻繁，請稍後再試");
  throw new Error(reason ?? fallback);
}
