import type { Metadata } from "next";
import { ProgressDashboard } from "@/components/progress/progress-dashboard";
import { lessonCategories, lessons } from "@/lib/content/lessons";
export const metadata: Metadata = { title: "進度" };
export default function ProgressPage() {
  return <main id="main-content" className="page"><div className="page-heading"><p className="eyebrow">Private progress</p><h1>你的學習進度</h1><p className="lede">資料預設只保存在目前瀏覽器；你也可以主動建立一份只有復原碼能解密的 Cloudflare 備份。</p></div><ProgressDashboard lessons={lessons} categories={[...lessonCategories]} /></main>;
}
