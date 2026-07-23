import type { ResearchSource } from "@/lib/research/types";

const editorInstructions = [
  "你是心理科學研究摘要編輯。",
  "只能依下方資料，以台灣繁體中文輸出符合 schema 的 JSON。",
  "不得自行搜尋或補充；原文沒有的樣本數、族群、地點必須填 null。",
  "不得把相關改寫成因果。",
  "推論限制須以「根據研究設計推論」開頭。",
  "cautionZh 必須說明同儕審查狀態、是否僅依摘要、因果限制、樣本限制與仍需更多研究，並含「本內容為心理學教育與研究摘要，不構成醫療、心理治療或診斷建議。」",
].join("");

export function buildResearchSummaryPrompt(source: ResearchSource): string {
  return `${editorInstructions}

原始標題：${source.title}
作者：${source.authors.join(", ")}
出版日期：${source.publicationDate}
期刊或平台：${source.journalOrRepository}
DOI：${source.doi ?? "null"}
研究類型（來源正規化）：${source.studyType}
同儕審查狀態（來源正規化）：${source.publicationStatus}
英文摘要：${source.abstract}`;
}
