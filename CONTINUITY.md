# Continuity

## Current Work Package

TASK=NONE（Cloud-bound research exploration v2 已完成）

## Current Branch

`feature/cloud-research-v2`

## Completed

- 完成 Cloudflare 必綁、單一 active device、IndexedDB v3 快取與加密自動同步。
- 完成研究內容 v2、180 天／100 篇回補 workflow、推薦、搜尋、收藏與研究 UI。
- 完成 unit、component、production build、mobile E2E 與瀏覽器驗收。

## Remaining

- 下一個 work package：題目級複習中心。

## Decisions

- IndexedDB 保留為同步快取；完全移除 Local Storage。
- 裝置憑證不進入同步 payload 或 JSON 匯出。
- Work Package 2 才加入題目級複習 schema。

## Validation

- `pnpm verify`：通過。
- `pnpm test:e2e`：1 passed。
- `git diff --check`：通過。

## Known Issues

- Repository 目前只有一筆種子研究；需在合併後手動分批執行 backfill workflow。
- Worker v2 尚未部署至 Production，正式網站不能啟用強制綁定前端。
- `main` 目前未啟用 branch protection；若未來啟用 required PR，須同步設計每日研究 workflow 的受控寫入方式。

## Draft PR

- Base prerequisite: https://github.com/migao2006/psychology-daily/pull/2
- Work package PR: https://github.com/migao2006/psychology-daily/pull/3
