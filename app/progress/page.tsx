import type { Metadata } from "next";
import { ProgressDashboard } from "@/components/progress/progress-dashboard";
import { lessonCategories, lessons } from "@/lib/content/lessons";
export const metadata: Metadata = { title: "進度" };
export default function ProgressPage() {
  return <main id="main-content" className="page"><div className="page-heading"><h1>你的學習進度</h1><p className="lede">學習資料已綁定並以端對端加密同步；本瀏覽器的 IndexedDB 僅作為同步快取。</p></div><ProgressDashboard lessons={lessons} categories={[...lessonCategories]} /></main>;
}
