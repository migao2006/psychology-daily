import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindNewCloudBackup,
  downloadCloudBackup,
  generateRecoveryCode,
  parseRecoveryCode,
} from "@/lib/db/cloud-backup";
import { backupSchema, defaultUserSettings } from "@/lib/schemas/progress";

const backupJson = JSON.stringify(
  backupSchema.parse({
    app: "psychology-daily",
    schemaVersion: 4,
    exportedAt: "2026-07-23T12:00:00Z",
    lessonProgress: [],
    activities: [],
    readResearch: [],
    meta: [{ key: "test", value: "private-progress" }],
    researchInteractions: [],
    savedResearchFilters: [],
    settings: [defaultUserSettings(new Date("2026-07-23T12:00:00Z"))],
    reviewItems: [],
    reviewAttempts: [],
  }),
);

describe("encrypted mandatory cloud binding", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("generates an unguessable recovery code and rejects incomplete codes", () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^PD1\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/);
    expect(parseRecoveryCode(code).keyBytes).toHaveLength(32);
    expect(() => parseRecoveryCode("PD1.short")).toThrow("復原碼格式不正確");
  });

  it("binds one device, uploads only ciphertext and decrypts the snapshot", async () => {
    let uploaded: unknown;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/bind")) {
          return new Response(JSON.stringify({ revision: 0 }), { status: 200 });
        }
        if (init?.method === "PUT") {
          uploaded = JSON.parse(String(init.body));
          return new Response(
            JSON.stringify({
              revision: 1,
              updatedAt: (uploaded as { updatedAt: string }).updatedAt,
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({ payload: uploaded, revision: 1 }),
          { status: 200 },
        );
      }),
    );

    const result = await bindNewCloudBackup(backupJson);
    expect(result.deviceId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(JSON.stringify(uploaded)).not.toContain("private-progress");
    expect((await downloadCloudBackup(result.recoveryCode)).raw).toBe(backupJson);
  });
});
