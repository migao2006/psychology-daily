import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  RESEARCH_CATEGORIES,
  researchArticleSchema,
  researchBackfillStateSchema,
  researchIndexSchema,
  type BackfillRejectionCode,
  type ResearchArticle,
  type ResearchBackfillState,
  type ResearchCategory,
  type ResearchIndex,
} from "@/lib/schemas/research";
import { deduplicatePapers } from "./deduplicate";
import { asCandidateRejection } from "./errors";
import { fetchBackfillCandidates } from "./fetch";
import { normalizeDoi, normalizeTitle } from "./normalize";
import { findOpenAccess } from "./open-access";
import { rankPapers } from "./rank";
import { createSummarizer } from "./summarizer";
import type { RankedCandidate, ResearchSource } from "./types";
import { safeFilename } from "./update";
import { verifyMetadata } from "./verify";

export const BACKFILL_TARGET = 100;
export const BACKFILL_DAYS = 180;
export const BACKFILL_FALLBACK_DAYS = 365;
export const BACKFILL_MIN_PER_CATEGORY = 12;
export const BACKFILL_PREPRINT_LIMIT = 20;
export const BACKFILL_NO_PROGRESS_LIMIT = 3;
export const BACKFILL_MAX_BATCH_SIZE = 50;

export type BackfillOptions = {
  batchSize?: number;
  resetStalled?: boolean;
};

export type BackfillResult = {
  added: number;
  total: number;
  remaining: number;
  status: ResearchBackfillState["status"];
  activeWindowDays: ResearchBackfillState["activeWindowDays"];
  noProgressRuns: number;
  failures: Array<{
    fingerprint: string;
    code: BackfillRejectionCode;
  }>;
  categoryCounts: Record<ResearchCategory, number>;
  preprintCount: number;
  openAccessCount: number;
};

export function normalizeBackfillBatchSize(requested: number): number {
  if (!Number.isFinite(requested)) return BACKFILL_MAX_BATCH_SIZE;
  return Math.max(
    1,
    Math.min(BACKFILL_MAX_BATCH_SIZE, Math.floor(requested)),
  );
}

export async function backfillResearch(
  root = process.cwd(),
  now = new Date(),
  options: BackfillOptions | number = {},
): Promise<BackfillResult> {
  const normalizedOptions =
    typeof options === "number" ? { batchSize: options } : options;
  const requestedBatchSize = normalizedOptions.batchSize ?? BACKFILL_MAX_BATCH_SIZE;
  const batchSize = normalizeBackfillBatchSize(requestedBatchSize);
  const researchDirectory = path.join(root, "content", "research");
  const indexPath = path.join(researchDirectory, "index.json");
  const statePath = path.join(researchDirectory, "backfill-state.json");
  const index = researchIndexSchema.parse(
    JSON.parse(await readFile(indexPath, "utf8")),
  );
  let state = await readBackfillState(statePath);
  if (state.status === "stalled" && normalizedOptions.resetStalled) {
    state = {
      ...state,
      status: "running",
      noProgressRuns: 0,
    };
  }

  const existingArticles = await readExistingArticles(root, index);
  if (index.items.length >= BACKFILL_TARGET) {
    const completedState = researchBackfillStateSchema.parse({
      ...state,
      status: "completed",
      noProgressRuns: 0,
      lastRunAt: now.toISOString(),
      completedAt: state.completedAt ?? now.toISOString(),
    });
    if (JSON.stringify(completedState) !== JSON.stringify(state)) {
      await writeBackfillState(statePath, completedState);
    }
    return buildResult(existingArticles, completedState, 0, []);
  }

  if (state.status === "stalled" && !normalizedOptions.resetStalled) {
    return buildResult(existingArticles, state, 0, []);
  }

  const counts = categoryCounts(existingArticles);
  let preprintCount = existingArticles.filter(
    (item) => item.publicationStatus === "preprint",
  ).length;
  const focusCategories = backfillFocusCategories(counts);
  const rejected = new Set(
    state.rejectedCandidates.map((item) => item.fingerprint),
  );
  const existingDois = new Set(
    existingArticles
      .map((item) => normalizeDoi(item.doi))
      .filter((doi): doi is string => Boolean(doi)),
  );
  const existingTitles = new Set(
    existingArticles.map((item) => normalizeTitle(item.titleOriginal)),
  );
  const candidates = deduplicatePapers(
    await fetchBackfillCandidates(
      now,
      state.activeWindowDays,
      focusCategories,
    ),
  ).filter((item) => {
    const fingerprint = candidateFingerprint(item);
    return (
      !rejected.has(fingerprint) &&
      (!item.doi || !existingDois.has(normalizeDoi(item.doi) ?? "")) &&
      !existingTitles.has(normalizeTitle(item.title))
    );
  });
  const ranked = rankPapers(candidates, now);
  const summarizer = createSummarizer();
  const generated: ResearchArticle[] = [];
  const failures: BackfillResult["failures"] = [];
  const remainingTarget = BACKFILL_TARGET - index.items.length;
  const targetForRun = Math.min(batchSize, remainingTarget);

  while (generated.length < targetForRun && ranked.length > 0) {
    ranked.sort((left, right) => compareForCoverage(left, right, counts));
    const candidate = ranked.shift();
    if (!candidate) break;
    if (
      candidate.publicationStatus === "preprint" &&
      preprintCount >= BACKFILL_PREPRINT_LIMIT
    ) {
      continue;
    }
    try {
      const verified = await findOpenAccess(await verifyMetadata(candidate));
      const article = await summarizer.summarize(verified);
      generated.push(article);
      counts.set(
        article.psychologyCategory,
        (counts.get(article.psychologyCategory) ?? 0) + 1,
      );
      if (article.publicationStatus === "preprint") preprintCount += 1;
    } catch (error) {
      const rejection = asCandidateRejection(error);
      if (!rejection) throw error;
      const fingerprint = candidateFingerprint(candidate);
      failures.push({ fingerprint, code: rejection.code });
      state = addRejectedCandidate(
        state,
        fingerprint,
        rejection.code,
        now.toISOString(),
      );
    }
  }

  if (generated.length > 0) {
    await writeGeneratedArticles(researchDirectory, generated);
    await writeIndex(indexPath, index, generated, now);
  }

  const nextTotal = index.items.length + generated.length;
  state = advanceBackfillState(state, nextTotal, generated.length, now);
  await writeBackfillState(statePath, state);
  return buildResult(
    [...existingArticles, ...generated],
    state,
    generated.length,
    failures,
  );
}

function defaultBackfillState(): ResearchBackfillState {
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

async function readBackfillState(
  statePath: string,
): Promise<ResearchBackfillState> {
  try {
    return researchBackfillStateSchema.parse(
      JSON.parse(await readFile(statePath, "utf8")),
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return defaultBackfillState();
    }
    throw error;
  }
}

async function readExistingArticles(
  root: string,
  index: ResearchIndex,
): Promise<ResearchArticle[]> {
  return Promise.all(
    index.items.map(async (item) =>
      researchArticleSchema.parse(
        JSON.parse(
          await readFile(
            path.join(root, "content", "research", item.path),
            "utf8",
          ),
        ),
      ),
    ),
  );
}

export function backfillFocusCategories(
  counts: Map<ResearchCategory, number>,
): ResearchCategory[] {
  return RESEARCH_CATEGORIES.filter(
    (category) => (counts.get(category) ?? 0) < BACKFILL_MIN_PER_CATEGORY,
  )
    .toSorted(
      (left, right) =>
        (counts.get(left) ?? 0) - (counts.get(right) ?? 0) ||
        left.localeCompare(right, "zh-Hant"),
    )
    .slice(0, 2);
}

function compareForCoverage(
  left: RankedCandidate,
  right: RankedCandidate,
  counts: Map<ResearchCategory, number>,
): number {
  const leftCount = counts.get(left.psychologyCategory) ?? 0;
  const rightCount = counts.get(right.psychologyCategory) ?? 0;
  const leftNeedsCoverage = leftCount < BACKFILL_MIN_PER_CATEGORY;
  const rightNeedsCoverage = rightCount < BACKFILL_MIN_PER_CATEGORY;
  return (
    Number(rightNeedsCoverage) - Number(leftNeedsCoverage) ||
    leftCount - rightCount ||
    right.score - left.score ||
    left.id.localeCompare(right.id)
  );
}

function candidateFingerprint(candidate: ResearchSource): string {
  return normalizeDoi(candidate.doi) ?? normalizeTitle(candidate.title);
}

function addRejectedCandidate(
  state: ResearchBackfillState,
  fingerprint: string,
  code: BackfillRejectionCode,
  attemptedAt: string,
): ResearchBackfillState {
  if (
    state.rejectedCandidates.some(
      (candidate) => candidate.fingerprint === fingerprint,
    )
  ) {
    return state;
  }
  return researchBackfillStateSchema.parse({
    ...state,
    rejectedCandidates: [
      ...state.rejectedCandidates,
      { fingerprint, code, attemptedAt },
    ],
  });
}

export function advanceBackfillState(
  state: ResearchBackfillState,
  total: number,
  added: number,
  now: Date,
): ResearchBackfillState {
  const timestamp = now.toISOString();
  if (total >= BACKFILL_TARGET) {
    return researchBackfillStateSchema.parse({
      ...state,
      status: "completed",
      noProgressRuns: 0,
      lastRunAt: timestamp,
      completedAt: timestamp,
    });
  }
  if (added > 0) {
    return researchBackfillStateSchema.parse({
      ...state,
      status: "running",
      noProgressRuns: 0,
      lastRunAt: timestamp,
      completedAt: null,
    });
  }
  const noProgressRuns = state.noProgressRuns + 1;
  if (
    state.activeWindowDays === BACKFILL_DAYS &&
    noProgressRuns >= BACKFILL_NO_PROGRESS_LIMIT
  ) {
    return researchBackfillStateSchema.parse({
      ...state,
      status: "running",
      activeWindowDays: BACKFILL_FALLBACK_DAYS,
      noProgressRuns: 0,
      lastRunAt: timestamp,
      completedAt: null,
    });
  }
  if (
    state.activeWindowDays === BACKFILL_FALLBACK_DAYS &&
    noProgressRuns >= BACKFILL_NO_PROGRESS_LIMIT
  ) {
    return researchBackfillStateSchema.parse({
      ...state,
      status: "stalled",
      noProgressRuns: BACKFILL_NO_PROGRESS_LIMIT,
      lastRunAt: timestamp,
      completedAt: null,
    });
  }
  return researchBackfillStateSchema.parse({
    ...state,
    status: "running",
    noProgressRuns,
    lastRunAt: timestamp,
    completedAt: null,
  });
}

async function writeGeneratedArticles(
  researchDirectory: string,
  generated: ResearchArticle[],
): Promise<void> {
  const itemsDirectory = path.join(researchDirectory, "items");
  await mkdir(itemsDirectory, { recursive: true });
  await Promise.all(
    generated.map((article) =>
      writeFile(
        path.join(itemsDirectory, `${safeFilename(article.id)}.json`),
        `${JSON.stringify(article, null, 2)}\n`,
      ),
    ),
  );
}

async function writeIndex(
  indexPath: string,
  index: ResearchIndex,
  generated: ResearchArticle[],
  now: Date,
): Promise<void> {
  const nextIndex: ResearchIndex = {
    ...index,
    lastUpdatedAt: now.toISOString(),
    updateStatus: "backfilled",
    items: [
      ...index.items,
      ...generated.map((article) => ({
        id: article.id,
        path: `items/${safeFilename(article.id)}.json`,
        titleZh: article.titleZh,
        publicationDate: article.publicationDate,
        publicationStatus: article.publicationStatus,
        studyType: article.studyType,
        psychologyCategory: article.psychologyCategory,
      })),
    ].toSorted(
      (left, right) =>
        right.publicationDate.localeCompare(left.publicationDate) ||
        left.id.localeCompare(right.id),
    ),
  };
  await writeFile(
    indexPath,
    `${JSON.stringify(researchIndexSchema.parse(nextIndex), null, 2)}\n`,
  );
}

async function writeBackfillState(
  statePath: string,
  state: ResearchBackfillState,
): Promise<void> {
  await writeFile(
    statePath,
    `${JSON.stringify(researchBackfillStateSchema.parse(state), null, 2)}\n`,
  );
}

function buildResult(
  articles: ResearchArticle[],
  state: ResearchBackfillState,
  added: number,
  failures: BackfillResult["failures"],
): BackfillResult {
  const counts = categoryCounts(articles);
  return {
    added,
    total: articles.length,
    remaining: Math.max(0, BACKFILL_TARGET - articles.length),
    status: state.status,
    activeWindowDays: state.activeWindowDays,
    noProgressRuns: state.noProgressRuns,
    failures,
    categoryCounts: Object.fromEntries(
      RESEARCH_CATEGORIES.map((category) => [
        category,
        counts.get(category) ?? 0,
      ]),
    ) as Record<ResearchCategory, number>,
    preprintCount: articles.filter(
      (article) => article.publicationStatus === "preprint",
    ).length,
    openAccessCount: articles.filter((article) => article.openAccessUrl).length,
  };
}

function categoryCounts(
  articles: ResearchArticle[],
): Map<ResearchCategory, number> {
  const counts = new Map<ResearchCategory, number>(
    RESEARCH_CATEGORIES.map((category) => [category, 0]),
  );
  for (const article of articles) {
    counts.set(
      article.psychologyCategory,
      (counts.get(article.psychologyCategory) ?? 0) + 1,
    );
  }
  return counts;
}
