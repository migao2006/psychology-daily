import type { ReadResearch } from "@/lib/schemas/progress";
import type { DailyResearch } from "@/lib/schemas/research";
import type { ResearchPreferences } from "./preferences";
import { normalizeResearchText } from "./search";

export type RankedResearch = {
  research: DailyResearch;
  score: number;
  reasons: string[];
  isRead: boolean;
};

type RankOptions = {
  now?: Date;
};

export function rankResearchForUser(
  research: DailyResearch[],
  preferences: ResearchPreferences,
  readHistory: ReadResearch[],
  options: RankOptions = {},
): RankedResearch[] {
  const now = options.now ?? new Date();
  const researchById = new Map(research.map((item) => [item.id, item]));
  const knownHistory = readHistory
    .map((entry) => ({ ...entry, research: researchById.get(entry.researchId) }))
    .filter(
      (
        entry,
      ): entry is ReadResearch & {
        research: DailyResearch;
      } => Boolean(entry.research),
    );
  const readIds = new Set(knownHistory.map((entry) => entry.researchId));
  const recentCategories = knownHistory
    .toSorted(
      (left, right) =>
        new Date(right.readAt).getTime() - new Date(left.readAt).getTime(),
    )
    .slice(0, 3)
    .map((entry) => entry.research.psychologyCategory);

  return research
    .map((item) => {
      const categoryMatch = preferences.categories.includes(
        item.psychologyCategory as (typeof preferences.categories)[number],
      );
      const typeMatch = preferences.studyTypes.includes(item.studyType);
      const preferenceScore =
        0.6 *
          (preferences.categories.length === 0 ? 0.5 : categoryMatch ? 1 : 0) +
        0.2 *
          (preferences.studyTypes.length === 0 ? 0.5 : typeMatch ? 1 : 0) +
        0.1 *
          (preferences.preferPeerReviewed
            ? item.publicationStatus === "peer_reviewed"
              ? 1
              : 0.2
            : 0.5) +
        0.1 *
          (preferences.preferOpenAccess
            ? item.openAccessUrl
              ? 1
              : 0
            : 0.5);

      const historyScore =
        preferences.learnFromReading && knownHistory.length > 0
          ? calculateHistorySimilarity(item, knownHistory, now)
          : 0.5;
      const ageDays = Math.max(
        0,
        (now.getTime() -
          new Date(`${item.featuredDate}T00:00:00+08:00`).getTime()) /
          86_400_000,
      );
      const freshnessScore = 2 ** (-ageDays / 90);
      const explorationScore =
        recentCategories.length === 0
          ? 0.5
          : recentCategories.includes(item.psychologyCategory)
            ? 0.25
            : 1;
      const isRead = readIds.has(item.id);
      const score =
        100 *
          (0.55 * preferenceScore +
            0.3 * historyScore +
            0.1 * freshnessScore +
            0.05 * explorationScore) -
        (isRead ? 20 : 0);

      return {
        research: item,
        score: Math.round(score * 100) / 100,
        reasons: buildReasons({
          item,
          preferences,
          categoryMatch,
          typeMatch,
          knownHistory,
          recentCategories,
        }),
        isRead,
      };
    })
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        right.research.featuredDate.localeCompare(left.research.featuredDate) ||
        left.research.id.localeCompare(right.research.id),
    );
}

function calculateHistorySimilarity(
  candidate: DailyResearch,
  history: Array<ReadResearch & { research: DailyResearch }>,
  now: Date,
): number {
  let weightedSimilarity = 0;
  let totalWeight = 0;

  for (const entry of history) {
    const ageDays = Math.max(
      0,
      (now.getTime() - new Date(entry.readAt).getTime()) / 86_400_000,
    );
    const weight = 2 ** (-ageDays / 30);
    const similarity =
      0.65 *
        Number(
          candidate.psychologyCategory ===
            entry.research.psychologyCategory,
        ) +
      0.2 * Number(candidate.studyType === entry.research.studyType) +
      0.15 * keywordSimilarity(candidate, entry.research);
    weightedSimilarity += weight * similarity;
    totalWeight += weight;
  }

  return totalWeight === 0 ? 0.5 : weightedSimilarity / totalWeight;
}

function keywordSimilarity(
  left: DailyResearch,
  right: DailyResearch,
): number {
  const leftTerms = keywordSet(left);
  const rightTerms = keywordSet(right);
  const union = new Set([...leftTerms, ...rightTerms]);
  if (union.size === 0) return 0;
  const intersection = [...leftTerms].filter((term) => rightTerms.has(term));
  return intersection.length / union.size;
}

function keywordSet(research: DailyResearch): Set<string> {
  return new Set(
    research.keyTerms.flatMap((term) =>
      [term.original, term.translationZh]
        .map(normalizeResearchText)
        .filter(Boolean),
    ),
  );
}

function buildReasons(input: {
  item: DailyResearch;
  preferences: ResearchPreferences;
  categoryMatch: boolean;
  typeMatch: boolean;
  knownHistory: Array<ReadResearch & { research: DailyResearch }>;
  recentCategories: string[];
}): string[] {
  const reasons: string[] = [];
  if (input.categoryMatch) {
    reasons.push(`符合你偏好的${input.item.psychologyCategory}`);
  }
  if (input.typeMatch) {
    reasons.push(`符合你偏好的研究類型`);
  }
  if (
    input.preferences.learnFromReading &&
    input.knownHistory.some(
      (entry) =>
        entry.research.psychologyCategory ===
        input.item.psychologyCategory,
    )
  ) {
    reasons.push(`你最近讀過相近主題`);
  }
  if (
    input.preferences.preferPeerReviewed &&
    input.item.publicationStatus === "peer_reviewed"
  ) {
    reasons.push("符合已同儕審查偏好");
  }
  if (input.preferences.preferOpenAccess && input.item.openAccessUrl) {
    reasons.push("提供合法免費全文");
  }
  if (
    input.recentCategories.length > 0 &&
    !input.recentCategories.includes(input.item.psychologyCategory)
  ) {
    reasons.push("探索不同於最近閱讀的主題");
  }
  if (reasons.length === 0) reasons.push("依最新研究排序");
  return reasons.slice(0, 2);
}
