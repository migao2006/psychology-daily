import type { DailyResearch } from "@/lib/schemas/research";

export function normalizeResearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-Hant")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchesResearchSearch(
  research: DailyResearch,
  query: string,
): boolean {
  const normalizedQuery = normalizeResearchText(query);
  if (!normalizedQuery) return true;

  const searchable = normalizeResearchText(
    [
      research.titleZh,
      research.titleOriginal,
      ...research.authors,
      research.journalOrRepository,
      research.psychologyCategory,
      research.researchQuestionZh,
      research.backgroundZh,
      research.methodsZh,
      ...research.mainFindingsZh,
      ...research.keyTerms.flatMap((term) => [
        term.original,
        term.translationZh,
        term.explanationZh,
      ]),
    ].join(" "),
  );

  return normalizedQuery
    .split(" ")
    .every((term) => searchable.includes(term));
}

export function searchResearch(
  research: DailyResearch[],
  query: string,
): DailyResearch[] {
  return research.filter((item) => matchesResearchSearch(item, query));
}
