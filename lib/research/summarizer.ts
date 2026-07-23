import { z } from "zod";
import { dailyResearchSchema, type DailyResearch } from "@/lib/schemas/research";
import { fetchJson } from "./http";
import { validHttpsUrl } from "./normalize";
import type { ResearchSource, ResearchSummarizer } from "./types";

const summarySchema = z.strictObject({
  titleZh: z.string().min(1),
  researchQuestionZh: z.string().min(1),
  backgroundZh: z.string().min(1),
  methodsZh: z.string().min(1),
  sample: z.strictObject({ size: z.number().int().positive().nullable(), populationZh: z.string().min(1).nullable(), locationZh: z.string().min(1).nullable() }),
  mainFindingsZh: z.array(z.string().min(1)).min(2).max(5),
  limitationsZh: z.array(z.string().min(1)),
  practicalMeaningZh: z.string().min(1),
  cautionZh: z.string().min(1),
  keyTerms: z.array(z.strictObject({ original: z.string().min(1), translationZh: z.string().min(1), explanationZh: z.string().min(1) })).max(8),
});
type SummaryFields = z.infer<typeof summarySchema>;
const outputJsonSchema = {
  type: "object", additionalProperties: false,
  required: ["titleZh", "researchQuestionZh", "backgroundZh", "methodsZh", "sample", "mainFindingsZh", "limitationsZh", "practicalMeaningZh", "cautionZh", "keyTerms"],
  properties: {
    titleZh: { type: "string" }, researchQuestionZh: { type: "string" }, backgroundZh: { type: "string" }, methodsZh: { type: "string" },
    sample: { type: "object", additionalProperties: false, required: ["size", "populationZh", "locationZh"], properties: { size: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] }, populationZh: { anyOf: [{ type: "string" }, { type: "null" }] }, locationZh: { anyOf: [{ type: "string" }, { type: "null" }] } } },
    mainFindingsZh: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } }, limitationsZh: { type: "array", items: { type: "string" } },
    practicalMeaningZh: { type: "string" }, cautionZh: { type: "string" },
    keyTerms: { type: "array", maxItems: 8, items: { type: "object", additionalProperties: false, required: ["original", "translationZh", "explanationZh"], properties: { original: { type: "string" }, translationZh: { type: "string" }, explanationZh: { type: "string" } } } },
  },
};
function promptFor(source: ResearchSource): string {
  return `你是心理科學研究摘要編輯。只能依下方資料，以台灣繁體中文輸出符合 schema 的 JSON。不得自行搜尋或補充；原文沒有的樣本數、族群、地點必須填 null。不得把相關改寫成因果。推論限制須以「根據研究設計推論」開頭。cautionZh 必須說明同儕審查狀態、是否僅依摘要、因果限制、樣本限制與仍需更多研究，並含「本內容為心理學教育與研究摘要，不構成醫療、心理治療或診斷建議。」\n\n原始標題：${source.title}\n作者：${source.authors.join(", ")}\n出版日期：${source.publicationDate}\n期刊或平台：${source.journalOrRepository}\nDOI：${source.doi ?? "null"}\n研究類型（來源正規化）：${source.studyType}\n同儕審查狀態（來源正規化）：${source.publicationStatus}\n英文摘要：${source.abstract}`;
}
function ensureGrounded(summary: SummaryFields, source: ResearchSource): void {
  if (summary.sample.size !== null) {
    const digits = String(summary.sample.size);
    const commaDigits = summary.sample.size.toLocaleString("en-US");
    if (!source.abstract.includes(digits) && !source.abstract.includes(commaDigits)) throw new Error("AI 輸出的樣本數未出現在來源摘要，拒絕寫入");
  }
}
function assemble(summary: SummaryFields, source: ResearchSource, featuredDate: string, provider: string, model: string): DailyResearch {
  ensureGrounded(summary, source);
  const doiUrl = source.doi ? `https://doi.org/${source.doi}` : null;
  return dailyResearchSchema.parse({
    id: source.doi ? source.doi.replace(/[^a-z0-9]+/gi, "-") : source.id.replace(/[^a-z0-9]+/gi, "-"),
    featuredDate, ...summary, titleOriginal: source.title, authors: source.authors, journalOrRepository: source.journalOrRepository,
    publicationDate: source.publicationDate, language: source.language, publicationStatus: source.publicationStatus, studyType: source.studyType,
    psychologyCategory: source.psychologyCategory, originalUrl: source.originalUrl, doi: source.doi, doiUrl,
    openAccessUrl: source.openAccessUrl, sourceApis: source.sourceApis, retrievedAt: source.retrievedAt, summaryBasis: "abstract",
    aiGenerated: true, aiProvider: provider, aiModel: model,
    metadataVerification: { titleVerified: true, authorsVerified: source.authors.length > 0, dateVerified: true, doiVerified: source.doi !== null, urlVerified: validHttpsUrl(source.originalUrl) },
  });
}
class OpenAiSummarizer implements ResearchSummarizer {
  constructor(private key: string, private model: string) {}
  async summarize(source: ResearchSource, featuredDate: string): Promise<DailyResearch> {
    const data = await fetchJson<{ choices: Array<{ message: { content: string } }> }>("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: this.model, messages: [{ role: "user", content: promptFor(source) }], temperature: 0, response_format: { type: "json_schema", json_schema: { name: "research_summary", strict: true, schema: outputJsonSchema } } }) });
    const summary = summarySchema.parse(JSON.parse(data.choices[0]?.message.content ?? ""));
    return assemble(summary, source, featuredDate, "openai", this.model);
  }
}
class GeminiSummarizer implements ResearchSummarizer {
  constructor(private key: string, private model: string) {}
  async summarize(source: ResearchSource, featuredDate: string): Promise<DailyResearch> {
    const data = await fetchJson<{ candidates: Array<{ content: { parts: Array<{ text: string }> } }> }>(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: promptFor(source) }] }], generationConfig: { temperature: 0, responseMimeType: "application/json", responseJsonSchema: outputJsonSchema } }) });
    const summary = summarySchema.parse(JSON.parse(data.candidates[0]?.content.parts[0]?.text ?? ""));
    return assemble(summary, source, featuredDate, "gemini", this.model);
  }
}
export function createSummarizer(): ResearchSummarizer {
  const provider = process.env.LLM_PROVIDER?.toLowerCase(); const model = process.env.LLM_MODEL;
  if (!provider || !model) throw new Error("缺少 LLM_PROVIDER 或 LLM_MODEL；未修改既有研究內容");
  if (provider === "openai" && process.env.OPENAI_API_KEY) return new OpenAiSummarizer(process.env.OPENAI_API_KEY, model);
  if (provider === "gemini" && process.env.GEMINI_API_KEY) return new GeminiSummarizer(process.env.GEMINI_API_KEY, model);
  throw new Error(`LLM Provider「${provider}」缺少對應 API Key；請設定 OPENAI_API_KEY 或 GEMINI_API_KEY`);
}
export { ensureGrounded, summarySchema };
