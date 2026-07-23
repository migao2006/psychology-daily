import type { ResearchArticle } from "@/lib/schemas/research";
import { MarkResearchRead } from "./mark-research-read";
import Link from "next/link";
import { CitationCopy } from "./citation-copy";

export function ResearchDetail({
  research,
  related = [],
}: {
  research: ResearchArticle;
  related?: ResearchArticle[];
}) {
  const preprint = research.publicationStatus === "preprint";
  const publicationStatusLabel =
    research.publicationStatus === "peer_reviewed"
      ? "已同儕審查"
      : preprint
        ? "預印本・尚未同儕審查"
        : "審查狀態未知";

  return (
    <article className="lesson-article research-detail">
      <header className="page-heading research-detail-header">
        <div className="meta">
          <span className="badge">{publicationStatusLabel}</span>
          <span>{research.publicationDate}</span>
          <span>{research.psychologyCategory}</span>
        </div>
        <h1>{research.titleZh}</h1>
        <p className="lede" lang="en">
          {research.titleOriginal}
        </p>
        <dl className="bibliography-list">
          <div>
            <dt>作者</dt>
            <dd>{research.authors.join("、")}</dd>
          </div>
          <div>
            <dt>期刊或平台</dt>
            <dd>{research.journalOrRepository}</dd>
          </div>
        </dl>
      </header>
      <nav className="card detail-toc" aria-label="本頁目錄">
        <strong>本頁內容</strong>
        <a href="#research-question">研究問題</a>
        <a href="#research-methods">方法與樣本</a>
        <a href="#research-findings">主要發現</a>
        <a href="#research-limitations">限制與提醒</a>
        <a href="#research-sources">來源與核對</a>
      </nav>

      {preprint ? (
        <section className="card callout">
          <h2>預印本提醒</h2>
          <p>尚未完成正式同儕審查，研究內容及結論可能修改。</p>
        </section>
      ) : null}

      <ResearchSection id="research-question" title="這篇研究在問什麼？">
        <p>{research.researchQuestionZh}</p>
        <p className="muted section-followup">{research.backgroundZh}</p>
      </ResearchSection>

      <ResearchSection id="research-methods" title="研究怎麼做？">
        <p>{research.methodsZh}</p>
        <dl className="bibliography-list compact-bibliography">
          <div>
            <dt>樣本數</dt>
            <dd>{research.sample.size ?? "摘要未提供"}</dd>
          </div>
          <div>
            <dt>研究族群</dt>
            <dd>{research.sample.populationZh ?? "摘要未提供"}</dd>
          </div>
          <div>
            <dt>地點</dt>
            <dd>{research.sample.locationZh ?? "摘要未提供"}</dd>
          </div>
        </dl>
      </ResearchSection>

      <ResearchSection id="research-findings" title="主要發現">
        <ul className="list-clean">
          {research.mainFindingsZh.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ResearchSection>

      <section className="card card-hero practical-meaning">
        <p className="eyebrow">這對一般人代表什麼？</p>
        <h2>研究的可能意義</h2>
        <p>{research.practicalMeaningZh}</p>
      </section>

      <ResearchSection id="research-limitations" title="研究限制">
        {research.limitationsZh.length > 0 ? (
          <ul className="list-clean">
            {research.limitationsZh.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">可取得的摘要未明確列出限制。</p>
        )}
      </ResearchSection>

      <section className="card callout">
        <h2>閱讀時要注意</h2>
        <p>{research.cautionZh}</p>
      </section>

      <ResearchSection id="research-keywords" title="關鍵詞中英文對照">
        <div className="stack">
          {research.keyTerms.map((term) => (
            <div key={term.original}>
              <strong>
                {term.translationZh}{" "}
                <span className="muted" lang="en">
                  ({term.original})
                </span>
              </strong>
              <p>{term.explanationZh}</p>
            </div>
          ))}
        </div>
      </ResearchSection>

      <ResearchSection id="research-sources" title="來源、書目與核對狀態">
        <dl className="bibliography-list">
          <div>
            <dt>DOI</dt>
            <dd>{research.doi ?? "無"}</dd>
          </div>
          <div>
            <dt>資料來源</dt>
            <dd>{research.sourceApis.join("、")}</dd>
          </div>
          <div>
            <dt>資料擷取</dt>
            <dd>
              {new Date(research.retrievedAt).toLocaleString("zh-TW", {
                timeZone: "Asia/Taipei",
              })}
            </dd>
          </div>
          <div>
            <dt>摘要基礎</dt>
            <dd>
              {research.summaryBasis === "abstract"
                ? "僅摘要"
                : "摘要與合法公開全文"}
            </dd>
          </div>
          <div>
            <dt>Metadata 核對</dt>
            <dd>
              標題 {verified(research.metadataVerification.titleVerified)}、
              作者 {verified(research.metadataVerification.authorsVerified)}、
              日期 {verified(research.metadataVerification.dateVerified)}、
              DOI {verified(research.metadataVerification.doiVerified)}、
              網址 {verified(research.metadataVerification.urlVerified)}
            </dd>
          </div>
        </dl>
        <div className="source-actions">
          <a
            className="button"
            href={research.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            查看原始論文 <span className="sr-only">（在新分頁開啟）</span>↗
          </a>
          {research.doiUrl ? (
            <a
              className="button button-secondary"
              href={research.doiUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              開啟 DOI <span className="sr-only">（在新分頁開啟）</span>↗
            </a>
          ) : null}
          {research.openAccessUrl ? (
            <a
              className="button button-secondary"
              href={research.openAccessUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              免費全文 <span className="sr-only">（在新分頁開啟）</span>↗
            </a>
          ) : null}
          <CitationCopy
            citation={`${research.authors.join(", ")} (${research.publicationDate.slice(0, 4)}). ${research.titleOriginal}. ${research.journalOrRepository}.${research.doi ? ` https://doi.org/${research.doi}` : ` ${research.originalUrl}`}`}
          />
        </div>
      </ResearchSection>

      {related.length ? (
        <ResearchSection id="related-research" title="相關研究">
          <div className="related-research-list">
            {related.map((item) => (
              <Link key={item.id} href={`/research/${encodeURIComponent(item.id)}`}>
                <span className="badge">{item.psychologyCategory}</span>
                <strong>{item.titleZh}</strong>
                <span className="muted" lang="en">{item.titleOriginal}</span>
              </Link>
            ))}
          </div>
          <p className="field-hint">
            相關內容只依分類、研究類型與關鍵詞計算，不以引用次數排序。
          </p>
        </ResearchSection>
      ) : null}

      <MarkResearchRead researchId={research.id} />
      <p className="notice">
        本內容為心理學教育與研究摘要，不構成醫療、心理治療或診斷建議。
      </p>
    </article>
  );
}

function ResearchSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function verified(value: boolean): string {
  return value ? "已核對" : "未確認";
}
