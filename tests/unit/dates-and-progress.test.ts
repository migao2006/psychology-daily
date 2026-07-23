import { describe, expect, it } from "vitest";
import { addTaipeiDays, dateKeyDistance, taipeiDateKey } from "@/lib/dates/taipei";
import { calculateStreak } from "@/lib/progress/streak";
import { scheduleReview } from "@/lib/review/scheduler";
describe("Asia/Taipei date and learning rules", () => {
  it("uses Taipei midnight across UTC dates", () => {
    expect(taipeiDateKey("2026-07-22T15:59:59Z")).toBe("2026-07-22");
    expect(taipeiDateKey("2026-07-22T16:00:00Z")).toBe("2026-07-23");
    expect(addTaipeiDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(dateKeyDistance("2026-07-20", "2026-07-23")).toBe(3);
  });
  it("calculates current and longest streaks", () => {
    const result = calculateStreak(["2026-07-18", "2026-07-19", "2026-07-21", "2026-07-22", "2026-07-23"], new Date("2026-07-23T04:00:00Z"));
    expect(result).toEqual({ current: 3, longest: 3 });
    expect(calculateStreak(["2026-07-01"], new Date("2026-07-23T04:00:00Z")).current).toBe(0);
  });
  it("uses deterministic spaced review intervals", () => {
    const now = new Date("2026-07-23T04:00:00Z");
    expect(scheduleReview({ correct: false, familiarity: "certain", previousCorrectStreak: 2, previousErrorCount: 0, now }).intervalDays).toBe(1);
    expect(scheduleReview({ correct: true, familiarity: "certain", previousCorrectStreak: 0, previousErrorCount: 0, now }).intervalDays).toBe(3);
    expect(scheduleReview({ correct: true, familiarity: "certain", previousCorrectStreak: 1, previousErrorCount: 0, now }).intervalDays).toBe(7);
    expect(scheduleReview({ correct: true, familiarity: "certain", previousCorrectStreak: 2, previousErrorCount: 0, now }).intervalDays).toBe(14);
    expect(scheduleReview({ correct: true, familiarity: "certain", previousCorrectStreak: 3, previousErrorCount: 0, now }).intervalDays).toBe(30);
    expect(scheduleReview({ correct: true, familiarity: "unknown", previousCorrectStreak: 4, previousErrorCount: 0, now }).intervalDays).toBe(1);
  });
});
