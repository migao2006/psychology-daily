import Link from "next/link";
import type { RankedResearch } from "@/lib/research/recommend";

const statusLabel = {
  peer_reviewed: "已同儕審查",
  preprint: "預印本",
  unknown: "審查狀態未知",
};

const typeLabel = {
  meta_analysis: "統合分析",
  systematic_review: "系統性回顧",
  randomized_trial: "隨機試驗",
  experimental: "實驗研究",
  longitudinal: "縱貫研究",
  cross_sectional: "橫斷研究",
  qualitative: "質性研究",
  registered_report: "Registered Report",
  other: "其他研究",
};

export function ResearchCard({
  ranked,
  showReasons,
}: {
  ranked: RankedResearch;
  showReasons: boolean;
}) {
  const item = ranked.research;
  const titleId = `research-title-${safeDomId(item.id)}`;
  return (
    <article
      className="card research-card"
      data-research-id={item.id}
      aria-labelledby={titleId}
    >
      <div className="research-card-body">
        <div className="meta">
          <span className="badge">{statusLabel[item.publicationStatus]}</span>
          <span className="badge badge-warm">{typeLabel[item.studyType]}</span>
          {ranked.isRead ? <span className="badge badge-neutral">已閱讀</span> : null}
        </div>
        <div>
          <h2 id={titleId}>{item.titleZh}</h2>
          <p className="original-title" lang="en">
            {item.titleOriginal}
          </p>
        </div>
        <dl className="research-card-meta">
          <div>
            <dt>發布</dt>
            <dd>{item.publicationDate}</dd>
          </div>
          <div>
            <dt>來源</dt>
            <dd>{item.journalOrRepository}</dd>
          </div>
          <div>
            <dt>主題</dt>
            <dd>{item.psychologyCategory}</dd>
          </div>
        </dl>
        <ul className="research-findings">
          {item.mainFindingsZh.slice(0, 2).map((finding) => (
            <li key={finding}>{finding}</li>
          ))}
        </ul>
      </div>
      <div className="research-card-footer">
        {showReasons ? (
          <div className="recommendation-reasons" aria-label="推薦原因">
            {ranked.reasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        ) : null}
        <Link
          className="button button-secondary button-full"
          href={`/research/${encodeURIComponent(item.id)}`}
          aria-label={`閱讀〈${item.titleZh}〉全文整理`}
        >
          閱讀全文整理
        </Link>
      </div>
    </article>
  );
}

function safeDomId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}
