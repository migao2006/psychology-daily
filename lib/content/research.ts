import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import researchIndexJson from "@/content/research/index.json";
import {
  dailyResearchSchema,
  researchIndexSchema,
  type DailyResearch,
} from "@/lib/schemas/research";

export const researchIndex = researchIndexSchema.parse(researchIndexJson);
const dailyDirectory = path.join(process.cwd(), "content", "research", "daily");
export const allResearch: DailyResearch[] = readdirSync(dailyDirectory)
  .filter((filename) => filename.endsWith(".json"))
  .map((filename) => dailyResearchSchema.parse(JSON.parse(readFileSync(path.join(dailyDirectory, filename), "utf8"))))
  .sort((left, right) => right.featuredDate.localeCompare(left.featuredDate));

export const featuredResearch = allResearch[0];

export function getResearchById(id: string): DailyResearch | undefined {
  return allResearch.find((research) => research.id === id);
}
