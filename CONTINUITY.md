# Continuity

## Current Work Package

Production polish and release（進行中）

## Current Branch

`agent/production-polish-release`

## Completed

- 完成 Cloudflare 必綁、單一 active device、IndexedDB v3 快取與加密自動同步。
- 完成研究內容 v2、180 天／100 篇回補 workflow、推薦、搜尋、收藏與研究 UI。
- 完成 unit、component、production build、mobile E2E 與瀏覽器驗收。
- 完成概念級 IndexedDB／sync payload v4、複習中心、統計及 legacy migration。

## Remaining

- 稽核並精修手機／桌面 UI、同步與主要路徑。
- 修正 Worker v1/v2 正式切換相容性。
- 完成全套驗證、提交與 `main`／Production 驗收。

## Decisions

- IndexedDB 保留為同步快取；完全移除 Local Storage。
- 裝置憑證不進入同步 payload 或 JSON 匯出。
- 複習仍使用確定性間隔規則，不使用 AI。
- 底部主要導覽維持四項；複習中心由今日與進度頁進入。
- 正式發布必須避免 v1 前端與 v2 Worker 切換期間的服務中斷。

## Validation

- `pnpm verify`：通過，45 tests、40 static pages。
- `pnpm test:e2e`：1 passed，包含概念複習。
- `git diff --check`：通過。
- 本工作包尚待重新驗證。

## Known Issues

- Repository 目前只有一筆種子研究；需在合併後手動分批執行 backfill workflow。
- Worker v2 尚未部署至 Production，正式網站不能啟用強制綁定前端。
- `main` 目前未啟用 branch protection；若未來啟用 required PR，須同步設計每日研究 workflow 的受控寫入方式。

## Draft PR

- Base prerequisite: https://github.com/migao2006/psychology-daily/pull/2
- Work package PR: https://github.com/migao2006/psychology-daily/pull/3
- Review center PR: https://github.com/migao2006/psychology-daily/pull/4
- Release PR: https://github.com/migao2006/psychology-daily/pull/5
