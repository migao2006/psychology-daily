# Repository guidance

- 使用台灣繁體中文撰寫介面與課程內容。
- 不得把 API key、token、`.env` 或完整授權標頭提交到版本庫。
- 人工課程位於 `content/lessons/`；每日自動工作流程不得修改該目錄。
- 每日研究必須通過 Zod schema、來源網址與 metadata 檢查後才能提交。
- 不得把相關關係改寫成因果，不得補造樣本、方法、作者、DOI、期刊或研究結果。
- 所有前端個人進度只能保存在 IndexedDB；Local Storage 只保存介面偏好與導覽狀態。
- 合併前執行 `pnpm lint && pnpm typecheck && pnpm test && pnpm build`。

