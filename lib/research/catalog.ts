import type {
  ResearchArticle,
  ResearchCatalogItem,
} from "@/lib/schemas/research";
import { normalizeResearchText } from "./search";

export function toResearchCatalogItem(
  research: ResearchArticle,
): ResearchCatalogItem {
  return {
    id: research.id,
    titleZh: research.titleZh,
    titleOriginal: research.titleOriginal,
    authors: research.authors,
    journalOrRepository: research.journalOrRepository,
    publicationDate: research.publicationDate,
    publicationStatus: research.publicationStatus,
    studyType: research.studyType,
    psychologyCategory: research.psychologyCategory,
    mainFindingsZh: research.mainFindingsZh.slice(0, 2),
    keyTerms: research.keyTerms,
    doi: research.doi,
    openAccessUrl: research.openAccessUrl,
    searchText: normalizeResearchText(
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
    ),
  };
}
