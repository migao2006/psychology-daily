import { z } from "zod";
import {
  RESEARCH_CATEGORIES,
  studyTypeSchema,
  type StudyType,
} from "@/lib/schemas/research";

export { RESEARCH_CATEGORIES };

export const STUDY_TYPE_OPTIONS: ReadonlyArray<{
  value: StudyType;
  label: string;
}> = [
  { value: "meta_analysis", label: "統合分析" },
  { value: "systematic_review", label: "系統性回顧" },
  { value: "registered_report", label: "Registered Report" },
  { value: "randomized_trial", label: "隨機試驗" },
  { value: "experimental", label: "實驗研究" },
  { value: "longitudinal", label: "縱貫研究" },
  { value: "cross_sectional", label: "橫斷研究" },
  { value: "qualitative", label: "質性研究" },
  { value: "other", label: "其他研究" },
];

export const researchPreferencesSchema = z
  .strictObject({
    version: z.literal(1),
    categories: z.array(z.enum(RESEARCH_CATEGORIES)).max(RESEARCH_CATEGORIES.length),
    studyTypes: z.array(studyTypeSchema).max(STUDY_TYPE_OPTIONS.length),
    preferPeerReviewed: z.boolean(),
    preferOpenAccess: z.boolean(),
    learnFromReading: z.boolean(),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .superRefine((value, context) => {
    if (new Set(value.categories).size !== value.categories.length) {
      context.addIssue({
        code: "custom",
        path: ["categories"],
        message: "研究分類不可重複",
      });
    }
    if (new Set(value.studyTypes).size !== value.studyTypes.length) {
      context.addIssue({
        code: "custom",
        path: ["studyTypes"],
        message: "研究類型不可重複",
      });
    }
  });

export type ResearchPreferences = z.infer<typeof researchPreferencesSchema>;

export function defaultResearchPreferences(
  now = new Date(),
): ResearchPreferences {
  return {
    version: 1,
    categories: [],
    studyTypes: [],
    preferPeerReviewed: true,
    preferOpenAccess: false,
    learnFromReading: true,
    updatedAt: now.toISOString(),
  };
}

export function hasPersonalizedPreferences(
  preferences: ResearchPreferences,
): boolean {
  return (
    preferences.categories.length > 0 ||
    preferences.studyTypes.length > 0 ||
    preferences.preferOpenAccess ||
    !preferences.preferPeerReviewed
  );
}
