import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BACKFILL_TARGET, backfillResearch } from "@/lib/research/backfill";

const created: string[] = [];
afterEach(async () => {
  await Promise.all(
    created.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("research backfill", () => {
  it("is idempotent once the validated target is reached", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "psychology-backfill-"));
    created.push(root);
    const directory = path.join(root, "content", "research");
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "index.json"),
      JSON.stringify({
        schemaVersion: 2,
        lastUpdatedAt: "2026-07-23T00:00:00Z",
        updateStatus: "backfilled",
        features: [],
        items: Array.from({ length: BACKFILL_TARGET }, (_, index) => ({
          id: `item-${index}`,
          path: `items/item-${index}.json`,
          titleZh: `研究 ${index}`,
          publicationDate: "2026-07-01",
          publicationStatus: "peer_reviewed",
          studyType: "experimental",
          psychologyCategory: "認知心理學",
        })),
      }),
    );
    await expect(backfillResearch(root)).resolves.toEqual({
      added: 0,
      total: BACKFILL_TARGET,
      failures: [],
    });
  });
});
