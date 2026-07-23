import { lessons } from "@/lib/content/lessons";
import { allResearch, researchIndex } from "@/lib/content/research";
if (lessons.length !== 30) throw new Error(`Expected 30 lessons, received ${lessons.length}`);
if (allResearch.length < 1 || researchIndex.items.length < 1) throw new Error("At least one verified research item is required");
console.log(`Validated ${lessons.length} lessons and ${allResearch.length} research item(s).`);
