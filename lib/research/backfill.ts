import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  researchArticleSchema,
  researchIndexSchema,
  type ResearchArticle,
  type ResearchIndex,
} from "@/lib/schemas/research";
import { deduplicatePapers } from "./deduplicate";
import { fetchBackfillCandidates } from "./fetch";
import { normalizeDoi, normalizeTitle } from "./normalize";
import { findOpenAccess } from "./open-access";
import { rankPapers } from "./rank";
import { createSummarizer } from "./summarizer";
import type { ResearchSource } from "./types";
import { safeFilename } from "./update";
import { verifyMetadata } from "./verify";

export const BACKFILL_TARGET = 100;
export const BACKFILL_DAYS = 180;
export const BACKFILL_MIN_PER_CATEGORY = 12;
export const BACKFILL_PREPRINT_LIMIT = 20;

export async function backfillResearch(
  root = process.cwd(),
  now = new Date(),
  requestedBatchSize = 10,
): Promise<{
  added: number;
  total: number;
  failures: Array<{ id: string; reason: string }>;
}> {
  const batchSize = Math.max(1, Math.min(10, Math.floor(requestedBatchSize)));
  const indexPath = path.join(root, "content", "research", "index.json");
  const index = researchIndexSchema.parse(
    JSON.parse(await readFile(indexPath, "utf8")),
  );
  if (index.items.length >= BACKFILL_TARGET) {
    return { added: 0, total: index.items.length, failures: [] };
  }

  const existingArticles = await Promise.all(
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
  const existingDois = new Set(
    existingArticles
      .map((item) => normalizeDoi(item.doi))
      .filter((doi): doi is string => Boolean(doi)),
  );
  const existingTitles = new Set(
    existingArticles.map((item) => normalizeTitle(item.titleOriginal)),
  );
  const counts = categoryCounts(existingArticles);
  let preprintCount = existingArticles.filter(
    (item) => item.publicationStatus === "preprint",
  ).length;

  const candidates = deduplicatePapers(
    await fetchBackfillCandidates(now, BACKFILL_DAYS),
  ).filter(
    (item) =>
      (!item.doi || !existingDois.has(normalizeDoi(item.doi) ?? "")) &&
      !existingTitles.has(normalizeTitle(item.title)),
  );
  const ranked = rankPapers(candidates, now).toSorted((left, right) => {
    const leftNeedsCoverage =
      (counts.get(left.psychologyCategory) ?? 0) < BACKFILL_MIN_PER_CATEGORY;
    const rightNeedsCoverage =
      (counts.get(right.psychologyCategory) ?? 0) < BACKFILL_MIN_PER_CATEGORY;
    return (
      Number(rightNeedsCoverage) - Number(leftNeedsCoverage) ||
      (counts.get(left.psychologyCategory) ?? 0) -
        (counts.get(right.psychologyCategory) ?? 0) ||
      right.score - left.score ||
      left.id.localeCompare(right.id)
    );
  });

  const selected: ResearchSource[] = [];
  for (const candidate of ranked) {
    if (selected.length >= batchSize) break;
    if (index.items.length + selected.length >= BACKFILL_TARGET) break;
    if (
      candidate.publicationStatus === "preprint" &&
      preprintCount >= BACKFILL_PREPRINT_LIMIT
    ) {
      continue;
    }
    selected.push(candidate);
    counts.set(
      candidate.psychologyCategory,
      (counts.get(candidate.psychologyCategory) ?? 0) + 1,
    );
    if (candidate.publicationStatus === "preprint") preprintCount += 1;
  }

  const summarizer = createSummarizer();
  const generated: ResearchArticle[] = [];
  const failures: Array<{ id: string; reason: string }> = [];
  for (const candidate of selected) {
    try {
      const verified = await findOpenAccess(await verifyMetadata(candidate));
      generated.push(
        researchArticleSchema.parse(await summarizer.summarize(verified)),
      );
    } catch (error) {
      failures.push({
        id: candidate.id,
        reason: error instanceof Error ? error.message : "未知錯誤",
      });
    }
  }

  if (!generated.length) {
    return { added: 0, total: index.items.length, failures };
  }

  const itemsDirectory = path.join(root, "content", "research", "items");
  await mkdir(itemsDirectory, { recursive: true });
  for (const article of generated) {
    await writeFile(
      path.join(itemsDirectory, `${safeFilename(article.id)}.json`),
      `${JSON.stringify(article, null, 2)}\n`,
    );
  }
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
  return {
    added: generated.length,
    total: nextIndex.items.length,
    failures,
  };
}

function categoryCounts(articles: ResearchArticle[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const article of articles) {
    counts.set(
      article.psychologyCategory,
      (counts.get(article.psychologyCategory) ?? 0) + 1,
    );
  }
  return counts;
}
