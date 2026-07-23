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
  const related = allResearch
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) => ({
      candidate,
      score:
        Number(candidate.psychologyCategory === item.psychologyCategory) * 3 +
        Number(candidate.studyType === item.studyType) * 2 +
        candidate.keyTerms.filter((term) =>
          item.keyTerms.some(
            (itemTerm) =>
              itemTerm.original.toLowerCase() === term.original.toLowerCase(),
          ),
        ).length,
    }))
    .filter((entry) => entry.score > 0)
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        right.candidate.publicationDate.localeCompare(
          left.candidate.publicationDate,
        ),
    )
    .slice(0, 3)
    .map((entry) => entry.candidate);
  return <main id="main-content" className="page"><ResearchDetail research={item} related={related} /></main>;
}
