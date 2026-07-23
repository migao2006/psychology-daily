# Production polish and release

## Goal

完成網站手機 UI 精修、同步與主要流程除錯、部署切換保護，並將通過驗證的堆疊變更發布至 `main` 與 Production。

## Completed

- 修正 320px 進度頁水平溢位、窄螢幕研究 metadata 斷字與標題孤字換行。
- 將桌面主要導覽移入頂部列，保留手機底部導覽，並以可存取 SVG 圖示取代佔位字元。
- 防止綁定、復原與確認操作重複送出；加入復原碼複製與失敗回饋。
- 讓已綁定裝置可離線讀取 IndexedDB 快取，並在恢復連線後協調未同步資料。
- 區分自動雲端快照與使用者手動本機備份時間。
- 讓 Cloudflare Worker 同時支援隔離儲存的 v1／v2 API，避免正式切換中斷既有備份。
- 新增 Worker 相容性、備份時間語意與 320px 溢位測試。
- 依序合併 PR #2、#3、#4、#5，更新 `main` 與 Vercel Production。

## Validation

- `pnpm verify`：通過；11 個 Vitest files、50 tests、40 個靜態頁面。
- `pnpm test:e2e`：通過；1 個完整 320px 學習、研究與備份流程。
- `pnpm audit --audit-level high`：通過；沒有已知漏洞。
- `git diff --check`：通過。
- GitHub CI：成功，含 verify 與 Playwright E2E。
- Vercel Preview／Production：Ready。
- Production 瀏覽器驗收：320px 與 1440px 無水平溢位或導覽遮擋；綁定、跨裝置復原、舊裝置停用、研究詳細頁、DOI 與免費全文連結均通過。
- Cloudflare Worker：Production v1／v2 health 通過；不允許來源正確回傳 403；驗收測試資料已刪除並確認 404。

## Release

- Main commit：`02a01072c09b3bd1fa7e60b5d0aaf1af1a70cecf`
- Release PR：https://github.com/migao2006/psychology-daily/pull/5
- Production：https://psychology-daily.vercel.app
- Worker version：`60f03e34-37c0-41dd-922a-610e998d62db`
