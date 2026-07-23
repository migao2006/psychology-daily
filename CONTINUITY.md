# Continuity

## Current Work Package

TASK=NONE

## Current Branch

`main`

## Completed

- Repository 長期維護與 AI 協作架構已建立。
- Cloudflare 必綁、單一 active device、IndexedDB 快取與端對端加密同步已發布。
- 研究內容 v2、研究偏好／推薦／搜尋／收藏、回補 workflow 與研究 UI 已發布。
- 概念級複習中心、統計、legacy migration 與確定性間隔複習已發布。
- 手機／桌面 UI、同步可靠性與 Worker v1／v2 切換保護已完成正式驗收。
- `main`、GitHub CI、Vercel Production 與 Cloudflare Worker 均已更新。

## Remaining

- 下一個獨立 work package 可手動分批執行研究 backfill workflow，累積至少 50–100 篇已驗證研究。

## Decisions

- IndexedDB 只作為已綁定裝置的同步快取；Repository 不使用 Local Storage 或 Session Storage。
- 同一復原碼只允許一台 active device；裝置憑證不進入同步 payload 或 JSON 匯出。
- 複習維持確定性間隔規則，不使用 AI。
- 研究搜尋紀錄不自動形成偏好；推薦依明確偏好、主動回饋、已讀相似度、新穎度與探索計算。
- Worker v1／v2 使用不同 KV key 前綴並行，正式切換不中斷舊版備份。

## Validation

- 本機：`pnpm verify`、`pnpm test:e2e`、`pnpm audit --audit-level high`、`git diff --check` 全部通過。
- GitHub CI：https://github.com/migao2006/psychology-daily/actions/runs/30029076205
- Vercel Production：https://psychology-daily.vercel.app
- Cloudflare Worker v1／v2 health 與正式跨裝置復原驗收通過。

## Known Issues

- Repository 目前只有一筆種子研究；推薦品質需以獨立 backfill work package 擴充資料量。
- `main` 尚未啟用 branch protection；未來若啟用 required PR，需同步設計每日研究 workflow 的受控寫入方式。
- GitHub Actions 顯示 actions Node.js 20 runtime 的平台棄用警告，但目前由 runner 強制使用 Node.js 24，工作流程成功。

## Draft PR

NONE
