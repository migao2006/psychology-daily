import { describe, expect, it } from "vitest";
import { lessons } from "@/lib/content/lessons";
import { buildReviewOverview } from "@/lib/review/queue";
import type { ReviewItem } from "@/lib/schemas/progress";

const lesson = lessons[0];
const [first, second, third] = lesson.quiz;
const item = (
  conceptId: string,
  questionId: string,
  nextReviewAt: string,
  errorCount = 0,
): ReviewItem => ({
  conceptId,
  lessonId: lesson.id,
  questionId,
  nextReviewAt,
  correctStreak: 1,
  errorCount,
  lastCorrect: errorCount === 0,
  lastFamiliarity: "unsure",
  updatedAt: "2026-07-23T00:00:00Z",
});

describe("concept review queue", () => {
  it("separates overdue, today and future load in Asia/Taipei", () => {
    const overview = buildReviewOverview(
      [
        item(first.conceptId, first.id, "2026-07-21T16:00:00Z", 2),
        item(second.conceptId, second.id, "2026-07-22T16:00:00Z"),
        item(third.conceptId, third.id, "2026-07-25T16:00:00Z"),
      ],
      lessons,
      new Date("2026-07-23T04:00:00Z"),
    );
    expect(overview.overdue).toHaveLength(1);
    expect(overview.dueToday).toHaveLength(1);
    expect(overview.errorProne[0].item.conceptId).toBe(first.conceptId);
    expect(overview.nextSevenDays.map((day) => day.count)).toEqual([
      1, 0, 0, 1, 0, 0, 0,
    ]);
  });

  it("drops orphaned items instead of inventing missing lesson content", () => {
    const overview = buildReviewOverview(
      [item("unknown-concept", "unknown-question", "2026-07-22T16:00:00Z")],
      lessons,
      new Date("2026-07-23T04:00:00Z"),
    );
    expect(overview.overdue).toEqual([]);
  });
});
