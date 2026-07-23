import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { backupSchema } from "@/lib/schemas/progress";
import { createDatabase, closeDatabase, getDatabase } from "@/lib/db/database";
import { clearProgress, exportProgress, importProgress, parseBackup } from "@/lib/db/backup";
import { getResearchPreferences, saveResearchPreferences } from "@/lib/db/research-preferences";
import { completeLesson } from "@/lib/db/progress";
import { lessons } from "@/lib/content/lessons";
describe("IndexedDB migration and backup", () => {
  afterEach(async () => {
    await clearProgress().catch(() => undefined);
    await getDatabase().cloudBindings.clear().catch(() => undefined);
    await closeDatabase();
  });
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
  it("exports, clears and restores strict schema v3 data", async () => {
    const db = getDatabase();
    await db.activities.put({ date: "2026-07-23", completedLesson: true, readResearch: true, completedToday: true });
    await saveResearchPreferences({
      categories: ["認知心理學"],
      studyTypes: ["experimental"],
      preferPeerReviewed: true,
      preferOpenAccess: true,
      learnFromReading: true,
    });
    await db.researchInteractions.put({
      researchId: "research-1",
      favorite: true,
      readLater: false,
      feedback: "more",
      updatedAt: "2026-07-23T12:00:00Z",
    });
    await db.cloudBindings.put({
      id: "primary",
      recoveryCode: `PD1.${"a".repeat(22)}.${"b".repeat(43)}`,
      deviceId: "c".repeat(22),
      status: "active",
      revision: 1,
      boundAt: "2026-07-23T12:00:00Z",
      lastSyncedAt: "2026-07-23T12:00:00Z",
      updatedAt: "2026-07-23T12:00:00Z",
    });
    const backup = await exportProgress();
    expect(backupSchema.parse(backup).schemaVersion).toBe(4);
    expect(backup.researchInteractions).toHaveLength(1);
    expect(JSON.stringify(backup)).not.toContain("PD1.");
    await clearProgress(); expect(await db.activities.count()).toBe(0);
    await importProgress(JSON.stringify(backup)); expect(await db.activities.count()).toBe(1);
    expect((await getResearchPreferences()).categories).toEqual(["認知心理學"]);
  });
  it("does not confuse cloud snapshots with a local backup", async () => {
    const db = getDatabase();
    await db.meta.put({
      key: "lastBackupAt",
      value: "2026-07-20T00:00:00.000Z",
    });
    await exportProgress();
    expect((await db.meta.get("lastBackupAt"))?.value).toBe(
      "2026-07-20T00:00:00.000Z",
    );
    const localBackup = await exportProgress({ recordLocalBackup: true });
    expect((await db.meta.get("lastBackupAt"))?.value).toBe(
      localBackup.exportedAt,
    );
  });
  it("preserves this device's local backup time during cloud restore", async () => {
    const db = getDatabase();
    const remote = await exportProgress();
    await db.meta.put({
      key: "lastBackupAt",
      value: "2026-07-19T00:00:00.000Z",
    });
    await importProgress(JSON.stringify(remote), {
      preserveLocalBackupTimestamp: true,
    });
    expect((await db.meta.get("lastBackupAt"))?.value).toBe(
      "2026-07-19T00:00:00.000Z",
    );
  });
  it("adds empty concept review tables when upgrading schema v3", async () => {
    const name = `migration-v3-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(3).stores({
      lessonProgress: "&lessonId",
      activities: "&date",
      readResearch: "&researchId",
      meta: "&key",
      researchInteractions: "&researchId",
      savedResearchFilters: "&id",
      settings: "&key",
      cloudBindings: "&id",
    });
    await old.open();
    old.close();
    const upgraded = createDatabase(name);
    await upgraded.open();
    expect(await upgraded.reviewItems.count()).toBe(0);
    expect(await upgraded.reviewAttempts.count()).toBe(0);
    upgraded.close();
    await Dexie.delete(name);
  });
  it("migrates a strict schema v2 export to schema v4 defaults", () => {
    const migrated = parseBackup(JSON.stringify({
      app: "psychology-daily",
      schemaVersion: 2,
      exportedAt: "2026-07-23T00:00:00Z",
      lessonProgress: [],
      activities: [],
      readResearch: [],
      meta: [],
    }));
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.researchInteractions).toEqual([]);
    expect(migrated.settings[0].theme).toBe("system");
    expect(migrated.reviewItems).toEqual([]);
  });
  it("migrates a strict schema v3 export without losing synced settings", () => {
    const migrated = parseBackup(JSON.stringify({
      app: "psychology-daily",
      schemaVersion: 3,
      exportedAt: "2026-07-23T00:00:00Z",
      lessonProgress: [],
      activities: [],
      readResearch: [],
      meta: [],
      researchInteractions: [],
      savedResearchFilters: [],
      settings: [{
        key: "userSettings",
        theme: "dark",
        fontSize: "large",
        seenOnboarding: true,
        lastPage: "/review",
        updatedAt: "2026-07-23T00:00:00Z",
      }],
    }));
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.settings[0].theme).toBe("dark");
    expect(migrated.reviewAttempts).toEqual([]);
  });
  it("rejects unknown, executable-looking or wrong-version imports", () => {
    expect(() => parseBackup('{"app":"psychology-daily","schemaVersion":99}')).toThrow();
    expect(() => parseBackup('{"app":"psychology-daily","schemaVersion":2,"exportedAt":"2026-07-23T00:00:00Z","lessonProgress":[],"activities":[],"readResearch":[],"meta":[],"script":"alert(1)"}')).toThrow();
  });
  it("creates an independent review schedule for every lesson concept", async () => {
    const lesson = lessons[0];
    await completeLesson({
      lessonId: lesson.id,
      familiarity: "unsure",
      concepts: lesson.quiz.map(({ id, conceptId }) => ({
        questionId: id,
        conceptId,
      })),
      answers: lesson.quiz.map((question, index) => ({
        questionId: question.id,
        selectedIndex: index === 0 ? question.correctIndex : (question.correctIndex + 1) % question.options.length,
        correct: index === 0,
        answeredAt: new Date().toISOString(),
      })),
    });
    const reviewItems = await getDatabase().reviewItems.toArray();
    expect(reviewItems).toHaveLength(lesson.quiz.length);
    expect(reviewItems.find((item) => item.conceptId === lesson.quiz[1].conceptId)?.errorCount).toBe(1);
  });
});
