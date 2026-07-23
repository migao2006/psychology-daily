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

export const backupSchema = z.strictObject({
  app: z.literal("psychology-daily"),
  schemaVersion: z.literal(2),
  exportedAt: z.iso.datetime({ offset: true }),
  lessonProgress: z.array(lessonProgressSchema),
  activities: z.array(activitySchema),
  readResearch: z.array(readResearchSchema),
  meta: z.array(appMetaSchema),
});

export type Familiarity = z.infer<typeof familiaritySchema>;
export type QuizAnswer = z.infer<typeof quizAnswerSchema>;
export type LessonProgress = z.infer<typeof lessonProgressSchema>;
export type DailyActivity = z.infer<typeof activitySchema>;
export type ReadResearch = z.infer<typeof readResearchSchema>;
export type AppMeta = z.infer<typeof appMetaSchema>;
export type ProgressBackup = z.infer<typeof backupSchema>;

