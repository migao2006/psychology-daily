// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ReviewCenter } from "@/components/review/review-center";
import { clearProgress } from "@/lib/db/backup";
import { closeDatabase, getDatabase } from "@/lib/db/database";
import { lessons } from "@/lib/content/lessons";

describe("ReviewCenter", () => {
  afterEach(async () => {
    cleanup();
    await clearProgress().catch(() => undefined);
    await closeDatabase();
  });

  it("completes a due concept and persists an attempt", async () => {
    const lesson = lessons[0];
    const question = lesson.quiz[0];
    await getDatabase().reviewItems.put({
      conceptId: question.conceptId,
      lessonId: lesson.id,
      questionId: question.id,
      nextReviewAt: "2020-01-01T00:00:00Z",
      correctStreak: 0,
      errorCount: 1,
      lastCorrect: false,
      lastFamiliarity: "unknown",
      updatedAt: "2020-01-01T00:00:00Z",
    });
    render(<ReviewCenter lessons={lessons} />);
    await screen.findByRole("heading", { name: question.prompt });
    await userEvent.click(
      screen.getByRole("button", {
        name: question.options[question.correctIndex],
      }),
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "你有多確定？" }),
      "certain",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "送出複習答案" }),
    );
    expect(await screen.findByText(/已更新下次複習日期/)).toBeInTheDocument();
    await waitFor(async () => {
      expect(await getDatabase().reviewAttempts.count()).toBe(1);
    });
  });
});
