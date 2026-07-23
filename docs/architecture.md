# Architecture

## Product boundary

每日心理學是靜態內容為主的 Next.js 微學習網站。一般瀏覽不需要應用程式後端；只有 GitHub Actions 在建置前產生研究內容，以及使用者主動操作時才呼叫獨立的 Cloudflare 加密備份 API。

不在產品邊界內的能力包括帳號、診斷、AI 聊天、伺服器端個人化、追蹤分析與未加密的雲端進度。

## Module ownership

| 路徑 | 責任 | 依賴方向 |
| --- | --- | --- |
| `app/` | App Router 頁面、metadata、route composition | 組合 `components/` 與 `lib/content/` |
| `components/` | 可存取的 server/client UI 與使用者互動 | 呼叫公開的 `lib/` 函式，不直接解析內容 JSON |
| `lib/content/` | 將版本化 JSON 載入並通過 Zod | 依賴 `content/` 與 `lib/schemas/` |
| `lib/db/` | Dexie、備份、偏好與 IndexedDB I/O | 依賴 schema 與純領域函式 |
| `lib/research/` | 擷取、正規化、去重、排名、核對、推薦與更新 | 不依賴 UI |
| `lib/dates/`, `lib/progress/`, `lib/review/` | 可測試的純日期／學習規則 | 不依賴 UI 或網路 |
| `lib/schemas/` | 所有內容與本機資料的 runtime contract | 位於資料邊界中央 |
| `prompts/` | 可執行 LLM Prompt 與變更契約 | 由研究 summarizer 使用 |
| `scripts/` | 可直接執行的維運入口 | 只協調 `lib/`，不複製實作 |
| `content/lessons/` | 人工審查課程 | 不得由自動工作流程改寫 |
| `content/research/` | 驗證後的每日產生內容與索引 | 只由研究更新流程寫入 |
| `cloudflare/backup-worker/` | 不持有解密金鑰的密文儲存 API | 與 Next.js deploy 分離 |
| `tests/` | unit、integration、component、E2E 驗證 | 對應上述邊界而非複製實作 |

`app/` 與 `components/` 不應成為領域邏輯的唯一位置；可重用規則先放入 `lib/`。反向依賴（例如 `lib/` import UI）不允許。

## Content flow

### Lessons

`content/lessons/*.json` → `lib/schemas/lesson.ts` → `lib/content/lessons.ts` → 課程頁與測驗元件。

課程是人工內容。變更必須保留穩定 ID、sequence、reference 與 quiz concept ID，避免破壞既有 IndexedDB 進度。

### Daily research

GitHub Actions → source APIs → normalize／filter／deduplicate → deterministic rank → Crossref metadata verification → Unpaywall open-access lookup → Prompt + structured LLM output → Zod／grounding／URL checks → `content/research/` → CI → commit `main` → Vercel。

任何失敗都發生在寫入前；最後正常內容仍可由網站建置與顯示。詳細來源與限制見 `docs/content-sources.md`。

## Browser data flow

Client components → `lib/db/` → IndexedDB 保存課程、活動、已讀研究、偏好與 metadata。Local Storage 只保存介面選項。

研究推薦由 `lib/research/recommend.ts` 在瀏覽器以內容、明確偏好及本機已讀資料計算，沒有跨使用者資料。搜尋只過濾已載入內容，不寫入偏好。

選用備份流程為：Zod 驗證匯出 → 瀏覽器產生復原碼 → AES-GCM 加密 → Worker 儲存密文。還原時順序相反，明文再次通過 schema 後才寫入 IndexedDB。

## Deployment boundary

- Vercel：Next.js 前端；Production Branch 是 `main`。
- GitHub Actions：CI、每日研究產生及 link check；LLM key 只存在 Actions。
- Cloudflare：選用備份 API；部署與 secrets 權限獨立於前端。

平台操作、環境變數與故障流程見 `docs/operations.md`。
