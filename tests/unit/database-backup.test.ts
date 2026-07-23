import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { backupSchema } from "@/lib/schemas/progress";
import { createDatabase, closeDatabase, getDatabase } from "@/lib/db/database";
import { clearProgress, exportProgress, importProgress, parseBackup } from "@/lib/db/backup";
import { getResearchPreferences, saveResearchPreferences } from "@/lib/db/research-preferences";
describe("IndexedDB migration and backup", () => {
  afterEach(async () => { await clearProgress().catch(() => undefined); await closeDatabase(); });
  it("migrates version 1 lesson rows to version 2 fields", async () => {
    const name = `migration-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(1).stores({ lessonProgress: "&lessonId,completedAt,nextReviewAt,updatedAt", activities: "&date", readResearch: "&researchId" });
    await old.open();
    await old.table("lessonProgress").put({ lessonId: "lesson-01", completedAt: null, quizAnswers: [], correctCount: 0, totalCount: 0, nextReviewAt: null, updatedAt: new Date().toISOString() });
    old.close();
    const upgraded = createDatabase(name); await upgraded.open();
    const row = await upgraded.lessonProgress.get("lesson-01");
    expect(row?.familiarity).toBe("unsure"); expect(row?.correctReviewStreak).toBe(0); expect(row?.errorCount).toBe(0);
    upgraded.close(); await Dexie.delete(name);
  });
  it("exports, clears and restores strict schema v2 data", async () => {
    const db = getDatabase();
    await db.activities.put({ date: "2026-07-23", completedLesson: true, readResearch: true, completedToday: true });
    await saveResearchPreferences({
      categories: ["認知心理學"],
      studyTypes: ["experimental"],
      preferPeerReviewed: true,
      preferOpenAccess: true,
      learnFromReading: true,
    });
    const backup = await exportProgress();
    expect(backupSchema.parse(backup).schemaVersion).toBe(2);
    await clearProgress(); expect(await db.activities.count()).toBe(0);
    await importProgress(JSON.stringify(backup)); expect(await db.activities.count()).toBe(1);
    expect((await getResearchPreferences()).categories).toEqual(["認知心理學"]);
  });
  it("rejects unknown, executable-looking or wrong-version imports", () => {
    expect(() => parseBackup('{"app":"psychology-daily","schemaVersion":99}')).toThrow();
    expect(() => parseBackup('{"app":"psychology-daily","schemaVersion":2,"exportedAt":"2026-07-23T00:00:00Z","lessonProgress":[],"activities":[],"readResearch":[],"meta":[],"script":"alert(1)"}')).toThrow();
  });
});
