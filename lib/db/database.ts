import Dexie, { type EntityTable } from "dexie";
import type {
  AppMeta,
  DailyActivity,
  LessonProgress,
  ReadResearch,
} from "@/lib/schemas/progress";

export const DATABASE_NAME = "psychology-daily";
export const DATABASE_VERSION = 2;

export type PsychologyDailyDb = Dexie & {
  lessonProgress: EntityTable<LessonProgress, "lessonId">;
  activities: EntityTable<DailyActivity, "date">;
  readResearch: EntityTable<ReadResearch, "researchId">;
  meta: EntityTable<AppMeta, "key">;
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
