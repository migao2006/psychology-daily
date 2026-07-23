import type { Familiarity, QuizAnswer } from "@/lib/schemas/progress";
import { taipeiDateKey } from "@/lib/dates/taipei";
import { scheduleReview } from "@/lib/review/scheduler";
import { getDatabase } from "./database";

export async function completeLesson(input: {
  lessonId: string;
  answers: QuizAnswer[];
  familiarity: Familiarity;
}): Promise<void> {
  const db = getDatabase();
  const previous = await db.lessonProgress.get(input.lessonId);
  const correctCount = input.answers.filter((answer) => answer.correct).length;
  const allCorrect = correctCount === input.answers.length;
  const schedule = scheduleReview({
    correct: allCorrect,
    familiarity: input.familiarity,
    previousCorrectStreak: previous?.correctReviewStreak ?? 0,
    previousErrorCount: previous?.errorCount ?? 0,
  });
  const now = new Date().toISOString();

  await db.transaction("rw", [db.lessonProgress, db.activities], async () => {
    await db.lessonProgress.put({
      lessonId: input.lessonId,
      completedAt: previous?.completedAt ?? now,
      quizAnswers: input.answers,
      correctCount,
      totalCount: input.answers.length,
      familiarity: input.familiarity,
      nextReviewAt: new Date(`${schedule.nextReviewDate}T00:00:00+08:00`).toISOString(),
      correctReviewStreak: schedule.correctStreak,
      errorCount: schedule.errorCount,
      updatedAt: now,
    });

    const date = taipeiDateKey();
    const activity = await db.activities.get(date);
    await db.activities.put({
      date,
      completedLesson: true,
      readResearch: activity?.readResearch ?? false,
      completedToday: activity?.readResearch ?? false,
    });
  });
}

export async function markResearchRead(researchId: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const date = taipeiDateKey();
  await db.transaction("rw", [db.readResearch, db.activities], async () => {
    await db.readResearch.put({ researchId, readAt: now });
    const activity = await db.activities.get(date);
    await db.activities.put({
      date,
      completedLesson: activity?.completedLesson ?? false,
      readResearch: true,
      completedToday: activity?.completedLesson ?? false,
    });
  });
}

