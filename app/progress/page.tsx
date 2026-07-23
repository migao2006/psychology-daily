import type { Metadata } from "next";
import { ProgressDashboard } from "@/components/progress/progress-dashboard";
import { lessonCategories, lessons } from "@/lib/content/lessons";
export const metadata: Metadata = { title: "進度" };
export default function ProgressPage() {
  return <main id="main-content" className="page"><div className="page-heading"><p className="eyebrow">Local progress</p><h1>你的學習進度</h1><p className="lede">所有作答與閱讀紀錄只保存在目前裝置與瀏覽器。</p></div><ProgressDashboard lessons={lessons} categories={[...lessonCategories]} /></main>;
}
