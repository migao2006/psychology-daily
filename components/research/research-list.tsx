"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { DailyResearch } from "@/lib/schemas/research";
const filters = ["全部", "已同儕審查", "預印本", "系統性回顧", "統合分析", "實驗研究", "縱貫研究", "認知心理學", "社會心理學", "發展心理學", "心理健康", "神經科學", "人格與個別差異"];
export function ResearchList({ research }: { research: DailyResearch[] }) {
  const [filter, setFilter] = useState("全部");
  const shown = useMemo(() => research.filter((item) => filter === "全部" || matchFilter(item, filter)), [filter, research]);
  return <><div className="filter-row" role="group" aria-label="研究篩選">{filters.map((item) => <button key={item} className="filter-button" type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="stack">{shown.length === 0 ? <div className="card"><h2>目前沒有符合的研究</h2><p className="muted">請選擇其他篩選條件。每日更新只會保留通過資料完整度檢查的研究。</p></div> : shown.map((item) => <article className="card research-card" key={item.id}><div className="meta"><span className="badge">{statusLabel[item.publicationStatus]}</span><span className="badge badge-warm">{typeLabel[item.studyType]}</span></div><h2>{item.titleZh}</h2><p className="original-title" lang="en">{item.titleOriginal}</p><div className="meta"><span>{item.publicationDate}</span><span>{item.journalOrRepository}</span><span>{item.psychologyCategory}</span></div><p>{item.mainFindingsZh.slice(0, 2).join(" ")}</p><Link className="button button-secondary" href={`/research/${encodeURIComponent(item.id)}`}>閱讀全文整理</Link></article>)}</div></>;
}
function matchFilter(item: DailyResearch, filter: string) {
  if (filter === "已同儕審查") return item.publicationStatus === "peer_reviewed";
  if (filter === "預印本") return item.publicationStatus === "preprint";
  const types: Record<string, DailyResearch["studyType"][]> = { "系統性回顧": ["systematic_review"], "統合分析": ["meta_analysis"], "實驗研究": ["experimental", "randomized_trial"], "縱貫研究": ["longitudinal"] };
  if (types[filter]) return types[filter].includes(item.studyType);
  return item.psychologyCategory === filter;
}
const statusLabel = { peer_reviewed: "已同儕審查", preprint: "預印本", unknown: "審查狀態未知" };
const typeLabel = { meta_analysis: "統合分析", systematic_review: "系統性回顧", randomized_trial: "隨機試驗", experimental: "實驗研究", longitudinal: "縱貫研究", cross_sectional: "橫斷研究", qualitative: "質性研究", registered_report: "Registered Report", other: "其他研究" };
