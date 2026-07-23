import { describe, expect, it } from "vitest";
import { dailyResearchSchema } from "@/lib/schemas/research";
import { deduplicatePapers } from "@/lib/research/deduplicate";
import { inferStudyType, isPrimarilyEnglish, isWithinPublicationWindow, normalizeDoi, validHttpsUrl } from "@/lib/research/normalize";
import { rankPapers } from "@/lib/research/rank";
import { ensureGrounded } from "@/lib/research/summarizer";
import type { ResearchSource } from "@/lib/research/types";
import { buildResearchSummaryPrompt } from "@/prompts/research-summary";
import seedResearch from "@/content/research/daily/2026-07-23.json";
const source = (overrides: Partial<ResearchSource> = {}): ResearchSource => ({ id: "w1", title: "Memory and attention in daily learning", authors: ["A. Author"], publicationDate: "2026-07-20", abstract: "We surveyed 120 adolescents about memory and attention.", originalUrl: "https://doi.org/10.1000/test", doi: "10.1000/test", journalOrRepository: "Test Journal", language: "en", publicationStatus: "peer_reviewed", studyType: "cross_sectional", psychologyCategory: "認知心理學", openAccessUrl: null, sourceApis: ["OpenAlex"], retrievedAt: "2026-07-23T00:00:00Z", ...overrides });
describe("research selection rules", () => {
  it("filters publication dates at 14 and 30 days", () => {
    const now = new Date("2026-07-23T12:00:00Z");
    expect(isWithinPublicationWindow("2026-07-10", now, 14)).toBe(true);
    expect(isWithinPublicationWindow("2026-06-30", now, 14)).toBe(false);
    expect(isWithinPublicationWindow("2026-06-30", now, 30)).toBe(true);
  });
  it("prioritizes English and normalizes DOI", () => {
    expect(isPrimarilyEnglish("Memory and attention", "en")).toBe(true);
    expect(isPrimarilyEnglish("記憶與注意力", "zh")).toBe(false);
    expect(normalizeDoi("https://doi.org/10.1177/ABC.1")).toBe("10.1177/abc.1");
  });
  it("does not misclassify a systematic review when meta-analysis was precluded", () => {
    expect(inferStudyType("A PRISMA Systematic Review of Hyperscanning in Autism", "Heterogeneity precluded meta-analysis.")).toBe("systematic_review");
  });
  it("deduplicates by DOI and normalized title", () => {
    expect(deduplicatePapers([source(), source({ id: "w2", doi: "https://doi.org/10.1000/TEST" })])).toHaveLength(1);
    expect(deduplicatePapers([source({ doi: null }), source({ id: "w2", doi: null, title: "Memory & attention in daily learning!" })])).toHaveLength(1);
  });
  it("uses deterministic weighted ranking without citation counts", () => {
    const ranked = rankPapers([source({ id: "pre", publicationStatus: "preprint", studyType: "other" }), source({ id: "meta", publicationStatus: "peer_reviewed", studyType: "meta_analysis", openAccessUrl: "https://example.org/full" })], new Date("2026-07-23T12:00:00Z"));
    expect(ranked[0].id).toBe("meta");
    expect(ranked[0].scoreBreakdown).toEqual(expect.objectContaining({ relevance: 25, peerReview: 10, openAccess: 10 }));
  });
  it("validates HTTPS and preprint research JSON", () => {
    expect(validHttpsUrl("https://example.org")).toBe(true);
    expect(validHttpsUrl("javascript:alert(1)")).toBe(false);
    const seed = dailyResearchSchema.parse({ ...seedResearch, publicationStatus: "preprint" });
    expect(seed.publicationStatus).toBe("preprint");
  });
  it("rejects an AI-fabricated sample size", () => {
    const summary = { titleZh: "測試", researchQuestionZh: "問題", backgroundZh: "背景", methodsZh: "方法", sample: { size: 999, populationZh: null, locationZh: null }, mainFindingsZh: ["發現一", "發現二"], limitationsZh: [], practicalMeaningZh: "意義", cautionZh: "提醒", keyTerms: [] };
    expect(() => ensureGrounded(summary, source())).toThrow(/樣本數未出現在來源摘要/);
  });
  it("builds the summary prompt only from the verified source contract", () => {
    const researchSource = source();
    const prompt = buildResearchSummaryPrompt(researchSource);
    expect(prompt).toContain(researchSource.title);
    expect(prompt).toContain(researchSource.abstract);
    expect(prompt).toContain("不得自行搜尋或補充");
    expect(prompt).toContain("不得把相關改寫成因果");
    expect(prompt).not.toContain(researchSource.originalUrl);
  });
});
