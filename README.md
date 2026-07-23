# 每日心理學

每天約 10 分鐘學習一個心理學核心概念，再閱讀一篇近期英文心理學研究的繁體中文重點整理。網站手機優先；首次使用需建立或復原資料綁定，之後以端對端加密同步。

> 本專案是心理學教育與研究摘要工具，不是醫療、心理治療、危機處理或疾病診斷服務。

## 核心功能

- 30 堂依序前進的繁體中文心理學入門課，含證據、限制、測驗、解析與來源。
- 每日近期英文研究的繁中問題、方法、發現、一般意義、限制與閱讀提醒。
- 原始論文、DOI，以及通過合法公開版本檢查後才顯示的免費全文。
- 中英文、作者與 DOI 搜尋，可儲存的進階篩選，以及依明確偏好、主動回饋與已讀相似度運算的可解釋推薦。
- 確定性間隔複習、Asia/Taipei 學習日與連續天數。
- IndexedDB 同步快取、嚴格 JSON 匯出／匯入、schema migration 與二次確認清除。
- 強制 Cloudflare 端對端加密同步：高強度復原碼、單一 active device、取代舊裝置與自動同步。
- 深色模式、字體放大、完整鍵盤操作與降低動態效果支援。

## 技術摘要

- Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4
- Dexie + IndexedDB；Zod strict schemas
- Vitest、Testing Library、fake-indexeddb、Playwright
- GitHub Actions 每日內容流程與 CI
- Vercel Production；Cloudflare Worker + Workers KV 加密同步

核心程式分層、資料流與變更邊界見 [架構文件](docs/architecture.md)。

## 快速開始

需求：Node.js 24、pnpm 11.14。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

開啟 `http://localhost:3000`。產品流程需要可用的 Cloudflare sync API；內容瀏覽不需要 LLM key，只有每日更新與回補工作流程需要來源 API 與 LLM 設定。

## 驗證

```bash
pnpm verify
pnpm test:e2e
pnpm audit --audit-level high
```

`pnpm verify` 依序執行 lint、TypeScript、內容 schema、Vitest 與 production build。CI 使用相同檢查且不設定 `ignoreBuildErrors`。完整命令與變更類型對應見 [開發指南](docs/development.md)。

## 內容與研究更新

人工課程位於 `content/lessons/`，每日流程不得修改。每日研究候選按 OpenAlex、Europe PMC、Crossref、Semantic Scholar fallback 取得；獨立手動回補流程會聚合四個來源，分批回補最近 180 天內容，目標 100 篇並兼顧分類覆蓋與預印本比例。候選通過英文內容、必要 metadata、心理學相關性、去重、確定性排名、Crossref 核對與合法公開版本檢查後，才交由 LLM 整理。

LLM 只能接收已核對的來源欄位與英文摘要，不能自行搜尋或覆寫 metadata。輸出必須通過 provider JSON Schema、Zod、確定性 grounding 與第二次結構化摘要查核；無合格候選或驗證失敗時保留最後正常內容。

- 來源、排名、英文優先與科學邊界：[內容來源與驗證](docs/content-sources.md)
- 課程、研究、IndexedDB 與備份 schema：[資料結構](docs/data-structures.md)
- Prompt 契約與修改流程：[Prompt registry](prompts/README.md)

## 隱私與安全

課程進度、測驗、研究偏好、互動與介面設定都包含在加密同步 payload；IndexedDB 只作目前裝置的快取。專案不使用 Local Storage 或 Session Storage。搜尋字詞不會自動記錄為興趣；只有使用者主動儲存篩選或加入偏好時才保存。

完整資料在瀏覽器以 AES-GCM 加密後才同步。Worker 只收到密文、隨機 IV、裝置識別與版本資訊，不收到解密金鑰。同一復原碼只允許一台 active device；新裝置復原會停用舊裝置。復原碼遺失後管理者也無法找回，交給他人則對方可解密並取代裝置綁定。

專案不預設加入帳號、分析、廣告或行為追蹤。不得把 `.env`、API key、復原碼或授權標頭提交到版本庫。

## 文件導覽

文件的唯一責任與閱讀順序集中在 [docs/README.md](docs/README.md)：

- [架構與模組邊界](docs/architecture.md)
- [本機開發、測試與 Git 流程](docs/development.md)
- [Vercel、GitHub Actions、Cloudflare 與 Secrets](docs/operations.md)
- [內容來源與驗證](docs/content-sources.md)
- [資料結構](docs/data-structures.md)
- [Repository 長期規則](AGENTS.md)
- [Work package lifecycle](tasks/README.md)

## 已知限制

- Repository 只含一筆種子研究；需由獨立回補 workflow 分批建立 100 篇已驗證研究庫，避免在功能 PR 中提交未經 API 與 LLM 查核的內容。
- 沒有來源摘要、無法核對 metadata 或沒有合格英文候選時不會為了更新而補造內容。
- 離線時可使用已綁定裝置的快取，但首次使用或裝置被取代時必須連線。
- 單一 active device 是刻意的安全邊界，不提供同時多裝置編輯或自動合併衝突。
- 教育內容不能取代合格專業人員的個別評估。
