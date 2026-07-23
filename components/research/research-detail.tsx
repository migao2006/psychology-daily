import type { DailyResearch } from "@/lib/schemas/research";
import { MarkResearchRead } from "./mark-research-read";
export function ResearchDetail({ research }: { research: DailyResearch }) {
  const preprint = research.publicationStatus === "preprint";
  const publicationStatusLabel = research.publicationStatus === "peer_reviewed" ? "已同儕審查" : preprint ? "預印本・尚未同儕審查" : "審查狀態未知";
  return <article className="lesson-article"><header className="page-heading"><div className="meta"><span className="badge">{publicationStatusLabel}</span><span>{research.publicationDate}</span></div><h1 style={{ marginTop: ".65rem" }}>{research.titleZh}</h1><p className="lede" lang="en">{research.titleOriginal}</p><div className="meta" style={{ marginTop: ".8rem" }}><span>{research.authors.join(", ")}</span><span>{research.journalOrRepository}</span></div></header>
    {preprint && <section className="card callout"><strong>預印本提醒</strong><p>尚未完成正式同儕審查，研究內容及結論可能修改。</p></section>}
    <ResearchSection title="這篇研究在問什麼？"><p>{research.researchQuestionZh}</p><p className="muted" style={{ marginTop: ".7rem" }}>{research.backgroundZh}</p></ResearchSection>
    <ResearchSection title="研究怎麼做？"><p>{research.methodsZh}</p><div className="meta" style={{ marginTop: ".8rem" }}><span>樣本數：{research.sample.size ?? "摘要未提供"}</span><span>{research.sample.populationZh ?? "族群未提供"}</span><span>{research.sample.locationZh ?? "地點未提供"}</span></div></ResearchSection>
    <ResearchSection title="主要發現"><ul className="list-clean">{research.mainFindingsZh.map((item) => <li key={item}>{item}</li>)}</ul></ResearchSection>
    <section className="card card-hero"><p className="eyebrow" style={{ color: "#d8fff3" }}>這對一般人代表什麼？</p><h2>{research.practicalMeaningZh}</h2></section>
    <ResearchSection title="研究限制"><ul className="list-clean">{research.limitationsZh.map((item) => <li key={item}>{item}</li>)}</ul></ResearchSection>
    <section className="card callout"><h2>閱讀時要注意</h2><p>{research.cautionZh}</p></section>
    <ResearchSection title="關鍵詞"><div className="stack">{research.keyTerms.map((term) => <div key={term.original}><strong>{term.translationZh} <span className="muted" lang="en">({term.original})</span></strong><p>{term.explanationZh}</p></div>)}</div></ResearchSection>
    <ResearchSection title="來源與書目"><div className="stack"><div className="meta"><span>DOI：{research.doi ?? "無"}</span><span>資料來源：{research.sourceApis.join("、")}</span><span>擷取：{new Date(research.retrievedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</span><span>摘要基礎：{research.summaryBasis === "abstract" ? "僅摘要" : "摘要與合法公開全文"}</span></div><div className="stack" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(10rem,1fr))" }}><a className="button" href={research.originalUrl} target="_blank" rel="noopener noreferrer">查看原始論文 ↗</a>{research.doiUrl && <a className="button button-secondary" href={research.doiUrl} target="_blank" rel="noopener noreferrer">開啟 DOI ↗</a>}{research.openAccessUrl && <a className="button button-secondary" href={research.openAccessUrl} target="_blank" rel="noopener noreferrer">免費全文 ↗</a>}</div></div></ResearchSection>
    <MarkResearchRead researchId={research.id} />
    <p className="notice">本內容為心理學教育與研究摘要，不構成醫療、心理治療或診斷建議。</p>
  </article>;
}
function ResearchSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card"><h2>{title}</h2>{children}</section>; }
