import { z } from "zod";

export const httpsUrlSchema = z
  .url()
  .refine((value) => new URL(value).protocol === "https:", "網址必須使用 HTTPS");

export const evidenceItemSchema = z.strictObject({
  claim: z.string().min(1),
  evidenceLevel: z.enum(["established", "supported", "mixed", "emerging"]),
  limitations: z.string().min(1),
  sourceUrl: httpsUrlSchema,
});

export const quizQuestionSchema = z.strictObject({
  id: z.string().min(1),
  conceptId: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5),
  correctIndex: z.number().int().nonnegative(),
  explanation: z.string().min(1),
});

export const referenceItemSchema = z.strictObject({
  title: z.string().min(1),
  authors: z.array(z.string().min(1)).optional(),
  year: z.number().int().min(1800).max(2100).optional(),
  doi: z.string().min(1).optional(),
  url: httpsUrlSchema,
  source: z.string().min(1),
});

export const lessonSchema = z
  .strictObject({
    id: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    sequence: z.number().int().min(1),
    title: z.string().min(1),
    category: z.string().min(1),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    estimatedMinutes: z.number().int().min(5).max(8),
    summary: z.string().min(1),
    definition: z.string().min(1),
    explanation: z.string().min(1),
    dailyExample: z.string().min(1),
    commonMisconceptions: z.array(z.string().min(1)).min(1),
    currentEvidence: z.array(evidenceItemSchema).min(1),
    applications: z.array(z.string().min(1)).min(1),
    quiz: z.array(quizQuestionSchema).min(3).max(5),
    references: z.array(referenceItemSchema).min(1),
    evidenceUpdatedAt: z.iso.date(),
    contentStatus: z.enum(["reviewed", "partially_verified"]),
  })
  .superRefine((lesson, context) => {
    for (const question of lesson.quiz) {
      if (question.correctIndex >= question.options.length) {
        context.addIssue({
          code: "custom",
          path: ["quiz", question.id, "correctIndex"],
          message: "正確答案索引超出選項範圍",
        });
      }
    }
  });

export const lessonsSchema = z
  .array(lessonSchema)
  .length(30)
  .superRefine((lessons, context) => {
    const ids = new Set<string>();
    const slugs = new Set<string>();
    const sequences = new Set<number>();
    for (const lesson of lessons) {
      if (ids.has(lesson.id) || slugs.has(lesson.slug) || sequences.has(lesson.sequence)) {
        context.addIssue({
          code: "custom",
          message: `課程識別資料重複：${lesson.id}`,
        });
      }
      ids.add(lesson.id);
      slugs.add(lesson.slug);
      sequences.add(lesson.sequence);
    }
  });

export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type ReferenceItem = z.infer<typeof referenceItemSchema>;
export type Lesson = z.infer<typeof lessonSchema>;

