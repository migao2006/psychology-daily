import type { Metadata } from "next";
import { CoursesOverview } from "@/components/course/courses-overview";
import { lessonCategories, lessons } from "@/lib/content/lessons";
export const metadata: Metadata = { title: "課程" };
export default function CoursesPage() {
  return <main id="main-content" className="page"><div className="page-heading"><p className="eyebrow">30 lessons</p><h1>心理學入門課程</h1><p className="lede">依你的本機進度循序學習，不因錯過日期跳課。</p></div><CoursesOverview lessons={lessons} categories={[...lessonCategories]} /></main>;
}
