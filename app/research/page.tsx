import type { Metadata } from "next";
import { ResearchList } from "@/components/research/research-list";
import { allResearch } from "@/lib/content/research";
export const metadata: Metadata = { title: "研究" };
export default function ResearchPage() {
  return <main id="main-content" className="page"><div className="page-heading"><p className="eyebrow">Research digest</p><h1>每日心理學研究</h1><p className="lede">搜尋英文原始研究的繁體中文整理，設定自己的主題偏好，並以只在本機運算的閱讀紀錄推薦更多內容。</p></div><ResearchList research={allResearch} /></main>;
}
