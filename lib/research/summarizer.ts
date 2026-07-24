import { z } from "zod";
import { researchArticleSchema, type ResearchArticle } from "@/lib/schemas/research";
import { buildResearchSummaryPrompt } from "@/prompts/research-summary";
import { fetchJson, ResearchHttpError } from "./http";
import { CandidateRejectionError } from "./errors";
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
const auditSchema = z.strictObject({
  valid: z.boolean(),
  issues: z.array(z.string().min(1)).max(20),
});
const auditJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["valid", "issues"],
  properties: {
    valid: { type: "boolean" },
    issues: { type: "array", maxItems: 20, items: { type: "string" } },
  },
};
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
export const GEMINI_REQUEST_INTERVAL_MS = 6_500;
export const GROQ_REQUEST_INTERVAL_MS = 30_000;

export function nextProviderRequestDelay(
  lastStartedAt: number | null,
  now: number,
  minimumIntervalMs: number,
): number {
  return lastStartedAt === null
    ? 0
    : Math.max(0, lastStartedAt + minimumIntervalMs - now);
}

class ProviderRequestPacer {
  private lastStartedAt: number | null = null;

  constructor(private readonly minimumIntervalMs: number) {}

  async wait(): Promise<void> {
    const delay = nextProviderRequestDelay(
      this.lastStartedAt,
      Date.now(),
      this.minimumIntervalMs,
    );
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.lastStartedAt = Date.now();
  }
}
function ensureGrounded(summary: SummaryFields, source: ResearchSource): void {
  if (summary.sample.size !== null) {
    const digits = String(summary.sample.size);
    const commaDigits = summary.sample.size.toLocaleString("en-US");
    if (!source.abstract.includes(digits) && !source.abstract.includes(commaDigits)) {
      throw new CandidateRejectionError(
        "summary_grounding_failed",
        "AI 輸出的樣本數未出現在來源摘要",
      );
    }
  }
}
function assemble(summary: SummaryFields, source: ResearchSource, provider: string, model: string): ResearchArticle {
  ensureGrounded(summary, source);
  const doiUrl = source.doi ? `https://doi.org/${source.doi}` : null;
  const parsed = researchArticleSchema.safeParse({
    id: source.doi ? source.doi.replace(/[^a-z0-9]+/gi, "-") : source.id.replace(/[^a-z0-9]+/gi, "-"),
    ...summary, titleOriginal: source.title, authors: source.authors, journalOrRepository: source.journalOrRepository,
    publicationDate: source.publicationDate, language: source.language, publicationStatus: source.publicationStatus, studyType: source.studyType,
    psychologyCategory: source.psychologyCategory, originalUrl: source.originalUrl, doi: source.doi, doiUrl,
    openAccessUrl: source.openAccessUrl, sourceApis: source.sourceApis, retrievedAt: source.retrievedAt, summaryBasis: "abstract",
    aiGenerated: true, aiProvider: provider, aiModel: model,
    metadataVerification: { titleVerified: true, authorsVerified: source.authors.length > 0, dateVerified: true, doiVerified: source.doi !== null, urlVerified: validHttpsUrl(source.originalUrl) },
  });
  if (!parsed.success) {
    throw new CandidateRejectionError(
      "summary_schema_invalid",
      "AI 摘要無法通過研究內容 schema",
    );
  }
  return parsed.data;
}
export function researchSummaryAuditPrompt(
  source: ResearchSource,
  summary: SummaryFields,
): string {
  const verifiedSource = {
    title: source.title,
    authors: source.authors,
    publicationDate: source.publicationDate,
    journalOrRepository: source.journalOrRepository,
    doi: source.doi,
    publicationStatus: source.publicationStatus,
    studyType: source.studyType,
    psychologyCategory: source.psychologyCategory,
    abstract: source.abstract,
  };
  return [
    "你是研究摘要的第二道獨立查核。只能比較下列已核對來源資料與繁中整理。",
    "若繁中整理加入來源沒有的樣本、族群、地點、方法、數值、因果、發現或作者限制，valid 必須為 false。",
    "以下安全提醒不算捏造：依 publicationStatus 標示同儕審查狀態、依 studyType 提醒因果推論界線、說明僅依摘要整理，以及教育內容不構成醫療／治療／診斷建議。",
    "不可因文字精簡或合理翻譯而判錯。只輸出符合 schema 的 JSON。",
    `已核對來源資料：${JSON.stringify(verifiedSource)}`,
    `繁中整理：${JSON.stringify(summary)}`,
  ].join("\n\n");
}
class OpenAiCompatibleSummarizer implements ResearchSummarizer {
  private readonly pacer: ProviderRequestPacer;

  constructor(
    private key: string,
    private model: string,
    private provider: "openai" | "groq",
    private endpoint: string,
    minimumIntervalMs = 0,
  ) {
    this.pacer = new ProviderRequestPacer(minimumIntervalMs);
  }

  private async request(
    prompt: string,
    name: string,
    schema: typeof outputJsonSchema | typeof auditJsonSchema,
  ): Promise<string> {
    await this.pacer.wait();
    const data = await fetchJson<{
      choices: Array<{ message: { content: string } }>;
    }>(
      this.endpoint,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          ...(this.provider === "groq"
            ? {
                include_reasoning: false,
                reasoning_effort: "low",
                max_completion_tokens: 2_000,
              }
            : {}),
          response_format: {
            type: "json_schema",
            json_schema: { name, strict: true, schema },
          },
        }),
      },
      3,
      45_000,
    );
    return data.choices[0]?.message.content ?? "";
  }

  async summarize(source: ResearchSource): Promise<ResearchArticle> {
    const summary = parseSummary(
      await this.request(
        buildResearchSummaryPrompt(source),
        "research_summary",
        outputJsonSchema,
      ),
    );
    const audit = parseAudit(
      await this.request(
        researchSummaryAuditPrompt(source, summary),
        "research_grounding_audit",
        auditJsonSchema,
      ),
    );
    if (!audit.valid) {
      throw new CandidateRejectionError(
        "summary_audit_failed",
        "AI 摘要第二次查核未通過",
      );
    }
    return assemble(summary, source, this.provider, this.model);
  }
}

export class FailoverSummarizer implements ResearchSummarizer {
  private primaryUnavailable = false;

  constructor(
    private readonly primary: ResearchSummarizer,
    private readonly fallback: ResearchSummarizer,
  ) {}

  async summarize(source: ResearchSource): Promise<ResearchArticle> {
    if (this.primaryUnavailable) return this.fallback.summarize(source);
    try {
      return await this.primary.summarize(source);
    } catch (error) {
      if (error instanceof ResearchHttpError && error.retryable) {
        this.primaryUnavailable = true;
      }
      return this.fallback.summarize(source);
    }
  }
}

class GeminiSummarizer implements ResearchSummarizer {
  private readonly pacer = new ProviderRequestPacer(
    GEMINI_REQUEST_INTERVAL_MS,
  );

  constructor(private key: string, private model: string) {}
  async summarize(source: ResearchSource): Promise<ResearchArticle> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    await this.pacer.wait();
    const data = await fetchJson<{ candidates: Array<{ content: { parts: Array<{ text: string }> } }> }>(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": this.key }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: buildResearchSummaryPrompt(source) }] }], generationConfig: { temperature: 0, responseMimeType: "application/json", responseJsonSchema: outputJsonSchema } }) }, 3, 45_000);
    const summary = parseSummary(data.candidates[0]?.content.parts[0]?.text ?? "");
    await this.pacer.wait();
    const auditData = await fetchJson<{
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    }>(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.key,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: researchSummaryAuditPrompt(source, summary) }],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseJsonSchema: auditJsonSchema,
          },
        }),
      },
      3,
      45_000,
    );
    const audit = parseAudit(
      auditData.candidates[0]?.content.parts[0]?.text ?? "",
    );
    if (!audit.valid) {
      throw new CandidateRejectionError(
        "summary_audit_failed",
        "AI 摘要第二次查核未通過",
      );
    }
    return assemble(summary, source, "gemini", this.model);
  }
}

function parseSummary(value: string): SummaryFields {
  try {
    return summarySchema.parse(JSON.parse(value));
  } catch {
    throw new CandidateRejectionError(
      "summary_schema_invalid",
      "AI 摘要不是合法的結構化 JSON",
    );
  }
}

function parseAudit(value: string): z.infer<typeof auditSchema> {
  try {
    return auditSchema.parse(JSON.parse(value));
  } catch {
    throw new CandidateRejectionError(
      "summary_audit_failed",
      "AI 摘要查核不是合法的結構化 JSON",
    );
  }
}
export function createSummarizer(): ResearchSummarizer {
  const provider = process.env.LLM_PROVIDER?.toLowerCase(); const model = process.env.LLM_MODEL;
  if (!provider || !model) throw new Error("缺少 LLM_PROVIDER 或 LLM_MODEL；未修改既有研究內容");
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAiCompatibleSummarizer(
      process.env.OPENAI_API_KEY,
      model,
      "openai",
      "https://api.openai.com/v1/chat/completions",
    );
  }
  if (provider === "groq" && process.env.GROQ_API_KEY) {
    const groq = new OpenAiCompatibleSummarizer(
      process.env.GROQ_API_KEY,
      model,
      "groq",
      "https://api.groq.com/openai/v1/chat/completions",
      GROQ_REQUEST_INTERVAL_MS,
    );
    const fallbackModel = process.env.GEMINI_FALLBACK_MODEL;
    if (process.env.GEMINI_API_KEY && fallbackModel) {
      return new FailoverSummarizer(
        groq,
        new GeminiSummarizer(process.env.GEMINI_API_KEY, fallbackModel),
      );
    }
    return groq;
  }
  if (provider === "gemini" && process.env.GEMINI_API_KEY) return new GeminiSummarizer(process.env.GEMINI_API_KEY, model);
  throw new Error(`LLM Provider「${provider}」缺少對應 API Key；請設定 GROQ_API_KEY、OPENAI_API_KEY 或 GEMINI_API_KEY`);
}
export { ensureGrounded, summarySchema };
