import type { ResearchArticle } from "@/lib/schemas/research";

export type ResearchSearchFilters = {
  query: string;
  categories: string[];
  studyTypes: ResearchArticle["studyType"][];
  publicationStatuses: ResearchArticle["publicationStatus"][];
  openAccessOnly: boolean;
  dateFrom: string | null;
  dateTo: string | null;
};

export function normalizeResearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-Hant")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchesResearchSearch(
  research: ResearchArticle,
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
      research.doi ?? "",
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

export function matchesResearchFilters(
  research: ResearchArticle,
  filters: ResearchSearchFilters,
): boolean {
  const normalizedQuery = normalizeResearchText(filters.query);
  const normalizedDoi = research.doi?.toLowerCase().replace(/^https?:\/\/doi\.org\//, "");
  const requestedDoi = filters.query
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/doi\.org\//, "");
  const doiLike = requestedDoi.startsWith("10.") && requestedDoi.includes("/");
  return (
    (doiLike
      ? normalizedDoi === requestedDoi
      : !normalizedQuery || matchesResearchSearch(research, filters.query)) &&
    (filters.categories.length === 0 ||
      filters.categories.includes(research.psychologyCategory)) &&
    (filters.studyTypes.length === 0 ||
      filters.studyTypes.includes(research.studyType)) &&
    (filters.publicationStatuses.length === 0 ||
      filters.publicationStatuses.includes(research.publicationStatus)) &&
    (!filters.openAccessOnly || Boolean(research.openAccessUrl)) &&
    (!filters.dateFrom || research.publicationDate >= filters.dateFrom) &&
    (!filters.dateTo || research.publicationDate <= filters.dateTo)
  );
}

export function researchSearchSuggestions(
  research: ResearchArticle[],
  limit = 40,
): string[] {
  return [
    ...new Set(
      research.flatMap((item) => [
        item.psychologyCategory,
        item.titleZh,
        item.titleOriginal,
        ...item.authors,
        ...item.keyTerms.flatMap((term) => [term.original, term.translationZh]),
      ]),
    ),
  ]
    .filter(Boolean)
    .toSorted((left, right) => left.localeCompare(right, "zh-Hant"))
    .slice(0, limit);
}

export function searchResearch(
  research: ResearchArticle[],
  query: string,
): ResearchArticle[] {
  return research.filter((item) => matchesResearchSearch(item, query));
}
