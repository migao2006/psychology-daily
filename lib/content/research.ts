import { readFileSync } from "node:fs";
import path from "node:path";
import researchIndexJson from "@/content/research/index.json";
import {
  researchArticleSchema,
  researchIndexSchema,
  type ResearchArticle,
} from "@/lib/schemas/research";

export const researchIndex = researchIndexSchema.parse(researchIndexJson);

export const allResearch: ResearchArticle[] = researchIndex.items
  .map((item) =>
    researchArticleSchema.parse(
      JSON.parse(
        readFileSync(
          path.join(process.cwd(), "content", "research", item.path),
          "utf8",
        ),
      ),
    ),
  )
  .sort(
    (left, right) =>
      right.publicationDate.localeCompare(left.publicationDate) ||
      left.id.localeCompare(right.id),
  );

const latestFeature = researchIndex.features.toSorted((left, right) =>
  right.date.localeCompare(left.date),
)[0];

export const featuredResearch =
  allResearch.find((item) => item.id === latestFeature?.researchId) ??
  allResearch[0];

export function getResearchById(id: string): ResearchArticle | undefined {
  return allResearch.find((research) => research.id === id);
}
