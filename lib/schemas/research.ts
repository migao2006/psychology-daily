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

export const dailyResearchSchema = z.strictObject({
  id: z.string().min(1),
  featuredDate: z.iso.date(),
  titleZh: z.string().min(1),
  titleOriginal: z.string().min(1),
  authors: z.array(z.string().min(1)).min(1),
  journalOrRepository: z.string().min(1),
  publicationDate: z.iso.date(),
  language: z.string().min(1),
  publicationStatus: publicationStatusSchema,
  studyType: studyTypeSchema,
  psychologyCategory: z.string().min(1),
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
  keyTerms: z.array(
    z.strictObject({
      original: z.string().min(1),
      translationZh: z.string().min(1),
      explanationZh: z.string().min(1),
    }),
  ),
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
  featuredDate: z.iso.date(),
  path: z.string().regex(/^daily\/[a-zA-Z0-9._-]+\.json$/),
  titleZh: z.string().min(1),
  publicationStatus: publicationStatusSchema,
  studyType: studyTypeSchema,
  psychologyCategory: z.string().min(1),
});

export const researchIndexSchema = z.strictObject({
  schemaVersion: z.literal(1),
  lastUpdatedAt: z.iso.datetime({ offset: true }),
  updateStatus: z.enum(["updated", "no_suitable_paper", "seed"]),
  items: z.array(researchIndexItemSchema),
});

export type DailyResearch = z.infer<typeof dailyResearchSchema>;
export type StudyType = z.infer<typeof studyTypeSchema>;
export type PublicationStatus = z.infer<typeof publicationStatusSchema>;

