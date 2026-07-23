import { describe, expect, it } from "vitest";
import worker from "@/cloudflare/backup-worker/src/index.js";

const origin = "https://psychology-daily.vercel.app";
const envelope = {
  version: 1,
  iv: "a".repeat(16),
  ciphertext: "b".repeat(32),
  updatedAt: "2026-07-24T00:00:00.000Z",
};

class MemoryKv {
  private readonly values = new Map<string, string>();

  async get(key: string, type: "json"): Promise<unknown> {
    const stored = this.values.get(key);
    if (!stored) return null;
    return type === "json" ? JSON.parse(stored) : stored;
  }

  async put(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

function createClient() {
  const env = { BACKUPS: new MemoryKv() };
  return async (
    path: string,
    init: RequestInit = {},
  ): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set("Origin", origin);
    return worker.fetch(
      new Request(`https://backup.example${path}`, { ...init, headers }),
      env,
    );
  };
}

describe("Cloudflare backup Worker rollout compatibility", () => {
  it("keeps v1 encrypted backups working during the v2 rollout", async () => {
    const request = createClient();
    const locator = "l".repeat(22);
    const token = "w".repeat(43);
    const headers = {
      "Content-Type": "application/json",
      "X-Backup-Write-Token": token,
    };

    expect(
      (
        await request(`/v1/backups/${locator}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(envelope),
        })
      ).status,
    ).toBe(200);
    expect(
      await (await request(`/v1/backups/${locator}`)).json(),
    ).toEqual(envelope);
    expect(
      (
        await request(`/v1/backups/${locator}`, {
          method: "PUT",
          headers: {
            ...headers,
            "X-Backup-Write-Token": "x".repeat(43),
          },
          body: JSON.stringify(envelope),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(`/v1/backups/${locator}`, {
          method: "DELETE",
          headers,
        })
      ).status,
    ).toBe(200);
    expect((await request(`/v1/backups/${locator}`)).status).toBe(404);
  });

  it("enforces revision and single-active-device rules on v2", async () => {
    const request = createClient();
    const locator = "m".repeat(22);
    const token = "t".repeat(43);
    const firstDevice = "d".repeat(22);
    const secondDevice = "e".repeat(22);
    const headers = (deviceId: string) => ({
      "X-Backup-Write-Token": token,
      "X-Device-Id": deviceId,
    });

    expect(
      (
        await request(`/v2/backups/${locator}/bind`, {
          method: "POST",
          headers: headers(firstDevice),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(`/v2/backups/${locator}`, {
          method: "PUT",
          headers: {
            ...headers(firstDevice),
            "Content-Type": "application/json",
            "If-Match": "0",
          },
          body: JSON.stringify(envelope),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(`/v2/backups/${locator}/bind`, {
          method: "POST",
          headers: headers(secondDevice),
        })
      ).status,
    ).toBe(200);
    const replaced = await request(`/v2/backups/${locator}`, {
      method: "PUT",
      headers: {
        ...headers(firstDevice),
        "Content-Type": "application/json",
        "If-Match": "1",
      },
      body: JSON.stringify(envelope),
    });
    expect(replaced.status).toBe(409);
    expect(await replaced.json()).toMatchObject({ code: "device_replaced" });
    expect(
      (
        await request(`/v2/backups/${locator}`, {
          method: "DELETE",
          headers: headers(secondDevice),
        })
      ).status,
    ).toBe(200);
  });

  it("reports supported APIs and rejects unknown browser origins", async () => {
    const request = createClient();
    const health = await request("/health");
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({
      api: 2,
      compatibility: ["v1", "v2"],
    });

    const denied = await worker.fetch(
      new Request("https://backup.example/health", {
        headers: { Origin: "https://example.com" },
      }),
      { BACKUPS: new MemoryKv() },
    );
    expect(denied.status).toBe(403);
  });
});
