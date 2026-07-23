import { isPrimarilyEnglish } from "./normalize";
import type { RankedCandidate, ResearchSource } from "./types";
const designWeights: Record<ResearchSource["studyType"], number> = { meta_analysis: 1, systematic_review: .96, registered_report: .9, randomized_trial: .88, longitudinal: .78, experimental: .7, cross_sectional: .52, qualitative: .48, other: .3 };
export function scoreCandidate(candidate: ResearchSource, now: Date, recentCategories: string[] = []): RankedCandidate {
  const ageDays = Math.max(0, (now.getTime() - new Date(`${candidate.publicationDate}T00:00:00Z`).getTime()) / 86_400_000);
  const relevance = 25;
  const recency = 20 * Math.max(0, 1 - ageDays / 30);
  const completeness = 15 * ([candidate.title, candidate.authors.length ? "authors" : "", candidate.abstract, candidate.originalUrl, candidate.doi ?? candidate.id].filter(Boolean).length / 5);
  const design = 15 * designWeights[candidate.studyType];
  const peerReview = candidate.publicationStatus === "peer_reviewed" ? 10 : 0;
  const openAccess = candidate.openAccessUrl ? 10 : 0;
  const diversity = recentCategories.slice(0, 3).includes(candidate.psychologyCategory) ? 0 : 5;
  const englishTieBreaker = isPrimarilyEnglish(candidate.title, candidate.language) ? .001 : 0;
  const scoreBreakdown = { relevance, recency, completeness, design, peerReview, openAccess, diversity };
  return { ...candidate, score: Object.values(scoreBreakdown).reduce((sum, value) => sum + value, englishTieBreaker), scoreBreakdown };
}
export function rankPapers(candidates: ResearchSource[], now: Date, recentCategories: string[] = []): RankedCandidate[] {
  return candidates.map((candidate) => scoreCandidate(candidate, now, recentCategories)).sort((left, right) => (Number(isPrimarilyEnglish(right.title, right.language)) - Number(isPrimarilyEnglish(left.title, left.language))) || right.score - left.score || left.id.localeCompare(right.id));
}

