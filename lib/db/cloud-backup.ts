import { z } from "zod";
import { parseBackup } from "./backup";

export const CLOUD_BACKUP_API_URL =
  "https://psychology-daily-backup.a0912647176.workers.dev";

const recoveryCodePattern =
  /^PD1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/;

const encryptedEnvelopeSchema = z.strictObject({
  version: z.literal(1),
  iv: z.string().regex(/^[A-Za-z0-9_-]{16}$/),
  ciphertext: z.string().regex(/^[A-Za-z0-9_-]+$/).max(3_000_000),
  updatedAt: z.iso.datetime({ offset: true }),
});

type EncryptedEnvelope = z.infer<typeof encryptedEnvelopeSchema>;

export type CloudBackupResult = {
  recoveryCode: string;
  updatedAt: string;
};

export async function createCloudBackup(
  backupJson: string,
  existingRecoveryCode?: string,
): Promise<CloudBackupResult> {
  parseBackup(backupJson);
  const recoveryCode = existingRecoveryCode?.trim() || generateRecoveryCode();
  const { locator, keyBytes } = parseRecoveryCode(recoveryCode);
  const envelope = await encryptBackup(backupJson, locator, keyBytes);
  const writeToken = await deriveWriteToken(keyBytes);
  const response = await fetch(
    `${CLOUD_BACKUP_API_URL}/v1/backups/${encodeURIComponent(locator)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Backup-Write-Token": writeToken,
      },
      body: JSON.stringify(envelope),
    },
  );

  if (!response.ok) {
    throw new Error(await cloudErrorMessage(response, "雲端備份失敗"));
  }

  return { recoveryCode, updatedAt: envelope.updatedAt };
}

export async function downloadCloudBackup(
  recoveryCode: string,
): Promise<string> {
  const { locator, keyBytes } = parseRecoveryCode(recoveryCode.trim());
  const response = await fetch(
    `${CLOUD_BACKUP_API_URL}/v1/backups/${encodeURIComponent(locator)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(await cloudErrorMessage(response, "找不到這組復原碼的備份"));
  }
  const envelope = encryptedEnvelopeSchema.parse(await response.json());
  const raw = await decryptBackup(envelope, locator, keyBytes);
  parseBackup(raw);
  return raw;
}

export async function deleteCloudBackup(recoveryCode: string): Promise<void> {
  const { locator, keyBytes } = parseRecoveryCode(recoveryCode.trim());
  const response = await fetch(
    `${CLOUD_BACKUP_API_URL}/v1/backups/${encodeURIComponent(locator)}`,
    {
      method: "DELETE",
      headers: {
        "X-Backup-Write-Token": await deriveWriteToken(keyBytes),
      },
    },
  );
  if (!response.ok) {
    throw new Error(await cloudErrorMessage(response, "無法刪除雲端備份"));
  }
}

export function generateRecoveryCode(): string {
  const locator = randomBytes(16);
  const key = randomBytes(32);
  return `PD1.${toBase64Url(locator)}.${toBase64Url(key)}`;
}

export function parseRecoveryCode(code: string): {
  locator: string;
  keyBytes: Uint8Array<ArrayBuffer>;
} {
  const match = recoveryCodePattern.exec(code);
  if (!match) {
    throw new Error("復原碼格式不正確，請貼上完整的 PD1 復原碼");
  }
  return {
    locator: match[1],
    keyBytes: fromBase64Url(match[2]),
  };
}

async function encryptBackup(
  raw: string,
  locator: string,
  keyBytes: Uint8Array<ArrayBuffer>,
): Promise<EncryptedEnvelope> {
  const iv = randomBytes(12);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    "AES-GCM",
    false,
    ["encrypt"],
  );
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
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      "AES-GCM",
      false,
      ["decrypt"],
    );
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
    throw new Error("復原碼不正確，或雲端備份已損毀");
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
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function cloudErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  if (response.status === 404) return "找不到這組復原碼的備份";
  if (response.status === 429) return "操作太頻繁，請稍後再試";
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}
