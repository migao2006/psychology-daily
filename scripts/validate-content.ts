import { lessons } from "@/lib/content/lessons";
import { allResearch, researchIndex } from "@/lib/content/research";
if (lessons.length !== 30) throw new Error(`Expected 30 lessons, received ${lessons.length}`);
if (allResearch.length < 1 || researchIndex.items.length < 1) throw new Error("At least one verified research item is required");
if (researchIndex.features.some((feature) => !researchIndex.items.some((item) => item.id === feature.researchId))) {
  throw new Error("Every featured research ID must exist in the research index");
}
console.log(`Validated ${lessons.length} lessons and ${allResearch.length} research item(s).`);
