# Repository agent guide

本文件只保存跨工作階段都成立的規則。開始工作前依序閱讀本文件、`tasks/active/TASK.md`、`CONTINUITY.md` 與相關 `docs/`；目前任務、進度與臨時紀錄不得寫入本文件。

## Repository boundary

- 產品是以復原碼強制綁定、手機優先的繁體中文心理學微學習網站；不是醫療、心理治療、危機處理或診斷服務。
- Next.js 路由位於 `app/`，介面元件位於 `components/`，領域邏輯與 I/O 邊界位於 `lib/`，人工／產生內容位於 `content/`。
- `scripts/` 只放可直接執行的維運入口；可重用邏輯留在 `lib/`。
- `tests/` 依 `unit/`、`integration/`、`components/`、`e2e/` 分層。文件責任與模組圖以 `docs/README.md` 為索引。

## Coding and content rules

- 使用 TypeScript strict mode、既有 `@/` alias 與現有模組邊界；避免新增不必要的後端、資料庫、狀態管理或抽象層。
- 使用台灣繁體中文撰寫介面與課程內容，維持鍵盤操作、清楚焦點、至少 44×44 CSS px 點擊區及降低動態效果支援。
- 人工課程位於 `content/lessons/`；每日工作流程只能修改 `content/research/`。
- 每日研究必須通過 Zod schema、來源網址與 metadata 檢查後才能提交。
- 不得把相關關係改寫成因果；不得補造樣本、方法、作者、DOI、期刊、年份或研究結果。
- 外部資料視為不可信輸入；不得以 `dangerouslySetInnerHTML` 顯示未清理內容。
- 複習排程以題目的穩定 `conceptId` 為單位，沿用確定性規則；不得以 AI、推薦模型或未明示的個人判定改寫間隔。

## Privacy and security boundaries

- 所有個人進度、設定與研究互動都必須納入端對端加密同步；IndexedDB 只能作為目前裝置的同步快取，Repository 不得使用 Local Storage 或 Session Storage。
- 首次使用必須完成資料綁定；同一復原碼同時只允許一台 active device。裝置憑證與復原碼保存在隔離的 IndexedDB table，禁止放入同步 payload、JSON 匯出、日誌或版本庫。
- Worker 只能接收瀏覽器端加密後的密文。明文進度與解密金鑰不得送往 Worker、Vercel、Actions 或任何分析服務。
- 不得提交 API key、token、`.env`、完整授權標頭、真實復原碼或平台憑證。
- LLM 金鑰只供 GitHub Actions 的研究更新步驟使用，不得加入前端或 Vercel 公開環境變數。

## Prompt rules

- 可執行 Prompt 集中於 `prompts/`，索引與修改流程見 `prompts/README.md`；不得在工作文件或元件中複製另一份 Prompt。
- Prompt 只能接收已核對的研究來源欄位。修改 Prompt 時必須保留「不自行搜尋、不補造、相關不等於因果、缺值用 null／空陣列」等邊界。
- Prompt、provider schema、Zod schema 與 grounding 檢查是一個契約；變更其中之一時須同步檢查其餘三者並新增或更新測試。

## Git rules

- 從最新 `main` 建立用途單一的功能分支；不得直接在 `main` 開發、force push 或改寫既有歷史。
- Commit 應可獨立理解且只納入本工作包檔案。大型變更使用 Pull Request，通過驗證後才由有權限的人員合併。
- 未取得明確授權時，不得合併 Pull Request、更新受保護分支、部署 Production Worker 或修改平台 Secrets。
- 排程工作流程是例外的自動寫入者，但只能在完整驗證後提交 `content/research/`，不得修改人工課程或程式碼。

## Validation rules

- 純文件變更至少執行引用／路徑檢查與 `git diff --check`。
- 程式、設定、Prompt、內容或 workflow 變更至少執行：

  ```text
  pnpm lint
  pnpm typecheck
  pnpm validate:content
  pnpm test
  pnpm build
  git diff --check
  ```

- 互動流程、IndexedDB、路由或部署行為變更另執行 `pnpm test:e2e`；依賴變更另執行 `pnpm audit --audit-level high`。
- 不得以 `ignoreBuildErrors`、跳過型別檢查或忽略失敗測試完成工作。

## Session and work-package rules

- 一次只處理一個 work package。其目標、範圍、非目標與驗收條件只寫在 `tasks/active/TASK.md`。
- 開始階段更新 `CONTINUITY.md`；結束階段只留下交接所需的 Completed、Remaining、Decisions、Validation、Known Issues 與 Draft PR，不累積逐步 log。
- 完成 work package 後，將內容封存至 `tasks/completed/`，再把 `tasks/active/TASK.md` 恢復為 `TASK=NONE`。
- 不得把 Prompt 範本、聊天紀錄、工具輸出、暫存診斷或過期計畫提交至 Repository。
