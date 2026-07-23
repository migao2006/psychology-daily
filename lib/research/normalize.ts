import type { ResearchSource } from "./types";
import type { StudyType } from "@/lib/schemas/research";
export function normalizeDoi(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = decodeURIComponent(value.trim()).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").trim().toLowerCase();
  return /^10\.\d{4,9}\/\S+$/i.test(normalized) ? normalized : null;
}
export function validHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}
export function stripMarkup(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, "\"").replace(/\s+/g, " ").trim();
}
export function normalizeTitle(value: string): string { return stripMarkup(value).replace(/&/g, " and ").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
export function titleSimilarity(left: string, right: string): number {
  const a = new Set(normalizeTitle(left).split(" ").filter(Boolean)); const b = new Set(normalizeTitle(right).split(" ").filter(Boolean));
  const intersection = [...a].filter((token) => b.has(token)).length; const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}
export function isPrimarilyEnglish(title: string, language?: string): boolean {
  if (language?.toLowerCase() === "en") return true;
  const letters = [...title].filter((character) => /\p{L}/u.test(character));
  return letters.length > 0 && letters.filter((character) => /[A-Za-z]/.test(character)).length / letters.length >= 0.85;
}
export function inferStudyType(title: string, abstract: string): StudyType {
  const titleText = title.toLowerCase();
  const text = `${title} ${abstract}`.toLowerCase();
  if (/meta-analysis|meta analysis/.test(titleText)) return "meta_analysis";
  if (/systematic review/.test(titleText)) return "systematic_review";
  if (/(?:conducted|performed|undertook|random-effects|fixed-effects|pooled).{0,32}(?:meta-analysis|meta analysis)|meta-analytic/.test(text)) return "meta_analysis";
  if (/systematic review/.test(text)) return "systematic_review";
  if (/registered report/.test(text)) return "registered_report";
  if (/randomi[sz]ed|random allocation|controlled trial/.test(text)) return "randomized_trial";
  if (/longitudinal|prospective cohort|followed for/.test(text)) return "longitudinal";
  if (/experiment|experimental|random assignment/.test(text)) return "experimental";
  if (/interview|thematic analysis|qualitative/.test(text)) return "qualitative";
  if (/cross-sectional|cross sectional|survey/.test(text)) return "cross_sectional";
  return "other";
}
export function inferCategory(title: string, abstract: string): string {
  const text = `${title} ${abstract}`.toLowerCase();
  if (/neuro|brain|eeg|fmri/.test(text)) return "神經科學";
  if (/child|adolesc|development|infant/.test(text)) return "發展心理學";
  if (/personality|individual difference/.test(text)) return "人格與個別差異";
  if (/social|group|interpersonal|relationship/.test(text)) return "社會心理學";
  if (/depress|anxiety|mental health|stress|wellbeing|well-being/.test(text)) return "心理健康";
  return "認知心理學";
}
export function hasPsychologyRelevance(source: Pick<ResearchSource, "title" | "abstract" | "psychologyCategory">): boolean {
  return /psycholog|cognit|emotion|behavio|memory|attention|personality|mental health|social|development|stress|anxiety|depress|learning/i.test(`${source.title} ${source.abstract} ${source.psychologyCategory}`);
}
export function isWithinPublicationWindow(date: string, now: Date, days: number): boolean {
  const value = new Date(`${date}T00:00:00Z`).getTime();
  return Number.isFinite(value) && value <= now.getTime() && value >= now.getTime() - days * 86_400_000;
}
