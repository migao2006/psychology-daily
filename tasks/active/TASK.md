# Work Package: Repository maintenance foundation

## Goal

在不重寫功能、不修改產品邏輯的前提下，依現有 Repository 建立可長期維護、持續開發與多人／AI 協作的最小架構。

## Scope

- 盤點模組、內容、測試、workflow、文件、設定、Prompt 與 generated files。
- 整理長期 `AGENTS.md`、work package lifecycle 與 `CONTINUITY.md`。
- 建立文件責任索引，修正文件與實作不一致。
- 集中研究摘要 Prompt，保留既有 provider、schema 與 grounding 行為。
- 移除確認未使用的樣板資產與無引用轉接檔。
- 執行完整驗證，推送功能分支並建立 Draft Pull Request。

## Non-goals

- 不新增產品功能、不修改推薦、學習、備份或每日研究邏輯。
- 不重新設計既有 `app/`、`components/`、`lib/`、`content/`、`tests/` 分層。
- 不更新或合併 `main`，不部署新的 Production 或 Cloudflare Worker。

## Acceptance criteria

- Repository 長期規則、文件責任、Prompt 來源及 session 交接方式沒有重複或矛盾。
- 所有引用、import、workflow 路徑與內容 schema 正常。
- lint、typecheck、內容驗證、Vitest、build、Playwright、安全稽核與 `git diff --check` 通過。
- 功能分支已 push，Draft Pull Request 已建立但未合併。

## Authorization boundary

已授權修改、commit、push 功能分支與建立／更新 Pull Request；禁止更新或合併 `main`。
