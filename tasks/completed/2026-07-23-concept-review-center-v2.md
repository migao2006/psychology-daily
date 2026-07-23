# Work Package: Concept review center v2

## Goal

在既有確定性規則上加入題目／概念級排程、完整複習中心與未來七天負荷，維持課程順序及四個底部導覽。

## Completed

- IndexedDB 與加密 sync payload 升級到 v4，新增 `reviewItems` 與 `reviewAttempts`。
- v2／v3 JSON 匯出可安全遷移到 v4；IndexedDB v3 升級建立空的概念表。
- 完成課程時以全站唯一 `conceptId` 為每題獨立排程，內容驗證會拒絕重複 ID。
- 既有 lesson-level 進度可在首次載入時補建概念排程，不修改人工課程內容。
- 新增 `/review`：今日到期、逾期、分類、只複習錯題、答案解析、確定程度、今日完成、容易答錯與七天負荷。
- 今日與進度頁新增複習中心入口；底部導覽維持四項。
- 文件、unit、component 與完整 E2E 已更新。

## Validation

- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm validate:content`：通過，30 lessons、1 research item。
- `pnpm test`：通過，10 files、45 tests。
- `pnpm build`：通過，40 static pages。
- `pnpm test:e2e`：通過，1 complete mobile flow，包含概念複習。
- `git diff --check`：通過。

## Authorization boundary

- 未合併、未更新 `main`、未部署 Production、未修改 Secrets。
