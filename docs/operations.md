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

`.github/workflows/backfill-research.yml` 只支援 `workflow_dispatch`，每批最多新增 10 篇最近 180 天的研究。內容在 `content/research-backfill-180d` 持續分支累積並建立 Draft PR；完整驗證失敗、沒有內容差異或達到 100 篇時不提交。

手動執行：GitHub → **Actions** → **Backfill research library** → **Run workflow** → 選擇 `batch_size` → **Run workflow**。每批會對摘要再做一次獨立結構化查核，因此會使用兩次 LLM 請求／篇。

### Link check

`.github/workflows/link-check.yml` 每週、手動及相關 Pull Request 檢查 README、Repository guides、docs、Prompt 文件、TASK／CONTINUITY 與內容 JSON 的網址。

三個 workflow 的第三方 actions 固定到完整 commit SHA；唯讀 workflow 的 checkout 不保留 Git 認證。

## Variables and Secrets

設定路徑：GitHub → Repository → **Settings** → **Secrets and variables** → **Actions**。

Repository variables：

- `LLM_PROVIDER`：`gemini` 或 `openai`
- `LLM_MODEL`：所選 provider 帳號中支援結構化輸出的模型名稱

Repository secrets：

- `GEMINI_API_KEY` 或 `OPENAI_API_KEY`：只設定與 provider 對應的一個
- `UNPAYWALL_EMAIL`：Unpaywall 自動用戶端識別
- `OPENALEX_API_KEY`：選用，提高 OpenAlex 額度

沒有 provider、model 或對應 LLM key 時，更新會明確失敗且不提交。Secrets 只提供給設定檢查及研究更新步驟，不提供給 Vercel、瀏覽器、套件安裝、lint、測試或 build。

## Cloudflare encrypted sync

- Worker：`psychology-daily-backup`
- Workers KV：`psychology-daily-encrypted-backups`
- Endpoint：`https://psychology-daily-backup.a0912647176.workers.dev`
- Source：`cloudflare/backup-worker/`

Worker 綁定 `BACKUPS` KV 與 `BACKUP_RATE_LIMITER`。v2 API 提供 bind、帶 revision 的 PUT、GET 與 DELETE；每組復原碼只允許一個 active device。正式 API 只允許 `https://psychology-daily.vercel.app`，另保留設定中列出的本機 origin；修改正式網域時必須同步更新 allowlist。

部署設定不含 API token、復原碼或解密金鑰。只有在工作包明確授權部署時，才使用已授權 Cloudflare 帳號執行 `wrangler deploy`。

## Manual local research update

安全載入 `.env.example` 所列的來源 API 與 LLM 環境變數後執行：

```bash
pnpm update:research
BACKFILL_BATCH_SIZE=5 pnpm backfill:research
pnpm verify
```

正常維運優先使用 GitHub Actions，讓擷取、驗證、commit 與 Vercel 部署在同一條可追蹤流程完成。

## Troubleshooting

- `ERR_PNPM_OUTDATED_LOCKFILE`：執行 `pnpm install`，檢查並提交預期的 lockfile 變更。
- 缺少 provider：設定 `LLM_PROVIDER`、`LLM_MODEL` 與一個對應的 Actions secret。
- `no_suitable_paper`：代表 14／30 天候選沒有通過門檻，不是資料遺失；最後正常內容仍保留。
- Vercel 找不到專案：確認 repository root、Next.js preset 與 `main` Production Branch。
- 匯入被拒：確認檔案由本網站目前 schema 匯出且沒有修改或未知欄位。
- Cloudflare 403：先確認 origin allowlist 與完整復原碼；409 `device_replaced` 表示這台裝置已被新裝置取代，409 `revision_conflict` 表示須先重新載入雲端版本。
