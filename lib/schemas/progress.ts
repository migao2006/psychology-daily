import { z } from "zod";

export const familiaritySchema = z.enum(["unknown", "unsure", "certain"]);

export const quizAnswerSchema = z.strictObject({
  questionId: z.string().min(1),
  selectedIndex: z.number().int().nonnegative(),
  correct: z.boolean(),
  answeredAt: z.iso.datetime({ offset: true }),
});

export const lessonProgressSchema = z.strictObject({
  lessonId: z.string().min(1),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  quizAnswers: z.array(quizAnswerSchema),
  correctCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  familiarity: familiaritySchema,
  nextReviewAt: z.iso.datetime({ offset: true }).nullable(),
  correctReviewStreak: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const activitySchema = z.strictObject({
  date: z.iso.date(),
  completedLesson: z.boolean(),
  readResearch: z.boolean(),
  completedToday: z.boolean(),
});

export const readResearchSchema = z.strictObject({
  researchId: z.string().min(1),
  readAt: z.iso.datetime({ offset: true }),
});

export const appMetaSchema = z.strictObject({
  key: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

export const researchInteractionSchema = z.strictObject({
  researchId: z.string().min(1),
  favorite: z.boolean(),
  readLater: z.boolean(),
  feedback: z.enum(["more", "less"]).nullable(),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const savedResearchFilterSchema = z.strictObject({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(40),
  query: z.string().trim().max(200),
  categories: z.array(z.string().min(1)).max(20),
  studyTypes: z.array(z.string().min(1)).max(12),
  publicationStatuses: z.array(z.string().min(1)).max(3),
  openAccessOnly: z.boolean(),
  dateFrom: z.iso.date().nullable(),
  dateTo: z.iso.date().nullable(),
  sortMode: z.enum(["recommended", "newest", "unread"]),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const userSettingsSchema = z.strictObject({
  key: z.literal("userSettings"),
  theme: z.enum(["system", "light", "dark"]),
  fontSize: z.enum(["normal", "large", "xlarge"]),
  seenOnboarding: z.boolean(),
  lastPage: z.string().startsWith("/").max(200),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const cloudBindingSchema = z.strictObject({
  id: z.literal("primary"),
  recoveryCode: z.string().startsWith("PD1.").max(100),
  deviceId: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  status: z.enum(["active", "replaced", "error"]),
  revision: z.number().int().nonnegative(),
  boundAt: z.iso.datetime({ offset: true }),
  lastSyncedAt: z.iso.datetime({ offset: true }).nullable(),
  updatedAt: z.iso.datetime({ offset: true }),
});

const backupBase = {
  app: z.literal("psychology-daily"),
  exportedAt: z.iso.datetime({ offset: true }),
  lessonProgress: z.array(lessonProgressSchema),
  activities: z.array(activitySchema),
  readResearch: z.array(readResearchSchema),
  meta: z.array(appMetaSchema),
};

export const legacyBackupSchema = z.strictObject({
  ...backupBase,
  schemaVersion: z.literal(2),
});

export const backupSchema = z.strictObject({
  ...backupBase,
  schemaVersion: z.literal(3),
  researchInteractions: z.array(researchInteractionSchema),
  savedResearchFilters: z.array(savedResearchFilterSchema).max(10),
  settings: z.array(userSettingsSchema).max(1),
});

export type Familiarity = z.infer<typeof familiaritySchema>;
export type QuizAnswer = z.infer<typeof quizAnswerSchema>;
export type LessonProgress = z.infer<typeof lessonProgressSchema>;
export type DailyActivity = z.infer<typeof activitySchema>;
export type ReadResearch = z.infer<typeof readResearchSchema>;
export type AppMeta = z.infer<typeof appMetaSchema>;
export type ResearchInteraction = z.infer<typeof researchInteractionSchema>;
export type SavedResearchFilter = z.infer<typeof savedResearchFilterSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type CloudBinding = z.infer<typeof cloudBindingSchema>;
export type ProgressBackup = z.infer<typeof backupSchema>;

export function defaultUserSettings(now = new Date()): UserSettings {
  return {
    key: "userSettings",
    theme: "system",
    fontSize: "normal",
    seenOnboarding: false,
    lastPage: "/",
    updatedAt: now.toISOString(),
  };
}
