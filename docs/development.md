# Development guide

## Environment

- Node.js 24（`.node-version` 與 `package.json`）
- pnpm 11.14（`packageManager` 與 frozen lockfile）

```bash
pnpm install --frozen-lockfile
pnpm dev
```

一般開發、內容閱讀與測試不需要環境變數。只有手動執行每日研究更新時才依 `.env.example` 提供安全環境變數；不得提交 `.env`。

## Executable scripts

`scripts/` 只保留直接入口：

- `fetch-papers.ts`：診斷來源候選；不寫入內容。
- `validate-content.ts`：驗證課程、研究索引與每日研究。
- `validate-research.ts`：只驗證研究內容。
- `update-daily-research.ts`：執行完整每日研究更新。

正規化、去重、排名、metadata 核對、合法公開版本與 summarizer 都由 `lib/research/` 提供。不要為每個函式建立一行式 script 轉接檔。

## Validation matrix

| 變更 | 最低驗證 |
| --- | --- |
| 只有 Markdown | 相對引用檢查、link check 適用範圍、`git diff --check` |
| TypeScript、設定、Prompt、內容或 workflow | `pnpm verify`、`git diff --check` |
| 路由、client interaction、IndexedDB 或使用者流程 | 上述加 `pnpm test:e2e` |
| 依賴或 lockfile | 上述加 `pnpm audit --audit-level high` |
| Cloudflare Worker | unit／契約檢查、staging 或明確授權後的健康檢查 |

`pnpm verify` 執行：

```bash
pnpm lint
pnpm typecheck
pnpm validate:content
pnpm test
pnpm build
```

CI 將步驟拆開，以保留失敗位置與日誌；E2E 在上述工作全部通過後執行。

## Git and Pull Requests

1. 閱讀 `AGENTS.md`、active TASK、CONTINUITY 與相關 docs。
2. 從最新 `main` 建立用途單一的功能分支。
3. 只修改 active work package 範圍，保留使用者既有未提交變更。
4. 以可理解的 commit 分隔結構、行為與交接狀態。
5. Push 功能分支並建立 Draft Pull Request。
6. 驗證與 review 完成後才由有權限的人合併；不得 force push 或自行繞過 branch protection。

Work package 的開始、完成與封存規則見 `tasks/README.md`。

## Generated and local files

以下內容不屬於版本庫：

- `node_modules/`
- `.next/`, `out/`, `build/`
- `coverage/`, `playwright-report/`, `test-results/`
- `.vercel/`
- `.env*`（只有 `.env.example` 例外）
- `next-env.d.ts`, `*.tsbuildinfo`
- `.tmp/` 與本機診斷 log

版本化的 `content/research/` 是可追蹤的產生內容，不是 disposable build artifact；只能經驗證流程更新。
