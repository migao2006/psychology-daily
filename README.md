# 每日心理學

每天約 10 分鐘學習一個心理學核心概念，再閱讀一篇近期英文心理學研究的繁體中文重點整理。網站免登入、手機優先；個人學習進度與研究偏好預設只保存在目前瀏覽器。

> 本專案是心理學教育與研究摘要工具，不是醫療、心理治療、危機處理或疾病診斷服務。

## 核心功能

- 30 堂依序前進的繁體中文心理學入門課，含證據、限制、測驗、解析與來源。
- 每日近期英文研究的繁中問題、方法、發現、一般意義、限制與閱讀提醒。
- 原始論文、DOI，以及通過合法公開版本檢查後才顯示的免費全文。
- 研究搜尋、可修改的本機偏好，以及只依明確偏好與已讀紀錄運算的可解釋推薦。
- 確定性間隔複習、Asia/Taipei 學習日與連續天數。
- IndexedDB 進度、嚴格 JSON 匯出／匯入、schema migration 與二次確認清除。
- 選用的 Cloudflare 端對端加密備份：免登入，以高強度復原碼更新、還原或刪除密文。
- 深色模式、字體放大、完整鍵盤操作與降低動態效果支援。

## 技術摘要

- Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4
- Dexie + IndexedDB；Zod strict schemas
- Vitest、Testing Library、fake-indexeddb、Playwright
- GitHub Actions 每日內容流程與 CI
- Vercel Production；Cloudflare Worker + Workers KV 選用密文備份

核心程式分層、資料流與變更邊界見 [架構文件](docs/architecture.md)。

## 快速開始

需求：Node.js 24、pnpm 11.14。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

開啟 `http://localhost:3000`。一般瀏覽與測試不需要 API key；只有每日研究更新需要來源 API 與 LLM 設定。

## 驗證

```bash
pnpm verify
pnpm test:e2e
pnpm audit --audit-level high
```

`pnpm verify` 依序執行 lint、TypeScript、內容 schema、Vitest 與 production build。CI 使用相同檢查且不設定 `ignoreBuildErrors`。完整命令與變更類型對應見 [開發指南](docs/development.md)。

## 內容與研究更新

人工課程位於 `content/lessons/`，每日流程不得修改。研究候選按 OpenAlex、Europe PMC、Crossref、Semantic Scholar fallback 取得，通過英文內容、必要 metadata、心理學相關性、去重、確定性排名、Crossref 核對與合法公開版本檢查後，才交由 LLM 整理。

LLM 只能接收已核對的來源欄位與英文摘要，不能自行搜尋或覆寫 metadata。輸出必須通過 provider JSON Schema、Zod 與 grounding 檢查；無合格候選或驗證失敗時保留最後正常內容。

- 來源、排名、英文優先與科學邊界：[內容來源與驗證](docs/content-sources.md)
- 課程、研究、IndexedDB 與備份 schema：[資料結構](docs/data-structures.md)
- Prompt 契約與修改流程：[Prompt registry](prompts/README.md)

## 隱私與安全

課程進度、測驗、研究偏好與閱讀紀錄保存在 IndexedDB；Local Storage 只保存主題、字體、上次頁面與新手說明狀態。搜尋字詞不會被記錄為興趣，也不會送到推薦服務。

使用者主動建立 Cloudflare 備份時，完整進度會先在瀏覽器以 AES-GCM 加密。Worker 只收到密文、隨機 IV 與更新時間，不收到解密金鑰。復原碼屬於持有人憑證：遺失後管理者也無法復原，交給他人則對方可解密備份。

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

- 研究歷史目前只有一筆；設定每日 Actions 後才會逐日累積，偏好與閱讀行為的排序差異也會逐步變明顯。
- 沒有來源摘要、無法核對 metadata 或沒有合格英文候選時不會為了更新而補造內容。
- 無痕模式、瀏覽器空間限制或清除網站資料都可能移除本機進度。
- Cloudflare 備份是使用者手動建立的加密快照，不是即時跨裝置同步。
- 教育內容不能取代合格專業人員的個別評估。
