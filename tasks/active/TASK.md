# Production polish and release

## Goal

完成目前網站的手機 UI 精修、同步與主要流程除錯、部署合理性修正，通過完整驗證後依使用者授權更新 `main` 與 Production。

## Scope

- 稽核並改善首次綁定、今日、研究、進度與複習中心的手機／桌面體驗。
- 修正可重現的功能、無障礙、同步與部署切換問題。
- 讓 Cloudflare Worker 在正式切換期間兼容既有 v1 與新版 v2。
- 執行 Repository 規定驗證、瀏覽器端到端驗收與正式部署驗收。
- 以 Pull Request／可追蹤 Commit 更新 `main`，不得 force push。

## Non-goals

- 不改寫課程內容、推薦權重或間隔複習規則。
- 不新增登入、聊天、診斷、廣告或追蹤分析。
- 不為目錄美觀進行無關重構。

## Acceptance

- UI 在 320px、390px 與桌面寬度可操作，無水平溢位、遮擋、主控台錯誤。
- 強制綁定、加密同步、研究搜尋／偏好與複習中心流程可用。
- Worker v1/v2 相容行為有測試，正式部署切換不破壞既有備份。
- `pnpm verify`、`pnpm test:e2e`、`pnpm audit --audit-level high`、`git diff --check` 全部通過。
- `main`、GitHub Actions 與 Vercel Production 均指向已驗證 Commit。
