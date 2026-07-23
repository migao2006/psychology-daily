import { appendFile } from "node:fs/promises";
import { backfillResearch } from "@/lib/research/backfill";

const requested = Number(process.env.BACKFILL_BATCH_SIZE ?? "10");
const result = await backfillResearch(process.cwd(), new Date(), {
  batchSize: requested,
  resetStalled: process.env.BACKFILL_FORCE_RETRY === "true",
});
console.log(
  JSON.stringify(
    {
      added: result.added,
      total: result.total,
      remaining: result.remaining,
      status: result.status,
      activeWindowDays: result.activeWindowDays,
      failedCandidates: result.failures.length,
    },
    null,
    2,
  ),
);

if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    [
      `added=${result.added}`,
      `total=${result.total}`,
      `remaining=${result.remaining}`,
      `status=${result.status}`,
      `active_window_days=${result.activeWindowDays}`,
      "",
    ].join("\n"),
  );
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const categoryRows = Object.entries(result.categoryCounts)
    .map(([category, count]) => `| ${category} | ${count} |`)
    .join("\n");
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    [
      "## 研究庫自動回補",
      "",
      `- 本批新增：${result.added}`,
      `- 目前總數：${result.total}`,
      `- 距離目標：${result.remaining}`,
      `- 狀態：${result.status}`,
      `- 搜尋範圍：最近 ${result.activeWindowDays} 天`,
      `- 預印本：${result.preprintCount}`,
      `- 有合法公開全文：${result.openAccessCount}`,
      `- 本批拒絕候選：${result.failures.length}`,
      "",
      "| 分類 | 篇數 |",
      "| --- | ---: |",
      categoryRows,
      "",
    ].join("\n"),
  );
}
