# Automated research backfill to 100

## Goal

將研究庫由目前內容自動分批擴充到總數 100 篇；每批經完整來源、metadata、摘要 grounding、schema 與 Repository 驗證後自動提交 `main`，不需要人工逐批執行。

## Scope

- 每日自動回補最多 10 篇，主要搜尋最近 180 天，連續無進展時依規則擴大至 365 天。
- 建立可續跑、可追蹤且不重複的回補狀態與候選拒絕紀錄。
- 依六個心理學分類做定向補足，維持研究品質、預印本上限與合法來源規則。
- 協調每日研究與回補 workflow，避免同時修改 `content/research/`。
- 將研究列表改為精簡 catalog 與漸進顯示，使手機可承載 100 篇內容。
- 完成測試、PR、`main`／Production 驗證並啟動第一個正式批次。

## Non-goals

- 不降低 metadata、URL、Zod、LLM grounding 或內容科學準確性要求。
- 不修改課程、複習演算法、推薦權重、Cloudflare 同步或使用者資料格式。
- 不加入新的資料庫、後端服務、分析追蹤或前端 API key。

## Acceptance

- 回補目標為研究庫總數 100，單批最多新增 10 篇且永不因回補超過剩餘篇數。
- 六分類以每類至少 12 篇為平衡目標；預印本總數不超過 20 篇。
- 180 天連續三批無進展後切換 365 天；365 天再連續三批無進展時安全標示 stalled。
- 永久候選錯誤可跳過；429、5xx、timeout 或 provider 錯誤不得留下部分內容。
- 排程成功批次只提交 `content/research/`，不得 force push、建立空 Commit 或覆寫人工課程。
- 研究列表初次最多渲染 12 張卡片，可逐批載入且維持完整本機搜尋／推薦。
- `pnpm verify`、`pnpm test:e2e`、`pnpm audit --audit-level high`、`git diff --check` 全部通過。
- GitHub Actions 首批正式回補、main CI 與 Vercel Production 均成功。
