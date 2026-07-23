# 資料結構

## 課程內容

`content/lessons/lessons-*.json` 保存 30 堂人工課程，符合 `lib/schemas/lesson.ts`。每筆包含固定識別碼、順序、分類、難度、預估時間、定義、說明、生活情境、常見誤解、目前證據、應用、3 至 5 題測驗、書目、證據更新日期與審查狀態。

測驗的 `correctIndex` 是零起算的選項索引；`conceptId` 是複習排程的穩定概念識別碼。每日研究工作流程只能寫入 `content/research/`，不得修改人工課程。

## 研究內容

- `content/research/items/<research-id>.json`：完整 `ResearchArticle`，包含繁中整理、來源 metadata、樣本、限制、閱讀提醒、原始網址、DOI、合法公開版本、來源 API、擷取時間、摘要依據與逐欄驗證狀態。
- `content/research/index.json`：研究歷史索引與每日精選日期映射，保存 schema 版本、最後更新時間、更新狀態與每筆檔案路徑；同一研究可被不同日期精選，不重複儲存內文。`seed` 表示人工核對的初始內容，自動流程可記錄 `updated`、`backfilled` 或 `no_suitable_paper`。

`metadataVerification` 逐項記錄題名、作者、日期、DOI 與網址是否通過核對；這些欄位不能由 LLM 產生或覆寫。`summaryBasis` 明確區分只依摘要與同時使用合法公開全文；`aiGenerated`、`aiProvider`、`aiModel` 用來追蹤整理方式。

## 綁定資料與 IndexedDB 快取

- IndexedDB `lessonProgress`：完成時間、逐題作答、正確率、熟悉度與下次複習。
- IndexedDB `activities`：Asia/Taipei 每日課程、研究與完成狀態。
- IndexedDB `readResearch`：已讀研究。
- IndexedDB `meta`：schema 版本相關 metadata、最後匯出時間，以及通過 Zod 驗證的 `researchPreferences.v1`。
- IndexedDB `researchInteractions`、`savedResearchFilters`、`settings`：主動回饋／收藏／稍後閱讀、常用篩選與介面設定，全部納入同步 payload。
- IndexedDB `cloudBindings`：目前裝置 ID、復原碼與同步 revision；此 table 嚴格排除在同步與 JSON 匯出之外。

同步與匯出固定為 `psychology-daily`、schemaVersion 3 的嚴格 JSON。匯入可將合法 v2 轉成 v3，拒絕未知欄位、其他版本、超過 2 MB 或不符合型別的資料，內容永遠不會當成程式碼執行。

## 個人化研究排序

`lib/research/recommend.ts` 將研究內容、研究偏好、主動回饋與 `readResearch` 傳入純函式。權重固定為明確偏好 40%、主動回饋 25%、已讀相似度 20%、新穎度 10%、主題探索 5%；「沒興趣」降低相近內容但不封鎖分類。相同輸入會依分數、日期與研究 ID 產生相同順序。

## 強制加密同步

`lib/db/cloud-backup.ts` 在瀏覽器產生 `PD1.<128-bit locator>.<256-bit key>` 復原碼，以 Web Crypto AES-GCM 加密 schemaVersion 3 JSON，並把 locator 當成 additional authenticated data。首次使用必須建立或復原綁定；Worker 以 active device 與 revision 執行單一裝置寫入及樂觀鎖定。

Worker 原始碼位於 `cloudflare/backup-worker/`，v2 Workers KV key 為 `backup:v2:<locator>`。更新與刪除需要由解密金鑰 HMAC 衍生的寫入憑證、active device ID 與正確 revision；GET 不回傳任何憑證。復原碼只保存於隔離的 `cloudBindings` table，絕不進入密文內容、匯出、日誌、版本庫或支援紀錄。
