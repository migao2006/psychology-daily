import type { Metadata } from "next";
import { ResearchList } from "@/components/research/research-list";
import { allResearch } from "@/lib/content/research";
export const metadata: Metadata = { title: "研究" };
export default function ResearchPage() {
  return <main id="main-content" className="page"><div className="page-heading"><p className="eyebrow">Research digest</p><h1>每日心理學研究</h1><p className="lede">英文原始研究的繁體中文重點整理，保留 DOI、來源與研究限制。</p></div><ResearchList research={allResearch} /></main>;
}
