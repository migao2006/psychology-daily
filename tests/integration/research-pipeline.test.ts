import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson } from "@/lib/research/http";
import { fetchCrossref, fetchOpenAlex, fetchPapers, fetchSemanticScholar } from "@/lib/research/fetch";
import { verifyMetadata } from "@/lib/research/verify";
import { findOpenAccess } from "@/lib/research/open-access";
import { createSummarizer } from "@/lib/research/summarizer";
import { updateDailyResearch } from "@/lib/research/update";
import type { ResearchSource } from "@/lib/research/types";
const originalEnv = { ...process.env };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const candidate: ResearchSource = { id: "w1", title: "Attention in adolescent learning", authors: ["Ada Test"], publicationDate: "2026-07-20", abstract: "A survey of 120 adolescents examined attention.", originalUrl: "https://doi.org/10.1000/test", doi: "10.1000/test", journalOrRepository: "Test Journal", language: "en", publicationStatus: "peer_reviewed", studyType: "cross_sectional", psychologyCategory: "認知心理學", openAccessUrl: null, sourceApis: ["OpenAlex"], retrievedAt: "2026-07-23T00:00:00Z" };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); process.env = { ...originalEnv }; });
describe("mocked research APIs", () => {
  it("normalizes a successful OpenAlex response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ results: [{ id: "https://openalex.org/W1", doi: "https://doi.org/10.1000/test", display_name: candidate.title, publication_date: candidate.publicationDate, abstract_inverted_index: { A: [0], survey: [1], of: [2], "120": [3], adolescents: [4] }, authorships: [{ author: { display_name: "Ada Test" } }], primary_location: { landing_page_url: candidate.originalUrl, source: { display_name: "Test Journal", type: "journal" } }, open_access: { oa_url: null }, language: "en" }] })));
    const items = await fetchOpenAlex(new Date("2026-07-23T12:00:00Z"), 14);
    expect(items[0]).toEqual(expect.objectContaining({ doi: "10.1000/test", authors: ["Ada Test"], abstract: "A survey of 120 adolescents", publicationStatus: "unknown" }));
  });
  it("stops at OpenAlex when the highest-priority source has an eligible candidate", async () => {
    const mocked = vi.fn().mockResolvedValue(response({ results: [{ id: "https://openalex.org/W1", doi: "https://doi.org/10.1000/test", display_name: candidate.title, publication_date: candidate.publicationDate, abstract_inverted_index: { Psychology: [0], attention: [1], learning: [2] }, authorships: [{ author: { display_name: "Ada Test" } }], primary_location: { landing_page_url: candidate.originalUrl, source: { display_name: "Test Journal", type: "journal" } }, open_access: { oa_url: null }, language: "en" }] }));
    vi.stubGlobal("fetch", mocked);
    await expect(fetchPapers(new Date("2026-07-23T12:00:00Z"))).resolves.toEqual([expect.objectContaining({ sourceApis: ["OpenAlex"] })]);
    expect(mocked).toHaveBeenCalledTimes(1);
  });
  it("uses Semantic Scholar only after the higher-priority sources have no eligible result", async () => {
    const requested: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input); requested.push(url);
      if (url.includes("openalex")) return response({ results: [] });
      if (url.includes("europepmc")) return response({ resultList: { result: [] } });
      if (url.includes("crossref")) return response({ message: { items: [] } });
      return response({ data: [{ paperId: "S1", title: "Psychology of attention and memory", authors: [{ name: "Ada Test" }], publicationDate: "2026-07-22", abstract: "This psychology experiment examined attention and memory.", url: "https://www.semanticscholar.org/paper/S1", externalIds: {}, venue: "PsyArXiv", publicationTypes: ["Preprint"], openAccessPdf: { url: "https://example.org/paper.pdf" } }] });
    }));
    const items = await fetchPapers(new Date("2026-07-23T12:00:00Z"));
    expect(requested.map((url) => url.includes("openalex") ? "OpenAlex" : url.includes("europepmc") ? "Europe PMC" : url.includes("crossref") ? "Crossref" : "Semantic Scholar")).toEqual(["OpenAlex", "Europe PMC", "Crossref", "Semantic Scholar"]);
    expect(items).toEqual([expect.objectContaining({ sourceApis: ["Semantic Scholar"], publicationStatus: "preprint" })]);
  });
  it("conservatively classifies repository records and Crossref metadata", async () => {
    const repositoryResponse = response({ results: [{ id: "https://openalex.org/W2", doi: "https://doi.org/10.1000/repository", display_name: "Psychology preprint about memory", publication_date: "2026-07-22", abstract_inverted_index: { Psychology: [0], memory: [1] }, authorships: [], primary_location: { landing_page_url: "https://repository.example.org/item/2", source: { display_name: "Example Repository", type: "repository" } }, open_access: { oa_url: null }, language: "en" }] });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(repositoryResponse));
    const repositoryItems = await fetchOpenAlex(new Date("2026-07-23T12:00:00Z"), 14);
    expect(repositoryItems[0].publicationStatus).toBe("preprint");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ message: { items: [{ DOI: "10.1000/crossref", title: ["Psychology and memory"], author: [{ given: "Ada", family: "Test" }], published: { "date-parts": [[2026, 7, 22]] }, "container-title": ["Test Journal"], URL: "https://doi.org/10.1000/crossref", abstract: "A psychology study of memory." }] } })));
    const crossrefItems = await fetchCrossref(new Date("2026-07-23T12:00:00Z"), 14);
    expect(crossrefItems[0].publicationStatus).toBe("unknown");
  });
  it("normalizes a direct Semantic Scholar fallback response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ data: [{ paperId: "S2", title: "Emotion regulation in daily life", authors: [{ name: "B. Author" }], year: 2026, abstract: "Psychology research about emotion regulation.", externalIds: { DOI: "https://doi.org/10.1000/semantic" }, venue: "Example Journal", publicationTypes: ["JournalArticle"], openAccessPdf: null }] })));
    const items = await fetchSemanticScholar(new Date("2026-07-23T12:00:00Z"), 30);
    expect(items[0]).toEqual(expect.objectContaining({ doi: "10.1000/semantic", originalUrl: "https://doi.org/10.1000/semantic", publicationStatus: "unknown", sourceApis: ["Semantic Scholar"] }));
  });
  it("retries a 429 and succeeds", async () => {
    const mocked = vi.fn().mockResolvedValueOnce(response({}, 429)).mockResolvedValueOnce(response({ ok: true }));
    vi.stubGlobal("fetch", mocked);
    await expect(fetchJson<{ ok: boolean }>("https://example.org", {}, 2)).resolves.toEqual({ ok: true });
    expect(mocked).toHaveBeenCalledTimes(2);
  });
  it("returns no candidate for empty APIs or missing abstracts", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("openalex")) return response({ results: [{ ...candidate, display_name: candidate.title, abstract_inverted_index: null, primary_location: { landing_page_url: candidate.originalUrl, source: { display_name: "Test", type: "journal" } }, authorships: [], publication_date: candidate.publicationDate }] });
      if (url.includes("europepmc")) return response({ resultList: { result: [] } });
      return response({ message: { items: [] } });
    }));
    await expect(fetchPapers(new Date("2026-07-23T12:00:00Z"))).resolves.toEqual([]);
  });
  it("rejects a DOI/title mismatch from Crossref", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ message: { DOI: "10.1000/test", title: ["Completely unrelated chemistry"], author: [], "container-title": ["Other"] } })));
    await expect(verifyMetadata(candidate)).rejects.toThrow(/標題.*不一致/);
  });
  it("rejects non-JSON AI output", async () => {
    process.env.LLM_PROVIDER = "openai"; process.env.LLM_MODEL = "configured-model"; process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ choices: [{ message: { content: "not-json" } }] })));
    await expect(createSummarizer().summarize(candidate, "2026-07-23")).rejects.toThrow();
  });
  it("does not invent an open access URL", async () => {
    process.env.UNPAYWALL_EMAIL = "test@example.com";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ best_oa_location: null })));
    await expect(findOpenAccess(candidate)).resolves.toEqual(expect.objectContaining({ openAccessUrl: null }));
  });
  it("uses workflow concurrency to prevent duplicate daily runs", () => {
    const workflow = readFileSync(path.join(process.cwd(), ".github/workflows/update-daily-research.yml"), "utf8");
    expect(workflow).toContain("group: daily-research-main");
    expect(workflow).toContain("cancel-in-progress: false");
  });
  it("retains the last good research file when configuration is missing", async () => {
    delete process.env.LLM_PROVIDER; delete process.env.LLM_MODEL; delete process.env.OPENAI_API_KEY; delete process.env.GEMINI_API_KEY;
    const root = await mkdtemp(path.join(os.tmpdir(), "psychology-daily-"));
    const daily = path.join(root, "content", "research", "daily"); await mkdir(daily, { recursive: true });
    const marker = '{"lastGood":true}\n'; await writeFile(path.join(daily, "last.json"), marker);
    await expect(updateDailyResearch(root, new Date("2026-07-23T12:00:00Z"))).rejects.toThrow(/LLM_PROVIDER/);
    expect(await readFile(path.join(daily, "last.json"), "utf8")).toBe(marker);
    await rm(root, { recursive: true, force: true });
  });
});
