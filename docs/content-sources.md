# 內容來源與驗證

## 人工課程

課程保留穩定的心理學核心概念，參考 OpenStax、政府／學術機構與可核對 DOI 的原始文獻。每課在 `references` 與 `currentEvidence` 保留 HTTPS 原始網址、證據強度與限制。人工課程不由每日排程改寫。

現有 DOI 書目已於 2026-07-23 以 Crossref 登錄資料核對題名、年份與期刊；非 DOI 來源使用原始機構的 HTTPS 網址。課程文字以「建立穩定核心概念」為目的，單篇近期研究只能放入目前證據、補充或限制，不能直接推翻整體證據。

## 每日研究

每日研究候選依序向 OpenAlex、Europe PMC、Crossref 取回；前三者沒有合格候選時才使用 Semantic Scholar fallback。OpenAlex 可涵蓋 PsyArXiv 等可信預印本。資料不足時才擴大日期範圍，且保留既有內容。Crossref 核對 DOI、標題、作者與期刊；Unpaywall 只在找到合法公開版本時提供免費全文。

LLM 只收到來源 API 回傳的標題、作者、出版資訊、DOI、研究類型與英文摘要。輸出以 JSON Schema 與 Zod 驗證；程式保留來源 metadata，不允許模型覆寫。樣本數若未出現在摘要，更新會失敗。

候選缺少英文標題、英文摘要、作者、日期或可驗證永久網址時會被排除。先搜尋最近 14 天，再擴至 30 天；兩輪都沒有合格資料時回傳 `no_suitable_paper`，不覆寫既有研究。

目前研究內容與來源追蹤以 `content/research/index.json` 及對應 `items/*.json` 為唯一來源，不在文件複製容易過時的 DOI、題名或公開全文狀態。`features` 只保存精選日期到研究 ID 的映射；每筆內容都必須保存 `sourceApis`、`retrievedAt`、`summaryBasis` 與 `metadataVerification`。

獨立 `backfill-research.yml` 只允許手動啟動，聚合最近 180 天四個來源，每批最多 10 篇，目標 100 篇、每類至少 12 篇、預印本最多 20%。回補內容在持續分支及 Draft PR 累積，不影響每日更新。

## 外部連結

- `originalUrl` 必須是可驗證的 HTTPS 原始頁面或永久網址。
- 有 DOI 時，`doiUrl` 固定使用 `https://doi.org/{doi}`。
- 只有來源 API 或 Unpaywall 回傳可驗證的合法公開版本時，才寫入 `openAccessUrl`。
- Link check 每週及內容 Pull Request 重新檢查 README、docs 與內容 JSON；403 與 429 只代表自動檢查受到站方限制，不等於已證明內容可公開下載。
