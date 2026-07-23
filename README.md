# 每日心理學

每天約 10 分鐘學習一個心理學核心概念，再閱讀一篇近期英文心理學研究的繁體中文重點整理。網站免登入、手機優先，個人課程、測驗、複習與閱讀紀錄只保存在使用者目前裝置的 IndexedDB。

> 本專案為心理學教育與研究摘要工具，不是醫療、心理治療、危機處理或疾病診斷服務。

## 核心功能

- 30 堂依序前進的繁體中文心理學入門課，每課約 5–8 分鐘。
- 每課包含定義、白話說明、生活情境、誤解、研究證據、限制、應用、3 題測驗、解析與來源。
- 每日近期英文研究：繁中問題、方法、發現、一般意義、限制、閱讀提醒與關鍵詞。
- 搜尋本站研究庫，並依主題、研究類型、同儕審查與免費全文偏好排序。
- 可解釋的本機推薦：明確偏好優先，再參考使用者主動標記的已讀研究；不追蹤停留時間、不把紀錄送至推薦伺服器。
- 原始論文、DOI 與通過合法公開版本檢查後才顯示的免費全文。
- 確定性間隔複習：答錯 1 天；連續答對 3、7、14、30 天，並納入確定程度與過去錯誤。
- IndexedDB 進度、JSON 匯出／匯入、schema 驗證、v1→v2 migration、二次確認清除。
- 選用的 Cloudflare 端對端加密備份：免登入，以高強度復原碼更新、還原或刪除密文。
- Asia/Taipei 日期與連續學習、深色模式、字體放大、鍵盤／螢幕閱讀器支援。
- 無帳號、無廣告、無追蹤分析、無前端 API key；選用雲端備份只保存端對端加密密文。

## 技術架構

- Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4
- pnpm lockfile
- Dexie + IndexedDB；Local Storage 僅存主題、字體、上次頁面與新手說明狀態
- Zod 嚴格 schema
- Vitest、Testing Library、fake-indexeddb、Playwright
- GitHub Actions：CI、每日研究更新、連結檢查
- Vercel Production，`main` 為 Production Branch
- Cloudflare Worker + Workers KV：僅保存由瀏覽器以 AES-GCM 加密的選用備份

## 本機開發

需求：Node.js 20.9 以上、pnpm 11。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

開啟 `http://localhost:3000`。日常瀏覽不需任何環境變數；研究更新才需要 API 設定。

## 測試與 Build

```bash
pnpm lint
pnpm typecheck
pnpm validate:content
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm audit --audit-level high
pnpm build
```

CI 不使用 `ignoreBuildErrors`，不略過型別檢查，也不會在測試失敗時部署。

## Vercel 部署

1. 在 Vercel Import Git Repository 選擇 `migao2006/psychology-daily`。
2. Framework Preset 選 Next.js，Root Directory 保持專案根目錄。
3. Install Command：`pnpm install --frozen-lockfile`。
4. Build Command：`pnpm build`；Output 由 Next.js preset 管理，不指定自訂資料夾。
5. Production Branch 設 `main`。
6. Vercel 不需要、也不應設定 LLM API key；每日摘要在 GitHub Actions 執行。

Git 整合後，推送 `main` 會自動建立 Production Deployment；其他分支與 Pull Request 建立 Preview。

## Cloudflare 加密備份

前端仍由 Vercel 提供；選用備份 API 獨立部署於：

- Worker：`psychology-daily-backup`
- Workers KV：`psychology-daily-encrypted-backups`
- 正式端點：`https://psychology-daily-backup.a0912647176.workers.dev`
- 原始碼與設定：`cloudflare/backup-worker/`

Worker 綁定 `BACKUPS` KV 與每 IP 每分鐘 20 次的 `BACKUP_RATE_LIMITER`。部署設定不含 API token 或復原碼；以已授權 Cloudflare 帳號執行 `wrangler deploy` 即可更新。正式 API 只允許 `https://psychology-daily.vercel.app`，另保留列出的本機開發 origin。修改正式網域時需同步更新 Worker allowlist。

## GitHub Actions

### CI

`.github/workflows/ci.yml` 在 Pull Request、`main` push 與手動執行時安裝 frozen lockfile，依序執行 lint、typecheck、內容驗證、Vitest、安全稽核與 production build；上述檢查通過後，再以 Chromium 執行 Playwright 端對端測試。

### 每日研究更新

`.github/workflows/update-daily-research.yml` 每日 `22:00 UTC`（台灣約 06:00）與 `workflow_dispatch` 執行。流程具單一 concurrency group、完成推送所需的 `contents: write` 權限、timeout、429／5xx 指數退避、無空 commit、無 force push與失敗保護。LLM 與來源 API secrets 只提供給設定檢查及研究更新步驟，不提供給套件安裝、lint、測試或 build。

手動執行：GitHub → **Actions** → **Update daily research** → **Run workflow** → Branch 選 `main` → **Run workflow**。

### 連結檢查

`.github/workflows/link-check.yml` 每週、手動與內容相關 Pull Request 檢查 README、課程與研究 HTTPS 連結。

三個 workflow 使用的 actions 都固定到完整 commit SHA；唯讀工作流程的 checkout 不保留 Git 認證。

## 資料來源與選擇規則

候選依序使用 OpenAlex、Europe PMC、Crossref；OpenAlex 可涵蓋 PsyArXiv 等可信預印本。通過必要欄位與心理學相關性檢查後，以 DOI 與正規化標題去重，Crossref 核對 metadata，Unpaywall 尋找合法公開全文。

預設搜尋最近 14 天；無合格候選再擴大至 30 天。仍無結果時保留最後正常研究並記錄 `no_suitable_paper`，不得用新聞或虛構資料替代。

確定性排名滿分 100：

- 心理學相關性 25
- 發表新穎度 20
- 摘要與資料完整度 15
- 研究設計資訊 15
- 已同儕審查 10
- 合法公開全文 10
- 近期主題多樣性 5

英文標題／摘要是必要優先條件；引用次數不參與新論文主要排名。研究類型優先順序包含系統性回顧、統合分析、Registered Report、隨機試驗、縱貫、實驗與觀察研究。預印本永遠明確標示尚未正式同儕審查。

更多細節見 [`docs/content-sources.md`](docs/content-sources.md) 與 [`docs/data-structures.md`](docs/data-structures.md)。

## API、Variables 與 Secrets

先複製 `.env.example`，不得提交 `.env` 或真實金鑰。

GitHub → Repository → **Settings** → **Secrets and variables** → **Actions**：

Repository variables：

- `LLM_PROVIDER`：`gemini` 或 `openai`
- `LLM_MODEL`：帳號中支援結構化輸出的模型名稱，不在程式中硬編碼

Repository secrets：

- `GEMINI_API_KEY` 或 `OPENAI_API_KEY`：只設定與 provider 相符的一個
- `UNPAYWALL_EMAIL`：Unpaywall 識別用電子信箱
- `OPENALEX_API_KEY`：選用，提高 OpenAlex 額度

沒有可用 LLM key 時，工作流程會明確失敗、保留最後正常內容且不提交。Secrets 只在 Actions runner 使用，不傳給 Vercel或瀏覽器。

## AI 摘要限制

LLM 只收到來源 API 的標題、作者、出版資訊、DOI、英文摘要與正規化研究類型。模型不能自行搜尋，且不能決定或覆寫作者、日期、DOI、網址、期刊、審查狀態等 metadata。

輸出需同時通過 provider JSON Schema 與 Zod。原文沒有的樣本欄位必須為 `null`；程式會拒絕摘要中未出現在來源的樣本數。相關研究必須使用關聯語言，推論限制需標示「根據研究設計推論」。

## 本機資料、Migration 與隱私

Dexie 資料庫 `psychology-daily` schemaVersion 2 包含：

- `lessonProgress`
- `activities`
- `readResearch`
- `meta`（包含研究偏好；不放在 Local Storage）

匯入只接受小於 2 MB、固定 app 名稱、schemaVersion 2 與無未知欄位的純 JSON；不會執行檔案內容。清除需兩次確認。

預設資料只保存在目前裝置及瀏覽器。使用者主動建立 Cloudflare 備份時，瀏覽器會產生 256-bit AES 金鑰與 128-bit 隨機定位碼，先以 AES-GCM 加密完整 Zod 驗證備份，再將密文送至 `psychology-daily-backup` Worker。完整復原碼包含定位碼與解密金鑰；Cloudflare 不會收到解密金鑰，也無法讀取課程、測驗、閱讀紀錄或研究偏好。

復原碼屬於持有人憑證：遺失後無法復原，交給他人則對方可以解密備份。Worker 限制正式站與本機開發來源、請求大小與速率，更新／刪除需由金鑰衍生的寫入憑證。使用者可在進度頁刪除遠端密文。專案不預設加入分析、廣告或行為追蹤；Cloudflare 與 Vercel 仍會依其基礎設施政策處理網路連線資料（例如 IP 與安全日誌）。

### 個人化推薦演算法

推薦為確定性內容式排序，不使用 AI、協同過濾或其他使用者資料：

- 明確偏好 55%：分類、研究類型、同儕審查與合法免費全文
- 已讀相似度 30%：分類、研究類型與關鍵詞；30 天半衰期
- 新穎度 10%：以收錄日期計算，90 天半衰期
- 主題探索 5%：提高不同於最近三篇已讀內容的主題

已閱讀研究會降低排序。分數相同時依收錄日期與研究 ID 固定排序，每張卡會顯示實際加分原因。搜尋支援繁中／英文標題、作者、期刊、分類、關鍵詞、研究問題、方法與發現，採 Unicode NFKC 正規化；搜尋字詞本身不會被記錄為興趣。

## 已知限制

- 初始研究歷史只有一筆經 Crossref 核對的種子資料；設定 Actions 後才會逐日累積。
- 研究庫累積到多篇前，偏好與閱讀行為對排序的可見差異有限；網站不會為了展示推薦而加入未驗證論文。
- 種子研究僅依摘要整理，原摘要未提供樣本數，因此欄位保留 `null`。
- Unpaywall 需要識別電子信箱；未設定或未找到合法版本時不顯示免費全文。
- 瀏覽器無痕模式、儲存空間限制或清除網站資料都可能移除進度。
- Cloudflare 備份是使用者手動建立的加密快照，不是跨裝置即時同步；若遺失復原碼，管理者也無法解密或找回。
- 教育內容不取代合格專業人員的個別評估。

## 故障排除

- `ERR_PNPM_OUTDATED_LOCKFILE`：執行 `pnpm install` 並提交更新後的 lockfile。
- 每日更新顯示缺少 provider：依上方路徑設定 repository variables 與一個 API secret。
- `no_suitable_paper`：不是故障；代表 14／30 天候選未通過品質門檻，最後正常內容仍在。
- Vercel build 找不到專案：確認 Root Directory 為 repository root、Framework 為 Next.js。
- 匯入被拒：確認檔案由本網站 schemaVersion 2 匯出且未被修改。

## 手動執行每日更新

本機可在設定安全環境變數後執行：

```bash
pnpm update:research
pnpm validate:content
pnpm test
pnpm build
```

正常維運建議從 GitHub Actions 手動執行，讓測試、提交與 Vercel 自動部署在同一條可追蹤流程完成。
