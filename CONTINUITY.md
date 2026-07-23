# Continuity

## Current Work Package

Automated research backfill to 100（進行中）

## Current Branch

`fix/gemini-backfill-pacing`

## Completed

- Repository 長期維護、加密綁定同步、研究探索 v2、概念複習中心與 Production UI 精修已發布。
- 確認目前研究庫 1 篇；180 天唯讀候選盤點取得 174 篇去重研究，其中 111 篇有公開全文。
- 已鎖定總數 100、每日 10 篇、自動提交 main、180 天無進展後擴大至 365 天。
- 已建立持久化 campaign 狀態、永久候選拒絕紀錄、分類定向搜尋、預印本上限與暫時性錯誤整批中止。
- 已將回補改為每日排程，與每日精選共用寫入鎖及 main freshness guard；完整驗證後只提交研究內容。
- 已建立精簡研究 catalog、12 筆漸進顯示及狀態機／API／元件測試。
- PR #7 已合併；main CI 與 Vercel Production 部署成功。
- PR #8 已合併，第二次摘要查核現在可讀取 verified metadata。
- PR #9 已合併，Actions 的 CommonJS `tsx` 入口已修正。
- PR #10 已合併，分類查詢群組已改為依序執行。
- PR #11 已合併，Semantic Scholar 只在主要來源無結果時使用。

## Remaining

- 為 Gemini 摘要與查核請求加入 6.5 秒最小間隔，再重跑第一批。
- 由排程持續累積至 100 篇；若狀態變成 `stalled`，依 Actions Summary 人工檢查後決定是否 `force_retry`。

## Decisions

- 每日排程在 `18:00 UTC` 執行，與 `22:00 UTC` 每日研究更新錯開。
- 回補與每日更新使用同一個 `research-content-main` concurrency group。
- 暫時性外部服務錯誤整批失敗且不寫入；候選本身不合格則記錄固定錯誤代碼並繼續。
- IndexedDB、推薦權重與使用者同步 payload 不在本工作包修改範圍。

## Validation

- `pnpm verify`：通過（30 lessons、1 research item、55 Vitest tests、production build）。
- `pnpm test:e2e`：通過（1 Playwright flow）。
- `pnpm audit --audit-level high`：通過（無已知弱點）。
- `actionlint`：全部 workflow 通過。
- `git diff --check`：通過；Windows 僅顯示 LF／CRLF 轉換提醒。

## Known Issues

- 目前正式研究庫仍只有 1 篇，須等首批 workflow 成功後才有足夠內容供推薦發揮。
- 首次正式回補 run `30053995494` 在內容寫入前因 CommonJS top-level await 失敗；main 未產生內容變更。
- 第二次正式回補 run `30054244748` 因 Semantic Scholar 429 在內容寫入前中止；並行分類查詢需節流。
- 第三次正式回補 run `30054451274` 的第一筆 Semantic Scholar 請求仍為 429；公開 fallback 不應阻塞已有主要來源結果。
- 第四次正式回補 run `30054683057` 已進入 Gemini，但多次摘要／查核呼叫後因 429 在寫入前中止。
- `main` 尚未啟用 branch protection；排程依既有受控自動寫入規則更新研究內容。
- GitHub Actions 的第三方 actions 目前仍顯示 Node.js runtime 平台棄用警告，但 runner 以 Node.js 24 執行。

## Draft PR

https://github.com/migao2006/psychology-daily/pull/11
