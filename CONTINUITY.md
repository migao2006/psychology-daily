# Continuity

## Current Work Package

NONE

## Current Branch

`agent/repository-maintenance-foundation`

## Completed

- 完成 Repository 結構、引用、generated files、內容、測試、設定與 workflow 盤點。
- 建立長期 Repository guide、文件責任索引、work package lifecycle 與 Prompt registry。
- 保留既有產品模組分層；移除無引用樣板資產與一行式 script 轉接檔。
- 將工作包封存至 `tasks/completed/2026-07-23-repository-maintenance-foundation.md`。

## Remaining

- 人工 review Draft PR。
- Review 與 required checks 通過後，由有權限的人決定是否合併；本工作包不更新 `main`。

## Decisions

- 不為目錄外觀搬動既有產品程式。
- `scripts/` 只保留可執行入口；共用實作以 `lib/` 為唯一來源。
- 可執行研究摘要 Prompt 以 `prompts/` 為唯一來源。

## Validation

- `pnpm install --frozen-lockfile`：通過。
- `pnpm lint`、`pnpm typecheck`、`pnpm validate:content`：通過。
- `pnpm test`：7 files、35 tests 通過。
- `pnpm build`：通過，產生 39 個靜態路由。
- `pnpm test:e2e`：1 個完整流程通過。
- `pnpm audit --audit-level high`：無已知漏洞。
- `actionlint`、相對 Markdown 引用、`@/` import 與 `git diff --check`：通過。

## Known Issues

- 研究歷史目前只有一筆，推薦差異會隨每日內容累積後才更明顯。
- `main` 目前未啟用 branch protection；若未來啟用 required PR，須同步設計每日研究 workflow 的受控寫入方式。

## Draft PR

- https://github.com/migao2006/psychology-daily/pull/2
