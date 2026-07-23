import { fetchJson, ResearchHttpError } from "./http";
import { validHttpsUrl } from "./normalize";
import type { ResearchSource } from "./types";
export async function findOpenAccess(source: ResearchSource): Promise<ResearchSource> {
  const email = process.env.UNPAYWALL_EMAIL;
  if (!source.doi || !email) return source;
  let data: {
    best_oa_location?: {
      url_for_pdf?: string | null;
      url?: string | null;
    } | null;
  };
  try {
    data = await fetchJson(
      `https://api.unpaywall.org/v2/${encodeURIComponent(source.doi)}?email=${encodeURIComponent(email)}`,
    );
  } catch (error) {
    if (error instanceof ResearchHttpError && error.status === 404) {
      return source;
    }
    throw error;
  }
  const url = data.best_oa_location?.url_for_pdf ?? data.best_oa_location?.url ?? null;
  return { ...source, openAccessUrl: validHttpsUrl(url) ? url : source.openAccessUrl, sourceApis: [...new Set([...source.sourceApis, "Unpaywall"])] };
}
