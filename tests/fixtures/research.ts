import {
  researchArticleSchema,
  type ResearchArticle,
} from "@/lib/schemas/research";

export function makeResearch(
  overrides: Partial<ResearchArticle> = {},
): ResearchArticle {
  const id = overrides.id ?? "fixture-cognitive";
  return researchArticleSchema.parse({
    id,
    titleZh: "工作記憶與學習策略",
    titleOriginal: "Working memory and learning strategies",
    authors: ["Test Author"],
    journalOrRepository: "Test Journal",
    publicationDate: "2026-07-22",
    language: "en",
    publicationStatus: "peer_reviewed",
    studyType: "experimental",
    psychologyCategory: "認知心理學",
    researchQuestionZh: "工作記憶如何與學習策略相關？",
    backgroundZh: "這是僅供自動測試使用的研究資料。",
    methodsZh: "測試資料中的方法說明。",
    sample: {
      size: 120,
      populationZh: "成人",
      locationZh: "測試地點",
    },
    mainFindingsZh: ["測試發現一。", "測試發現二。"],
    limitationsZh: ["這是測試資料。"],
    practicalMeaningZh: "這是測試用途的實際意義。",
    cautionZh: "不得將測試資料視為真實研究。",
    keyTerms: [
      {
        original: "working memory",
        translationZh: "工作記憶",
        explanationZh: "暫時保存及操作資訊的能力。",
      },
    ],
    originalUrl: `https://example.com/research/${id}`,
    doi: null,
    doiUrl: null,
    openAccessUrl: `https://example.com/research/${id}/full`,
    sourceApis: ["test-fixture"],
    retrievedAt: "2026-07-23T00:00:00Z",
    summaryBasis: "abstract",
    aiGenerated: false,
    aiProvider: null,
    aiModel: null,
    metadataVerification: {
      titleVerified: true,
      authorsVerified: true,
      dateVerified: true,
      doiVerified: true,
      urlVerified: true,
    },
    ...overrides,
  });
}

export const researchFixtures = [
  makeResearch(),
  makeResearch({
    id: "fixture-social",
    publicationDate: "2026-07-21",
    titleZh: "社會規範與合作行為",
    titleOriginal: "Social norms and cooperative behavior",
    psychologyCategory: "社會心理學",
    studyType: "experimental",
    keyTerms: [
      {
        original: "social norms",
        translationZh: "社會規範",
        explanationZh: "群體共享的行為期待。",
      },
    ],
  }),
  makeResearch({
    id: "fixture-social-followup",
    publicationDate: "2026-07-20",
    titleZh: "合作決策的跨文化觀察",
    titleOriginal: "A cross-cultural view of cooperative decisions",
    psychologyCategory: "社會心理學",
    studyType: "cross_sectional",
    keyTerms: [
      {
        original: "social norms",
        translationZh: "社會規範",
        explanationZh: "群體共享的行為期待。",
      },
    ],
  }),
  makeResearch({
    id: "fixture-neuroscience",
    publicationDate: "2026-07-19",
    titleZh: "睡眠與腦功能的系統性回顧",
    titleOriginal: "Sleep and brain function: a systematic review",
    psychologyCategory: "神經科學",
    studyType: "systematic_review",
    keyTerms: [
      {
        original: "sleep",
        translationZh: "睡眠",
        explanationZh: "週期性的生理休息狀態。",
      },
    ],
  }),
];
