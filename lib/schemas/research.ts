import { z } from "zod";
import { httpsUrlSchema } from "./lesson";

export const publicationStatusSchema = z.enum([
  "peer_reviewed",
  "preprint",
  "unknown",
]);

export const studyTypeSchema = z.enum([
  "meta_analysis",
  "systematic_review",
  "randomized_trial",
  "experimental",
  "longitudinal",
  "cross_sectional",
  "qualitative",
  "registered_report",
  "other",
]);

export const RESEARCH_CATEGORIES = [
  "認知心理學",
  "社會心理學",
  "發展心理學",
  "心理健康",
  "神經科學",
  "人格與個別差異",
] as const;

export const researchCategorySchema = z.enum(RESEARCH_CATEGORIES);

const researchKeyTermSchema = z.strictObject({
  original: z.string().min(1),
  translationZh: z.string().min(1),
  explanationZh: z.string().min(1),
});

export const researchArticleSchema = z.strictObject({
  id: z.string().min(1),
  titleZh: z.string().min(1),
  titleOriginal: z.string().min(1),
  authors: z.array(z.string().min(1)).min(1),
  journalOrRepository: z.string().min(1),
  publicationDate: z.iso.date(),
  language: z.string().min(1),
  publicationStatus: publicationStatusSchema,
  studyType: studyTypeSchema,
  psychologyCategory: researchCategorySchema,
  researchQuestionZh: z.string().min(1),
  backgroundZh: z.string().min(1),
  methodsZh: z.string().min(1),
  sample: z.strictObject({
    size: z.number().int().positive().nullable(),
    populationZh: z.string().min(1).nullable(),
    locationZh: z.string().min(1).nullable(),
  }),
  mainFindingsZh: z.array(z.string().min(1)).min(1).max(5),
  limitationsZh: z.array(z.string().min(1)),
  practicalMeaningZh: z.string().min(1),
  cautionZh: z.string().min(1),
  keyTerms: z.array(researchKeyTermSchema),
  originalUrl: httpsUrlSchema,
  doi: z.string().min(1).nullable(),
  doiUrl: httpsUrlSchema.nullable(),
  openAccessUrl: httpsUrlSchema.nullable(),
  sourceApis: z.array(z.string().min(1)).min(1),
  retrievedAt: z.iso.datetime({ offset: true }),
  summaryBasis: z.enum(["abstract", "abstract_and_open_full_text"]),
  aiGenerated: z.boolean(),
  aiProvider: z.string().min(1).nullable(),
  aiModel: z.string().min(1).nullable(),
  metadataVerification: z.strictObject({
    titleVerified: z.boolean(),
    authorsVerified: z.boolean(),
    dateVerified: z.boolean(),
    doiVerified: z.boolean(),
    urlVerified: z.boolean(),
  }),
});

export const researchIndexItemSchema = z.strictObject({
  id: z.string().min(1),
  path: z.string().regex(/^items\/[a-zA-Z0-9._-]+\.json$/),
  titleZh: z.string().min(1),
  publicationDate: z.iso.date(),
  publicationStatus: publicationStatusSchema,
  studyType: studyTypeSchema,
  psychologyCategory: researchCategorySchema,
});

export const researchFeatureSchema = z.strictObject({
  date: z.iso.date(),
  researchId: z.string().min(1),
});

export const researchIndexSchema = z.strictObject({
  schemaVersion: z.literal(2),
  lastUpdatedAt: z.iso.datetime({ offset: true }),
  updateStatus: z.enum(["updated", "no_suitable_paper", "seed", "backfilled"]),
  features: z.array(researchFeatureSchema),
  items: z.array(researchIndexItemSchema),
});

export const backfillRejectionCodeSchema = z.enum([
  "metadata_mismatch",
  "invalid_source",
  "summary_schema_invalid",
  "summary_grounding_failed",
  "summary_audit_failed",
]);

export const researchBackfillStateSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    target: z.literal(100),
    status: z.enum(["running", "completed", "stalled"]),
    activeWindowDays: z.union([z.literal(180), z.literal(365)]),
    noProgressRuns: z.number().int().min(0).max(3),
    lastRunAt: z.iso.datetime({ offset: true }).nullable(),
    completedAt: z.iso.datetime({ offset: true }).nullable(),
    rejectedCandidates: z.array(
      z.strictObject({
        fingerprint: z.string().min(1),
        code: backfillRejectionCodeSchema,
        attemptedAt: z.iso.datetime({ offset: true }),
      }),
    ),
  })
  .superRefine((value, context) => {
    if (new Set(value.rejectedCandidates.map((item) => item.fingerprint)).size !== value.rejectedCandidates.length) {
      context.addIssue({
        code: "custom",
        path: ["rejectedCandidates"],
        message: "回補拒絕候選不可重複",
      });
    }
    if (value.status === "completed" && !value.completedAt) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "完成狀態必須包含完成時間",
      });
    }
  });

export type ResearchArticle = z.infer<typeof researchArticleSchema>;
export type ResearchIndex = z.infer<typeof researchIndexSchema>;
export type StudyType = z.infer<typeof studyTypeSchema>;
export type PublicationStatus = z.infer<typeof publicationStatusSchema>;
export type ResearchCategory = z.infer<typeof researchCategorySchema>;
export type ResearchBackfillState = z.infer<
  typeof researchBackfillStateSchema
>;
export type BackfillRejectionCode = z.infer<
  typeof backfillRejectionCodeSchema
>;

export type ResearchCatalogItem = Pick<
  ResearchArticle,
  | "id"
  | "titleZh"
  | "titleOriginal"
  | "authors"
  | "journalOrRepository"
  | "publicationDate"
  | "publicationStatus"
  | "studyType"
  | "psychologyCategory"
  | "mainFindingsZh"
  | "keyTerms"
  | "doi"
  | "openAccessUrl"
> & {
  searchText: string;
};
