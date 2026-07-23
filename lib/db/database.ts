import Dexie, { type EntityTable } from "dexie";
import {
  defaultUserSettings,
  type AppMeta,
  type CloudBinding,
  type DailyActivity,
  type LessonProgress,
  type ReadResearch,
  type ResearchInteraction,
  type ReviewAttempt,
  type ReviewItem,
  type SavedResearchFilter,
  type UserSettings,
} from "@/lib/schemas/progress";

export const DATABASE_NAME = "psychology-daily";
export const DATABASE_VERSION = 4;

export type PsychologyDailyDb = Dexie & {
  lessonProgress: EntityTable<LessonProgress, "lessonId">;
  activities: EntityTable<DailyActivity, "date">;
  readResearch: EntityTable<ReadResearch, "researchId">;
  meta: EntityTable<AppMeta, "key">;
  researchInteractions: EntityTable<ResearchInteraction, "researchId">;
  savedResearchFilters: EntityTable<SavedResearchFilter, "id">;
  settings: EntityTable<UserSettings, "key">;
  cloudBindings: EntityTable<CloudBinding, "id">;
  reviewItems: EntityTable<ReviewItem, "conceptId">;
  reviewAttempts: EntityTable<ReviewAttempt, "id">;
};

let database: PsychologyDailyDb | null = null;

export function createDatabase(name = DATABASE_NAME): PsychologyDailyDb {
  const db = new Dexie(name) as PsychologyDailyDb;

  db.version(1).stores({
    lessonProgress: "&lessonId,completedAt,nextReviewAt,updatedAt",
    activities: "&date,completedToday",
    readResearch: "&researchId,readAt",
  });

  db.version(2)
    .stores({
      lessonProgress: "&lessonId,completedAt,nextReviewAt,updatedAt",
      activities: "&date,completedToday",
      readResearch: "&researchId,readAt",
      meta: "&key",
    })
    .upgrade(async (transaction) => {
      await transaction
        .table<LessonProgress, string>("lessonProgress")
        .toCollection()
        .modify((entry) => {
          entry.correctReviewStreak ??= 0;
          entry.errorCount ??= 0;
          entry.familiarity ??= "unsure";
        });
    });

  db.version(3)
    .stores({
      lessonProgress: "&lessonId,completedAt,nextReviewAt,updatedAt",
      activities: "&date,completedToday",
      readResearch: "&researchId,readAt",
      meta: "&key",
      researchInteractions: "&researchId,updatedAt,feedback,favorite,readLater",
      savedResearchFilters: "&id,updatedAt",
      settings: "&key,updatedAt",
      cloudBindings: "&id,status,updatedAt",
    })
    .upgrade(async (transaction) => {
      await transaction.table<UserSettings, string>("settings").put(
        defaultUserSettings(),
      );
    });

  db.version(4).stores({
    lessonProgress: "&lessonId,completedAt,nextReviewAt,updatedAt",
    activities: "&date,completedToday",
    readResearch: "&researchId,readAt",
    meta: "&key",
    researchInteractions: "&researchId,updatedAt,feedback,favorite,readLater",
    savedResearchFilters: "&id,updatedAt",
    settings: "&key,updatedAt",
    cloudBindings: "&id,status,updatedAt",
    reviewItems: "&conceptId,lessonId,questionId,nextReviewAt,errorCount,updatedAt",
    reviewAttempts: "&id,conceptId,lessonId,questionId,answeredAt",
  });

  return db;
}

export function getDatabase(): PsychologyDailyDb {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB 只能在瀏覽器中使用");
  }
  database ??= createDatabase();
  return database;
}

export async function closeDatabase(): Promise<void> {
  if (database) {
    database.close();
    database = null;
  }
}
