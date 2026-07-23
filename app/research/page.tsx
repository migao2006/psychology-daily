import type { Metadata } from "next";
import { ResearchList } from "@/components/research/research-list";
import { featuredResearch, researchCatalog } from "@/lib/content/research";
export const metadata: Metadata = { title: "研究" };
export default function ResearchPage() {
  return <main id="main-content" className="page"><div className="page-heading"><h1>心理學研究</h1><p className="lede">搜尋經過來源與欄位驗證的英文研究，依你的明確偏好、主動回饋與閱讀內容排序。</p></div><ResearchList research={researchCatalog} featuredResearchId={featuredResearch?.id} /></main>;
}
