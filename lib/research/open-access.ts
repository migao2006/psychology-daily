import { fetchJson } from "./http";
import { validHttpsUrl } from "./normalize";
import type { ResearchSource } from "./types";
export async function findOpenAccess(source: ResearchSource): Promise<ResearchSource> {
  const email = process.env.UNPAYWALL_EMAIL;
  if (!source.doi || !email) return source;
  const data = await fetchJson<{ best_oa_location?: { url_for_pdf?: string | null; url?: string | null } | null }>(`https://api.unpaywall.org/v2/${encodeURIComponent(source.doi)}?email=${encodeURIComponent(email)}`);
  const url = data.best_oa_location?.url_for_pdf ?? data.best_oa_location?.url ?? null;
  return { ...source, openAccessUrl: validHttpsUrl(url) ? url : source.openAccessUrl, sourceApis: [...new Set([...source.sourceApis, "Unpaywall"])] };
}
