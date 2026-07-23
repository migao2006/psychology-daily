import type { Familiarity } from "@/lib/schemas/progress";
import { addTaipeiDays, taipeiDateKey } from "@/lib/dates/taipei";

export type ReviewInput = {
  correct: boolean;
  familiarity: Familiarity;
  previousCorrectStreak: number;
  previousErrorCount: number;
  now?: Date;
};

export type ReviewSchedule = {
  intervalDays: 1 | 3 | 7 | 14 | 30;
  nextReviewDate: string;
  correctStreak: number;
  errorCount: number;
};

const intervalForStreak = (streak: number): 3 | 7 | 14 | 30 => {
  if (streak <= 1) return 3;
  if (streak === 2) return 7;
  if (streak === 3) return 14;
  return 30;
};

export function scheduleReview(input: ReviewInput): ReviewSchedule {
  const dateKey = taipeiDateKey(input.now ?? new Date());
  if (!input.correct) {
    return {
      intervalDays: 1,
      nextReviewDate: addTaipeiDays(dateKey, 1),
      correctStreak: 0,
      errorCount: input.previousErrorCount + 1,
    };
  }

  const correctStreak = input.previousCorrectStreak + 1;
  let intervalDays: ReviewSchedule["intervalDays"] = intervalForStreak(correctStreak);

  if (input.familiarity === "unknown") {
    intervalDays = 1;
  } else if (input.familiarity === "unsure") {
    intervalDays = Math.min(intervalDays, 3) as 3;
  }

  if (input.previousErrorCount >= 2) {
    intervalDays = Math.min(intervalDays, 3) as 3;
  }

  return {
    intervalDays,
    nextReviewDate: addTaipeiDays(dateKey, intervalDays),
    correctStreak,
    errorCount: input.previousErrorCount,
  };
}
