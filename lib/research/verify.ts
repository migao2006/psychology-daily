import { fetchJson } from "./http";
import { normalizeDoi, stripMarkup, titleSimilarity } from "./normalize";
import type { ResearchSource } from "./types";
export async function verifyMetadata(source: ResearchSource): Promise<ResearchSource> {
  if (!source.doi) return source;
  const data = await fetchJson<{ message: { DOI?: string; title?: string[]; author?: Array<{ given?: string; family?: string }>; "container-title"?: string[] } }>(`https://api.crossref.org/works/${encodeURIComponent(source.doi)}`);
  const title = stripMarkup(data.message.title?.[0] ?? "");
  if (titleSimilarity(source.title, title) < .72) throw new Error(`Crossref 標題與候選資料不一致：${source.doi}`);
  if (normalizeDoi(data.message.DOI) !== normalizeDoi(source.doi)) throw new Error(`Crossref DOI 不一致：${source.doi}`);
  const authors = (data.message.author ?? []).map((author) => `${author.given ?? ""} ${author.family ?? ""}`.trim()).filter(Boolean);
  return { ...source, title, authors: authors.length ? authors : source.authors, journalOrRepository: data.message["container-title"]?.[0] ?? source.journalOrRepository, sourceApis: [...new Set([...source.sourceApis, "Crossref"])] };
}
