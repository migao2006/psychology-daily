import { normalizeDoi, normalizeTitle, titleSimilarity } from "./normalize";
import type { ResearchSource } from "./types";
export function deduplicatePapers(candidates: ResearchSource[]): ResearchSource[] {
  const unique: ResearchSource[] = [];
  for (const candidate of candidates) {
    const doi = normalizeDoi(candidate.doi);
    const duplicate = unique.find((item) => (doi && normalizeDoi(item.doi) === doi) || normalizeTitle(item.title) === normalizeTitle(candidate.title) || titleSimilarity(item.title, candidate.title) >= 0.94);
    if (!duplicate) unique.push(candidate);
    else duplicate.sourceApis = [...new Set([...duplicate.sourceApis, ...candidate.sourceApis])];
  }
  return unique;
}

