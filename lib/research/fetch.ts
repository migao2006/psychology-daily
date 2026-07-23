import { fetchJson } from "./http";
import { hasPsychologyRelevance, inferCategory, inferStudyType, isPrimarilyEnglish, normalizeDoi, stripMarkup, validHttpsUrl } from "./normalize";
import type { ResearchCategory } from "@/lib/schemas/research";
import type { ResearchSource } from "./types";
type OpenAlexWork = {
  id: string; doi?: string | null; display_name?: string; title?: string; publication_date: string;
  abstract_inverted_index?: Record<string, number[]> | null; authorships?: Array<{ author?: { display_name?: string } }>;
  primary_location?: { landing_page_url?: string; source?: { display_name?: string; type?: string } };
  open_access?: { oa_url?: string | null }; language?: string;
};
type OpenAlexResponse = { results: OpenAlexWork[] };
type CrossrefAuthor = { given?: string; family?: string };
type CrossrefItem = { DOI?: string; title?: string[]; author?: CrossrefAuthor[]; published?: { "date-parts"?: number[][] }; "container-title"?: string[]; URL?: string; abstract?: string };
type CrossrefResponse = { message: { items: CrossrefItem[] } };
type EuropePmcItem = {
  id?: string; pmid?: string; pmcid?: string; title?: string; abstractText?: string; doi?: string; authorString?: string;
  firstPublicationDate?: string; electronicPublicationDate?: string; journalInfo?: { printPublicationDate?: string };
  journalTitle?: string; source?: string; inEPMC?: string;
};
type EuropePmcResponse = { resultList?: { result?: EuropePmcItem[] } };
type SemanticScholarPaper = {
  paperId?: string;
  title?: string;
  authors?: Array<{ name?: string }>;
  publicationDate?: string;
  year?: number;
  abstract?: string;
  url?: string;
  externalIds?: { DOI?: string };
  venue?: string;
  publicationTypes?: string[];
  openAccessPdf?: { url?: string | null } | null;
};
type SemanticScholarResponse = { data?: SemanticScholarPaper[] };
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const fromDaysAgo = (now: Date, days: number) => dateKey(new Date(now.getTime() - days * 86_400_000));
export const BACKFILL_CATEGORY_QUERIES: Record<ResearchCategory, string> = {
  認知心理學: "cognitive psychology attention memory",
  社會心理學: "social psychology interpersonal group",
  發展心理學: "developmental psychology child adolescent",
  心理健康: "mental health stress anxiety depression",
  神經科學: "cognitive neuroscience brain EEG fMRI",
  人格與個別差異: "personality psychology individual differences",
};
function abstractFromInverted(index: Record<string, number[]> | null): string {
  if (!index) return "";
  return Object.entries(index).flatMap(([word, positions]) => positions.map((position) => [position, word] as const)).sort((a, b) => a[0] - b[0]).map((entry) => entry[1]).join(" ");
}
function isEligibleCandidate(item: ResearchSource): boolean {
  return Boolean(item.abstract) && validHttpsUrl(item.originalUrl) && hasPsychologyRelevance(item) && isPrimarilyEnglish(item.title, item.language);
}
export async function fetchPapers(now = new Date()): Promise<ResearchSource[]> {
  const sources = [fetchOpenAlex, fetchEuropePmc, fetchCrossref, fetchSemanticScholar] as const;
  for (const days of [14, 30]) {
    for (const fetchSource of sources) {
      try {
        const valid = (await fetchSource(now, days)).filter(isEligibleCandidate);
        if (valid.length) return valid;
      } catch {
        // A failed higher-priority API must not prevent a lower-priority fallback.
      }
    }
  }
  return [];
}

export async function fetchBackfillCandidates(
  now = new Date(),
  days = 180,
  focusCategories: ResearchCategory[] = [],
): Promise<ResearchSource[]> {
  const primarySources = [
    fetchOpenAlex,
    fetchEuropePmc,
    fetchCrossref,
  ] as const;
  const queries = [
    "psychology",
    ...focusCategories.map((category) => BACKFILL_CATEGORY_QUERIES[category]),
  ];
  const batches: ResearchSource[][] = [];
  for (const query of queries) {
    const primaryBatches = await Promise.all(
      primarySources.map((fetchSource) => fetchSource(now, days, query)),
    );
    const eligiblePrimary = primaryBatches.flatMap((items) =>
      items.filter(isEligibleCandidate),
    );
    if (eligiblePrimary.length > 0) {
      batches.push(eligiblePrimary);
      continue;
    }
    batches.push(
      (await fetchSemanticScholar(now, days, query)).filter(
        isEligibleCandidate,
      ),
    );
  }
  return batches.flat();
}
export async function fetchOpenAlex(now: Date, days: number, search = "psychology"): Promise<ResearchSource[]> {
  const key = process.env.OPENALEX_API_KEY;
  const query = new URLSearchParams({ filter: `from_publication_date:${fromDaysAgo(now, days)},to_publication_date:${dateKey(now)},has_abstract:true`, search, sort: "publication_date:desc", "per-page": "100", mailto: process.env.UNPAYWALL_EMAIL || "noreply@example.com" });
  if (key) query.set("api_key", key);
  const data = await fetchJson<OpenAlexResponse>(`https://api.openalex.org/works?${query}`);
  return data.results.map((item) => {
    const abstract = abstractFromInverted(item.abstract_inverted_index ?? null);
    const doi = normalizeDoi(item.doi);
    const title = stripMarkup(item.display_name ?? item.title ?? "");
    const journal = item.primary_location?.source?.display_name ?? "OpenAlex";
    return { id: item.id, title, authors: (item.authorships ?? []).map((entry) => entry.author?.display_name).filter((name): name is string => Boolean(name)), publicationDate: item.publication_date, abstract, originalUrl: validHttpsUrl(item.primary_location?.landing_page_url) ? item.primary_location.landing_page_url : doi ? `https://doi.org/${doi}` : item.id, doi, journalOrRepository: journal, language: item.language ?? "unknown", publicationStatus: item.primary_location?.source?.type === "repository" ? "preprint" : "unknown", studyType: inferStudyType(title, abstract), psychologyCategory: inferCategory(title, abstract), openAccessUrl: validHttpsUrl(item.open_access?.oa_url) ? item.open_access.oa_url : null, sourceApis: ["OpenAlex"], retrievedAt: now.toISOString() } satisfies ResearchSource;
  });
}
export async function fetchEuropePmc(now: Date, days: number, search = "psychology cognition emotion behavior"): Promise<ResearchSource[]> {
  const query = `FIRST_PDATE:[${fromDaysAgo(now, days)} TO ${dateKey(now)}] AND (${search}) AND HAS_ABSTRACT:Y`;
  const data = await fetchJson<EuropePmcResponse>(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=100`);
  return (data.resultList?.result ?? []).flatMap((item): ResearchSource[] => {
    const title = stripMarkup(item.title ?? ""); const abstract = stripMarkup(item.abstractText ?? ""); const doi = normalizeDoi(item.doi);
    const id = String(item.id ?? item.pmid ?? item.pmcid);
    const publicationDate = item.firstPublicationDate ?? item.electronicPublicationDate ?? item.journalInfo?.printPublicationDate;
    if (!publicationDate) return [];
    return [{ id: `europe-pmc:${id}`, title, authors: String(item.authorString ?? "").split(",").map((name) => name.trim()).filter(Boolean), publicationDate, abstract, originalUrl: doi ? `https://doi.org/${doi}` : `https://europepmc.org/article/${item.source ?? "MED"}/${id}`, doi, journalOrRepository: item.journalTitle ?? "Europe PMC", language: "en", publicationStatus: item.source === "PPR" ? "preprint" : "unknown", studyType: inferStudyType(title, abstract), psychologyCategory: inferCategory(title, abstract), openAccessUrl: item.inEPMC === "Y" && item.pmcid ? `https://europepmc.org/articles/${item.pmcid}` : null, sourceApis: ["Europe PMC"], retrievedAt: now.toISOString() }];
  });
}
export async function fetchCrossref(now: Date, days: number, search = "psychology"): Promise<ResearchSource[]> {
  const params = new URLSearchParams({ filter: `from-pub-date:${fromDaysAgo(now, days)},until-pub-date:${dateKey(now)},type:journal-article`, "query.bibliographic": search, select: "DOI,title,author,published,container-title,URL,abstract,type", rows: "100", mailto: process.env.UNPAYWALL_EMAIL || "noreply@example.com" });
  const data = await fetchJson<CrossrefResponse>(`https://api.crossref.org/works?${params}`);
  return data.message.items.map((item) => {
    const title = stripMarkup(item.title?.[0] ?? ""); const abstract = stripMarkup(item.abstract ?? ""); const doi = normalizeDoi(item.DOI);
    const parts = item.published?.["date-parts"]?.[0] ?? [];
    const publicationDate = `${parts[0]}-${String(parts[1] ?? 1).padStart(2, "0")}-${String(parts[2] ?? 1).padStart(2, "0")}`;
    return { id: `crossref:${doi ?? item.URL ?? title}`, title, authors: (item.author ?? []).map((author) => `${author.given ?? ""} ${author.family ?? ""}`.trim()).filter(Boolean), publicationDate, abstract, originalUrl: validHttpsUrl(item.URL) ? item.URL : doi ? `https://doi.org/${doi}` : "", doi, journalOrRepository: item["container-title"]?.[0] ?? "Crossref", language: "en", publicationStatus: "unknown", studyType: inferStudyType(title, abstract), psychologyCategory: inferCategory(title, abstract), openAccessUrl: null, sourceApis: ["Crossref"], retrievedAt: now.toISOString() } satisfies ResearchSource;
  });
}
export async function fetchSemanticScholar(now: Date, days: number, search = "psychology"): Promise<ResearchSource[]> {
  const params = new URLSearchParams({
    query: search,
    publicationDateOrYear: `${fromDaysAgo(now, days)}:${dateKey(now)}`,
    fields: "paperId,title,authors,publicationDate,year,abstract,url,externalIds,venue,publicationTypes,openAccessPdf",
    limit: "100",
  });
  const data = await fetchJson<SemanticScholarResponse>(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`);
  return (data.data ?? []).flatMap((item): ResearchSource[] => {
    if (!item.paperId) return [];
    const title = stripMarkup(item.title ?? "");
    const abstract = stripMarkup(item.abstract ?? "");
    const doi = normalizeDoi(item.externalIds?.DOI);
    const publicationDate = item.publicationDate ?? (item.year ? `${item.year}-01-01` : null);
    if (!publicationDate) return [];
    const semanticScholarUrl = `https://www.semanticscholar.org/paper/${item.paperId}`;
    const originalUrl = doi ? `https://doi.org/${doi}` : validHttpsUrl(item.url) ? item.url : semanticScholarUrl;
    const publicationMarkers = `${item.publicationTypes?.join(" ") ?? ""} ${item.venue ?? ""} ${item.url ?? ""}`.toLowerCase();
    const publicationStatus = /\bpreprint\b|psyarxiv|arxiv|biorxiv|medrxiv|repository/.test(publicationMarkers) ? "preprint" : "unknown";
    return [{
      id: `semantic-scholar:${item.paperId}`,
      title,
      authors: (item.authors ?? []).map((author) => author.name?.trim()).filter((name): name is string => Boolean(name)),
      publicationDate,
      abstract,
      originalUrl,
      doi,
      journalOrRepository: item.venue?.trim() || "Semantic Scholar",
      language: "unknown",
      publicationStatus,
      studyType: inferStudyType(title, abstract),
      psychologyCategory: inferCategory(title, abstract),
      openAccessUrl: validHttpsUrl(item.openAccessPdf?.url) ? item.openAccessPdf.url : null,
      sourceApis: ["Semantic Scholar"],
      retrievedAt: now.toISOString(),
    }];
  });
}
