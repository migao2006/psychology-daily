import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCloudBackup,
  downloadCloudBackup,
  generateRecoveryCode,
  parseRecoveryCode,
} from "@/lib/db/cloud-backup";
import { backupSchema } from "@/lib/schemas/progress";

const backupJson = JSON.stringify(
  backupSchema.parse({
    app: "psychology-daily",
    schemaVersion: 2,
    exportedAt: "2026-07-23T12:00:00Z",
    lessonProgress: [],
    activities: [],
    readResearch: [],
    meta: [{ key: "test", value: "private-progress" }],
  }),
);

describe("encrypted cloud backup", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("generates an unguessable recovery code and rejects incomplete codes", () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^PD1\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/);
    expect(parseRecoveryCode(code).keyBytes).toHaveLength(32);
    expect(() => parseRecoveryCode("PD1.short")).toThrow("復原碼格式不正確");
  });

  it("uploads only ciphertext and decrypts it with the same recovery code", async () => {
    let uploaded: unknown;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          uploaded = JSON.parse(String(init.body));
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response(JSON.stringify(uploaded), { status: 200 });
      }),
    );

    const result = await createCloudBackup(backupJson);
    expect(JSON.stringify(uploaded)).not.toContain("private-progress");
    expect(await downloadCloudBackup(result.recoveryCode)).toBe(backupJson);
  });
});
