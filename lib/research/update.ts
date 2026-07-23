import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { researchIndexSchema, type DailyResearch } from "@/lib/schemas/research";
import { taipeiDateKey } from "@/lib/dates/taipei";
import { deduplicatePapers } from "./deduplicate";
import { fetchPapers } from "./fetch";
import { findOpenAccess } from "./open-access";
import { rankPapers } from "./rank";
import { createSummarizer } from "./summarizer";
import { verifyMetadata } from "./verify";
export async function updateDailyResearch(root = process.cwd(), now = new Date()): Promise<{ status: "updated" | "no_suitable_paper"; research?: DailyResearch }> {
  const summarizer = createSummarizer();
  const indexPath = path.join(root, "content", "research", "index.json");
  const index = researchIndexSchema.parse(JSON.parse(await readFile(indexPath, "utf8")));
  const candidates = deduplicatePapers(await fetchPapers(now));
  if (!candidates.length) {
    const unchanged = index.updateStatus === "no_suitable_paper" && index.lastUpdatedAt.slice(0, 10) === now.toISOString().slice(0, 10);
    if (!unchanged) await writeFile(indexPath, `${JSON.stringify({ ...index, updateStatus: "no_suitable_paper", lastUpdatedAt: now.toISOString() }, null, 2)}\n`);
    return { status: "no_suitable_paper" };
  }
  const recentCategories = index.items.slice(0, 3).map((item) => item.psychologyCategory);
  const selected = rankPapers(candidates, now, recentCategories)[0];
  const verified = await findOpenAccess(await verifyMetadata(selected));
  const featuredDate = taipeiDateKey(now);
  const research = await summarizer.summarize(verified, featuredDate);
  const dailyDirectory = path.join(root, "content", "research", "daily");
  await mkdir(dailyDirectory, { recursive: true });
  const filename = `${featuredDate}.json`;
  await writeFile(path.join(dailyDirectory, filename), `${JSON.stringify(research, null, 2)}\n`);
  const item = { id: research.id, featuredDate, path: `daily/${filename}`, titleZh: research.titleZh, publicationStatus: research.publicationStatus, studyType: research.studyType, psychologyCategory: research.psychologyCategory };
  const nextIndex = researchIndexSchema.parse({ schemaVersion: 1, lastUpdatedAt: now.toISOString(), updateStatus: "updated", items: [item, ...index.items.filter((entry) => entry.id !== item.id && entry.featuredDate !== featuredDate)] });
  await writeFile(indexPath, `${JSON.stringify(nextIndex, null, 2)}\n`);
  return { status: "updated", research };
}

