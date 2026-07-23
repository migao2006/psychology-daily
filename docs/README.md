# Documentation map

每項長期資訊只有一個主要擁有者；其他文件應連結到它，不複製整段規則。

| 文件 | 唯一責任 | 何時閱讀 |
| --- | --- | --- |
| `README.md` | 產品入口、快速開始、文件導覽 | 第一次認識專案 |
| `docs/architecture.md` | 模組、資料流、邊界與依賴方向 | 修改程式或評估重構前 |
| `docs/development.md` | 本機環境、驗證矩陣、Git 與 generated files | 開始開發與送 PR 前 |
| `docs/operations.md` | Vercel、GitHub Actions、Cloudflare、Secrets 與故障處理 | 部署或維運時 |
| `docs/content-sources.md` | 課程與研究來源、排名、metadata／AI 驗證規則 | 修改內容流程時 |
| `docs/data-structures.md` | 課程、研究、IndexedDB、匯入與備份 schema | 修改持久化資料時 |
| `AGENTS.md` | 跨工作包長期規則與安全邊界 | 每個 AI session 開始時 |
| `tasks/active/TASK.md` | 唯一目前工作包 | 每個工作 session 開始時 |
| `CONTINUITY.md` | 當前分支與簡短交接狀態 | 接續未完成工作時 |
| `prompts/README.md` | Prompt registry 與修改契約 | 修改 LLM 輸入或輸出時 |

現在的產品行為、工作進度或臨時診斷不得加入文件索引。文件搬移時，須同步檢查 README、workflow link checker 與 Repository 內所有相對連結。
