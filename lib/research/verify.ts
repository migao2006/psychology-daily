import { fetchJson, ResearchHttpError } from "./http";
import { CandidateRejectionError } from "./errors";
import { normalizeDoi, stripMarkup, titleSimilarity } from "./normalize";
import type { ResearchSource } from "./types";
export async function verifyMetadata(source: ResearchSource): Promise<ResearchSource> {
  if (!source.doi) return source;
  let data: {
    message: {
      DOI?: string;
      title?: string[];
      author?: Array<{ given?: string; family?: string }>;
      "container-title"?: string[];
    };
  };
  try {
    data = await fetchJson(
      `https://api.crossref.org/works/${encodeURIComponent(source.doi)}`,
    );
  } catch (error) {
    if (error instanceof ResearchHttpError && error.status === 404) {
      throw new CandidateRejectionError(
        "metadata_mismatch",
        "Crossref 找不到候選 DOI",
      );
    }
    throw error;
  }
  const title = stripMarkup(data.message.title?.[0] ?? "");
  if (titleSimilarity(source.title, title) < .72) {
    throw new CandidateRejectionError(
      "metadata_mismatch",
      "Crossref 標題與候選資料不一致",
    );
  }
  if (normalizeDoi(data.message.DOI) !== normalizeDoi(source.doi)) {
    throw new CandidateRejectionError(
      "metadata_mismatch",
      "Crossref DOI 與候選資料不一致",
    );
  }
  const authors = (data.message.author ?? []).map((author) => `${author.given ?? ""} ${author.family ?? ""}`.trim()).filter(Boolean);
  return { ...source, title, authors: authors.length ? authors : source.authors, journalOrRepository: data.message["container-title"]?.[0] ?? source.journalOrRepository, sourceApis: [...new Set([...source.sourceApis, "Crossref"])] };
}
