# Work Package: Cloud-bound research exploration v2

## Goal

將產品改為 Cloudflare 必綁、端對端加密同步，並完成 100 篇研究庫所需的內容 v2、回補流程、推薦、搜尋與雜誌探索式研究介面。

## Completed

- IndexedDB 與 sync payload 升級到 v3，移除全部 Local／Session Storage，裝置憑證獨立且不進入同步或匯出。
- 新增首次強制綁定、既有快取上傳、新裝置復原、單一 active device、revision conflict 與自動加密同步。
- Cloudflare Worker API v2 完成 bind、GET、PUT 與 DELETE 契約；Production 未部署。
- 研究內容升級為 `items` 與 `features` 分離的索引 v2。
- 新增最近 180 天、目標 100 篇、每批最多 10 篇的獨立回補 workflow，包含來源聚合、去重、分類覆蓋、預印本上限及第二次摘要查核。
- 新增研究偏好、收藏、稍後閱讀、更多／較少主題回饋、固定權重推薦、雙語／作者／DOI 搜尋、進階篩選與儲存篩選。
- 研究列表改為探索分區，詳細頁新增目錄、metadata 核對、引用複製與相關研究。
- 更新長期規則、README、架構、資料、開發及維運文件。

## Validation

- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm validate:content`：通過，30 lessons、1 research item。
- `pnpm test`：通過，8 files、39 tests。
- `pnpm build`：通過，39 static pages。
- `pnpm test:e2e`：通過，1 complete mobile flow。
- `git diff --check`：通過。
- agent-browser：首頁有內容、無錯誤 overlay、強制綁定互動可見。

## Authorization boundary

- 未合併、未更新 `main`、未部署 Production Worker、未修改 Secrets。
