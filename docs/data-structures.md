# 資料結構

## 課程內容

`content/lessons/lessons-*.json` 保存 30 堂人工課程，符合 `lib/schemas/lesson.ts`。每筆包含固定識別碼、順序、分類、難度、預估時間、定義、說明、生活情境、常見誤解、目前證據、應用、3 至 5 題測驗、書目、證據更新日期與審查狀態。

測驗的 `correctIndex` 是零起算的選項索引；`conceptId` 是複習排程的穩定概念識別碼。每日研究工作流程只能寫入 `content/research/`，不得修改人工課程。

## 研究內容

- `content/research/daily/YYYY-MM-DD.json`：完整 `DailyResearch`，包含繁中整理、來源 metadata、樣本、限制、閱讀提醒、原始網址、DOI、合法公開版本、來源 API、擷取時間、摘要依據與逐欄驗證狀態。
- `content/research/index.json`：研究歷史索引，保存 schema 版本、最後更新時間、更新狀態與每筆檔案路徑。`seed` 表示人工核對的初始內容；自動更新可記錄正常更新或 `no_suitable_paper`。

`metadataVerification` 逐項記錄題名、作者、日期、DOI 與網址是否通過核對；這些欄位不能由 LLM 產生或覆寫。`summaryBasis` 明確區分只依摘要與同時使用合法公開全文；`aiGenerated`、`aiProvider`、`aiModel` 用來追蹤整理方式。

## 本機進度

- IndexedDB `lessonProgress`：完成時間、逐題作答、正確率、熟悉度與下次複習。
- IndexedDB `activities`：Asia/Taipei 每日課程、研究與完成狀態。
- IndexedDB `readResearch`：已讀研究。
- IndexedDB `meta`：schema 版本相關 metadata 與最後備份時間。

匯出檔固定為 `psychology-daily`、schemaVersion 2 的嚴格 JSON。匯入拒絕未知欄位、錯誤版本、超過 2 MB 或不符合型別的資料，內容永遠不會當成程式碼執行。
