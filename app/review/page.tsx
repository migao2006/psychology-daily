import type { Metadata } from "next";
import { ReviewCenter } from "@/components/review/review-center";
import { lessons } from "@/lib/content/lessons";

export const metadata: Metadata = { title: "複習中心" };

export default function ReviewPage() {
  return (
    <main id="main-content" className="page">
      <div className="page-heading">
        <h1>複習中心</h1>
        <p className="lede">
          每個概念依答對與否、確定程度和過去錯誤安排下一次複習，不使用 AI。
        </p>
      </div>
      <ReviewCenter lessons={lessons} />
    </main>
  );
}
