# Prompt registry

此目錄是 Repository 內可執行 LLM Prompt 的唯一來源。Prompt 不放在 TASK、CONTINUITY、README、元件或 workflow 中，以免多份規則漂移。

| Prompt | Runtime owner | Input | Validated output |
| --- | --- | --- | --- |
| `research-summary.ts` | `lib/research/summarizer.ts` | 已核對的 `ResearchSource` metadata 與英文摘要 | provider JSON Schema、Zod `summarySchema`、grounding 檢查 |

## Change protocol

1. 先確認來源欄位沒有擴大到任意網路內容或未核對 metadata。
2. Prompt 只描述編輯任務與科學／倫理限制，不放 provider key、模型名稱或環境資訊。
3. 同步檢查 `summarySchema`、provider `outputJsonSchema`、`ensureGrounded` 與 `ResearchArticle` schema。
4. 更新 Prompt 契約測試及受影響的整合測試。
5. 執行 `pnpm lint && pnpm typecheck && pnpm test && pnpm build`。

Prompt 變更是程式變更，不是一般文案修改；必須經 Pull Request 與完整驗證。
