import type { Lesson, QuizQuestion } from "@/lib/schemas/lesson";
import type { ReviewItem } from "@/lib/schemas/progress";
import { addTaipeiDays, taipeiDateKey } from "@/lib/dates/taipei";

export type ReviewQueueEntry = {
  item: ReviewItem;
  lesson: Lesson;
  question: QuizQuestion;
  overdue: boolean;
};

export type ReviewOverview = {
  dueToday: ReviewQueueEntry[];
  overdue: ReviewQueueEntry[];
  errorProne: ReviewQueueEntry[];
  nextSevenDays: Array<{ date: string; count: number }>;
};

export function buildReviewQueue(
  items: ReviewItem[],
  lessons: Lesson[],
  now = new Date(),
): ReviewQueueEntry[] {
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const today = taipeiDateKey(now);
  return items
    .flatMap((item): ReviewQueueEntry[] => {
      const lesson = lessonById.get(item.lessonId);
      const question = lesson?.quiz.find(
        (candidate) =>
          candidate.id === item.questionId &&
          candidate.conceptId === item.conceptId,
      );
      return lesson && question
        ? [
            {
              item,
              lesson,
              question,
              overdue: taipeiDateKey(item.nextReviewAt) < today,
            },
          ]
        : [];
    })
    .toSorted(
      (left, right) =>
        left.item.nextReviewAt.localeCompare(right.item.nextReviewAt) ||
        right.item.errorCount - left.item.errorCount ||
        left.item.conceptId.localeCompare(right.item.conceptId),
    );
}

export function buildReviewOverview(
  items: ReviewItem[],
  lessons: Lesson[],
  now = new Date(),
): ReviewOverview {
  const today = taipeiDateKey(now);
  const queue = buildReviewQueue(items, lessons, now);
  const dates = Array.from({ length: 7 }, (_, offset) =>
    addTaipeiDays(today, offset),
  );
  return {
    dueToday: queue.filter(
      (entry) => taipeiDateKey(entry.item.nextReviewAt) === today,
    ),
    overdue: queue.filter(
      (entry) => taipeiDateKey(entry.item.nextReviewAt) < today,
    ),
    errorProne: queue
      .filter((entry) => entry.item.errorCount > 0)
      .toSorted(
        (left, right) =>
          right.item.errorCount - left.item.errorCount ||
          left.item.conceptId.localeCompare(right.item.conceptId),
      ),
    nextSevenDays: dates.map((date) => ({
      date,
      count: queue.filter(
        (entry) => taipeiDateKey(entry.item.nextReviewAt) === date,
      ).length,
    })),
  };
}
