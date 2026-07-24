# Operations

## Vercel

- Git repository：`migao2006/psychology-daily`
- Framework：Next.js；Root Directory 為 repository root
- Install：`pnpm install --frozen-lockfile`
- Build：`pnpm build`
- Production Branch：`main`

不要在 Vercel 設定 LLM API key。Git 整合會為功能分支／Pull Request 建立 Preview，推送 `main` 才建立 Production Deployment。

## GitHub Actions

### CI

`.github/workflows/ci.yml` 在 Pull Request、`main` push 與手動執行時，使用 Node 24 與 pnpm 11.14 安裝 frozen lockfile，依序執行 lint、typecheck、內容驗證、Vitest、安全稽核與 production build；通過後才執行 Chromium Playwright。

### Daily research update

`.github/workflows/update-daily-research.yml` 每日 `22:00 UTC`（Asia/Taipei 約 06:00）與 `workflow_dispatch` 執行。它有單一 concurrency group、timeout、429／5xx 指數退避、失敗保留最後內容、無空 commit、無 force push，且只 stage `content/research/`。

手動執行：GitHub → **Actions** → **Update daily research** → **Run workflow** → Branch `main` → **Run workflow**。

### Research library backfill

`.github/workflows/backfill-research.yml` 每日 `18:00 UTC`（Asia/Taipei 約 02:00）執行，也支援 `workflow_dispatch`。每批最多新增 50 篇，從最近 180 天開始搜尋；連續三批無進展後改查最近 365 天，再連續三批無進展則將 campaign 標示為 `stalled`。達到 100 篇後狀態改為 `completed`，後續排程會略過。

每批必須通過 lint、typecheck、內容 schema、Vitest、安全稽核與 production build；workflow 重新確認 `main` 沒有在執行期間改變後，才只提交 `content/research/` 並推送 `main`。回補與每日更新共用 concurrency group，避免同時寫入；沒有內容差異、驗證失敗或來源暫時錯誤都不會 commit，也不 force push。

手動執行：GitHub → **Actions** → **Backfill research library** → **Run workflow** → 選擇 `batch_size`；`dry_run` 可驗證但不提交，`force_retry` 可在人工檢查後重新啟動 `stalled` campaign。每篇摘要會做第二次獨立結構化查核，因此正常使用兩次 LLM 請求；Gemini 呼叫至少間隔 6.5 秒，Groq 至少間隔 30 秒。Groq 回傳暫時性錯誤時不在同一 provider 長時間等待，而是立即切換至設定的 Gemini fallback，狀態、日期窗與永久拒絕候選保存在 `content/research/backfill-state.json`。

### Link check

`.github/workflows/link-check.yml` 每週、手動及相關 Pull Request 檢查 README、Repository guides、docs、Prompt 文件、TASK／CONTINUITY 與內容 JSON 的網址。

三個 workflow 的第三方 actions 固定到完整 commit SHA；唯讀 workflow 的 checkout 不保留 Git 認證。

## Variables and Secrets

設定路徑：GitHub → Repository → **Settings** → **Secrets and variables** → **Actions**。

Repository variables：

- `LLM_PROVIDER`：`groq`、`gemini` 或 `openai`
- `LLM_MODEL`：所選 provider 帳號中支援結構化輸出的模型名稱
- `GEMINI_FALLBACK_MODEL`：主要 provider 為 Groq 時選用的 Gemini 備援模型

Repository secrets：

- `GROQ_API_KEY`、`GEMINI_API_KEY` 或 `OPENAI_API_KEY`：至少設定與 provider 對應的一個
- `UNPAYWALL_EMAIL`：Unpaywall 自動用戶端識別
- `OPENALEX_API_KEY`：選用，提高 OpenAlex 額度

沒有 provider、model 或對應 LLM key 時，更新會明確失敗且不提交。Secrets 只提供給設定檢查及研究更新步驟，不提供給 Vercel、瀏覽器、套件安裝、lint、測試或 build。

## Cloudflare encrypted sync

- Worker：`psychology-daily-backup`
- Workers KV：`psychology-daily-encrypted-backups`
- Endpoint：`https://psychology-daily-backup.a0912647176.workers.dev`
- Source：`cloudflare/backup-worker/`

Worker 綁定 `BACKUPS` KV 與 `BACKUP_RATE_LIMITER`。v2 API 提供 bind、帶 revision 的 PUT、GET 與 DELETE；每組復原碼只允許一個 active device。正式 API 只允許 `https://psychology-daily.vercel.app`，另保留設定中列出的本機 origin；修改正式網域時必須同步更新 allowlist。

正式切換期間 Worker 同時保留 v1 加密備份 API；v1 與 v2 使用不同 KV key 前綴，不會互相覆寫。發布順序為：先部署通過 v1／v2 相容測試的 Worker，再合併新版前端至 `main`，確認 Production 已使用 v2 後才可於另一個工作包評估移除 v1。不得先部署只支援 v2 的 Worker，避免尚未更新的瀏覽器失去備份功能。

Staging Worker 可用純文字 binding `STAGING_ORIGIN` 額外允許一個 Vercel Preview branch alias；正式環境不得設定此 binding。Staging 必須使用獨立 KV，不能讀寫正式密文。

部署設定不含 API token、復原碼或解密金鑰。只有在工作包明確授權部署時，才使用已授權 Cloudflare 帳號執行 `wrangler deploy`。

## Manual local research update

安全載入 `.env.example` 所列的來源 API 與 LLM 環境變數後執行：

```bash
pnpm update:research
BACKFILL_BATCH_SIZE=50 pnpm backfill:research
pnpm verify
```

正常維運優先使用 GitHub Actions，讓擷取、驗證、commit 與 Vercel 部署在同一條可追蹤流程完成。

## Troubleshooting

- `ERR_PNPM_OUTDATED_LOCKFILE`：執行 `pnpm install`，檢查並提交預期的 lockfile 變更。
- 缺少 provider：設定 `LLM_PROVIDER`、`LLM_MODEL` 與一個對應的 Actions secret。
- `no_suitable_paper`：代表 14／30 天候選沒有通過門檻，不是資料遺失；最後正常內容仍保留。
- `backfill-state.json` 為 `stalled`：查看 Actions summary 與拒絕原因；確認來源／模型設定後，以 `force_retry` 手動重啟。不要刪除拒絕清單以反覆處理同一筆永久無效候選。
- Vercel 找不到專案：確認 repository root、Next.js preset 與 `main` Production Branch。
- 匯入被拒：確認檔案由本網站目前 schema 匯出且沒有修改或未知欄位。
- Cloudflare 403：先確認 origin allowlist 與完整復原碼；409 `device_replaced` 表示這台裝置已被新裝置取代，409 `revision_conflict` 表示須先重新載入雲端版本。
