# Work package lifecycle

`tasks/` 保存可交接的工作範圍，不保存逐步工作日誌。

- `active/TASK.md`：唯一的目前工作包。無進行中工作時內容必須是 `TASK=NONE`。
- `completed/`：完成後的工作包快照，檔名採 `YYYY-MM-DD-short-description.md`。
- `CONTINUITY.md`：跨 session 的簡短狀態；它不取代 TASK，也不複製完成封存的歷史。

開始工作時，將目標、範圍、非目標、驗收條件與授權邊界寫入 active TASK。完成驗證後，把同一份 TASK 補上結果並移至 `completed/`，接著恢復 `TASK=NONE`。若工作中止，保留 active TASK，並在 `CONTINUITY.md` 說明唯一下一步與阻礙。
