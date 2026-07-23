import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  researchIndexSchema,
  type ResearchArticle,
  type ResearchIndex,
} from "@/lib/schemas/research";
import { taipeiDateKey } from "@/lib/dates/taipei";
import { deduplicatePapers } from "./deduplicate";
import { fetchPapers } from "./fetch";
import { findOpenAccess } from "./open-access";
import { rankPapers } from "./rank";
import { createSummarizer } from "./summarizer";
import { verifyMetadata } from "./verify";

export async function updateDailyResearch(
  root = process.cwd(),
  now = new Date(),
): Promise<{
  status: "updated" | "no_suitable_paper";
  research?: ResearchArticle;
}> {
  const summarizer = createSummarizer();
  const indexPath = path.join(root, "content", "research", "index.json");
  const index = researchIndexSchema.parse(
    JSON.parse(await readFile(indexPath, "utf8")),
  );
  const candidates = deduplicatePapers(await fetchPapers(now));
  if (!candidates.length) {
    const unchanged =
      index.updateStatus === "no_suitable_paper" &&
      index.lastUpdatedAt.slice(0, 10) === now.toISOString().slice(0, 10);
    if (!unchanged) {
      await writeIndex(indexPath, {
        ...index,
        updateStatus: "no_suitable_paper",
        lastUpdatedAt: now.toISOString(),
      });
    }
    return { status: "no_suitable_paper" };
  }

  const recentCategories = index.features
    .toSorted((left, right) => right.date.localeCompare(left.date))
    .slice(0, 3)
    .map(
      (feature) =>
        index.items.find((item) => item.id === feature.researchId)
          ?.psychologyCategory,
    )
    .filter((category): category is string => Boolean(category));
  const selected = rankPapers(candidates, now, recentCategories)[0];
  const verified = await findOpenAccess(await verifyMetadata(selected));
  const research = await summarizer.summarize(verified);
  const itemsDirectory = path.join(root, "content", "research", "items");
  await mkdir(itemsDirectory, { recursive: true });
  const filename = `${safeFilename(research.id)}.json`;
  await writeFile(
    path.join(itemsDirectory, filename),
    `${JSON.stringify(research, null, 2)}\n`,
  );

  const featuredDate = taipeiDateKey(now);
  const item = {
    id: research.id,
    path: `items/${filename}`,
    titleZh: research.titleZh,
    publicationDate: research.publicationDate,
    publicationStatus: research.publicationStatus,
    studyType: research.studyType,
    psychologyCategory: research.psychologyCategory,
  };
  await writeIndex(indexPath, {
    schemaVersion: 2,
    lastUpdatedAt: now.toISOString(),
    updateStatus: "updated",
    features: [
      { date: featuredDate, researchId: research.id },
      ...index.features.filter((entry) => entry.date !== featuredDate),
    ],
    items: [item, ...index.items.filter((entry) => entry.id !== item.id)],
  });
  return { status: "updated", research };
}

async function writeIndex(
  indexPath: string,
  input: ResearchIndex,
): Promise<void> {
  const parsed = researchIndexSchema.parse(input);
  await writeFile(indexPath, `${JSON.stringify(parsed, null, 2)}\n`);
}

export function safeFilename(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}
