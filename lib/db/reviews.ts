import type { Lesson } from "@/lib/schemas/lesson";
import {
  reviewAttemptSchema,
  reviewItemSchema,
  type Familiarity,
  type QuizAnswer,
  type ReviewItem,
} from "@/lib/schemas/progress";
import { scheduleReview } from "@/lib/review/scheduler";
import { getDatabase } from "./database";
import { notifyDataChanged } from "./sync-events";

export async function hydrateLegacyReviewItems(
  lessons: Lesson[],
): Promise<void> {
  const db = getDatabase();
  const [progressRows, existing] = await Promise.all([
    db.lessonProgress.toArray(),
    db.reviewItems.toArray(),
  ]);
  const existingIds = new Set(existing.map((item) => item.conceptId));
  const progressByLesson = new Map(
    progressRows
      .filter((row) => row.completedAt)
      .map((row) => [row.lessonId, row]),
  );
  const generated: ReviewItem[] = [];
  for (const lesson of lessons) {
    const progress = progressByLesson.get(lesson.id);
    if (!progress?.completedAt || !progress.nextReviewAt) continue;
    const answerByQuestion = new Map(
      progress.quizAnswers.map((answer) => [answer.questionId, answer]),
    );
    for (const question of lesson.quiz) {
      if (existingIds.has(question.conceptId)) continue;
      const answer = answerByQuestion.get(question.id);
      generated.push(
        reviewItemSchema.parse({
          conceptId: question.conceptId,
          lessonId: lesson.id,
          questionId: question.id,
          nextReviewAt: progress.nextReviewAt,
          correctStreak: answer?.correct ? progress.correctReviewStreak : 0,
          errorCount: answer?.correct ? 0 : Math.max(1, progress.errorCount),
          lastCorrect: answer?.correct ?? null,
          lastFamiliarity: progress.familiarity,
          updatedAt: progress.updatedAt,
        }),
      );
    }
  }
  if (generated.length) {
    await db.reviewItems.bulkPut(generated);
    notifyDataChanged();
  }
}

export async function submitConceptReview(input: {
  item: ReviewItem;
  answer: QuizAnswer;
  familiarity: Familiarity;
  now?: Date;
}): Promise<ReviewItem> {
  const db = getDatabase();
  const now = input.now ?? new Date();
  const schedule = scheduleReview({
    correct: input.answer.correct,
    familiarity: input.familiarity,
    previousCorrectStreak: input.item.correctStreak,
    previousErrorCount: input.item.errorCount,
    now,
  });
  const updated = reviewItemSchema.parse({
    ...input.item,
    nextReviewAt: new Date(
      `${schedule.nextReviewDate}T00:00:00+08:00`,
    ).toISOString(),
    correctStreak: schedule.correctStreak,
    errorCount: schedule.errorCount,
    lastCorrect: input.answer.correct,
    lastFamiliarity: input.familiarity,
    updatedAt: now.toISOString(),
  });
  const attempt = reviewAttemptSchema.parse({
    id: crypto.randomUUID(),
    conceptId: input.item.conceptId,
    lessonId: input.item.lessonId,
    questionId: input.item.questionId,
    selectedIndex: input.answer.selectedIndex,
    correct: input.answer.correct,
    familiarity: input.familiarity,
    answeredAt: now.toISOString(),
  });
  await db.transaction("rw", [db.reviewItems, db.reviewAttempts], async () => {
    await db.reviewItems.put(updated);
    await db.reviewAttempts.put(attempt);
  });
  notifyDataChanged();
  return updated;
}
