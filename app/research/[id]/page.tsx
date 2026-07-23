import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResearchDetail } from "@/components/research/research-detail";
import { allResearch, getResearchById } from "@/lib/content/research";
export function generateStaticParams() { return allResearch.map((item) => ({ id: item.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const item = getResearchById(decodeURIComponent((await params).id));
  return { title: item?.titleZh ?? "找不到研究" };
}
export default async function ResearchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const item = getResearchById(decodeURIComponent((await params).id));
  if (!item) notFound();
  return <main id="main-content" className="page"><ResearchDetail research={item} /></main>;
}
