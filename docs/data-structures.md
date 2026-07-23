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
- IndexedDB `meta`：schema 版本相關 metadata、最後備份時間，以及通過 Zod 驗證的 `researchPreferences.v1`。研究偏好包含多選主題、研究類型、同儕審查／免費全文優先與是否參考閱讀紀錄。

匯出檔固定為 `psychology-daily`、schemaVersion 2 的嚴格 JSON。匯入拒絕未知欄位、錯誤版本、超過 2 MB 或不符合型別的資料，內容永遠不會當成程式碼執行。

## 個人化研究排序

`lib/research/recommend.ts` 將研究內容、研究偏好與本機 `readResearch` 傳入純函式。明確偏好、具時間衰減的內容相似度、收錄新穎度與主題探索組成確定性分數；搜尋文字不會寫入資料庫。相同輸入會依分數、日期與研究 ID 產生相同順序。

## 選用加密雲端備份

`lib/db/cloud-backup.ts` 在瀏覽器產生 `PD1.<128-bit locator>.<256-bit key>` 復原碼，以 Web Crypto AES-GCM 加密上述 schemaVersion 2 JSON，並把 locator 當成 additional authenticated data。只有密文、隨機 IV 與更新時間會送到 Cloudflare Worker。

Worker 原始碼位於 `cloudflare/backup-worker/`，Workers KV key 為 `backup:<locator>`。更新與刪除需要由解密金鑰 HMAC 衍生的寫入憑證；GET 不回傳憑證。還原時瀏覽器下載密文、以復原碼解密，再次通過 `backupSchema` 後才寫回 IndexedDB。復原碼不會由網站保存，也不應提交至版本庫或貼入支援紀錄。
