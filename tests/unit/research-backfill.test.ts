import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  BACKFILL_DAYS,
  BACKFILL_FALLBACK_DAYS,
  BACKFILL_NO_PROGRESS_LIMIT,
  BACKFILL_TARGET,
  advanceBackfillState,
  backfillFocusCategories,
  backfillResearch,
} from "@/lib/research/backfill";
import {
  RESEARCH_CATEGORIES,
  type ResearchBackfillState,
  type ResearchCategory,
} from "@/lib/schemas/research";
import { makeResearch } from "@/tests/fixtures/research";

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
    const items = Array.from({ length: BACKFILL_TARGET }, (_, index) => ({
      id: `item-${index}`,
      path: `items/item-${index}.json`,
      titleZh: `研究 ${index}`,
      publicationDate: "2026-07-01",
      publicationStatus: "peer_reviewed" as const,
      studyType: "experimental" as const,
      psychologyCategory: "認知心理學" as const,
    }));
    await mkdir(path.join(directory, "items"), { recursive: true });
    await Promise.all(
      items.map((item, index) =>
        writeFile(
          path.join(directory, item.path),
          JSON.stringify(
            makeResearch({
              id: item.id,
              titleZh: item.titleZh,
              titleOriginal: `Fixture research ${index}`,
            }),
          ),
        ),
      ),
    );
    await writeFile(
      path.join(directory, "index.json"),
      JSON.stringify({
        schemaVersion: 2,
        lastUpdatedAt: "2026-07-23T00:00:00Z",
        updateStatus: "backfilled",
        features: [],
        items,
      }),
    );
    await expect(backfillResearch(root)).resolves.toEqual(
      expect.objectContaining({
        added: 0,
        total: BACKFILL_TARGET,
        remaining: 0,
        status: "completed",
        failures: [],
      }),
    );
  });

  it("widens the publication window only after three empty runs", () => {
    let state = initialState();
    const now = new Date("2026-07-24T00:00:00Z");

    for (let run = 1; run < BACKFILL_NO_PROGRESS_LIMIT; run += 1) {
      state = advanceBackfillState(state, 1, 0, now);
      expect(state.activeWindowDays).toBe(BACKFILL_DAYS);
      expect(state.noProgressRuns).toBe(run);
    }

    state = advanceBackfillState(state, 1, 0, now);
    expect(state.activeWindowDays).toBe(BACKFILL_FALLBACK_DAYS);
    expect(state.noProgressRuns).toBe(0);
    expect(state.status).toBe("running");
  });

  it("marks the fallback window stalled after three more empty runs", () => {
    let state: ResearchBackfillState = {
      ...initialState(),
      activeWindowDays: BACKFILL_FALLBACK_DAYS,
    };
    const now = new Date("2026-07-24T00:00:00Z");

    for (let run = 0; run < BACKFILL_NO_PROGRESS_LIMIT; run += 1) {
      state = advanceBackfillState(state, 1, 0, now);
    }

    expect(state.status).toBe("stalled");
    expect(state.noProgressRuns).toBe(BACKFILL_NO_PROGRESS_LIMIT);
  });

  it("resets no-progress state after adding content and completes at target", () => {
    const now = new Date("2026-07-24T00:00:00Z");
    const recovered = advanceBackfillState(
      { ...initialState(), noProgressRuns: 2 },
      11,
      10,
      now,
    );
    expect(recovered).toEqual(
      expect.objectContaining({ status: "running", noProgressRuns: 0 }),
    );

    const completed = advanceBackfillState(
      recovered,
      BACKFILL_TARGET,
      1,
      now,
    );
    expect(completed).toEqual(
      expect.objectContaining({
        status: "completed",
        noProgressRuns: 0,
        completedAt: now.toISOString(),
      }),
    );
  });

  it("focuses each query batch on the two least-covered categories", () => {
    const counts = new Map<ResearchCategory, number>(
      RESEARCH_CATEGORIES.map((category, index) => [category, index + 1]),
    );

    expect(backfillFocusCategories(counts)).toEqual([
      "認知心理學",
      "社會心理學",
    ]);
  });
});

function initialState(): ResearchBackfillState {
  return {
    schemaVersion: 1,
    target: BACKFILL_TARGET,
    status: "running",
    activeWindowDays: BACKFILL_DAYS,
    noProgressRuns: 0,
    lastRunAt: null,
    completedAt: null,
    rejectedCandidates: [],
  };
}
