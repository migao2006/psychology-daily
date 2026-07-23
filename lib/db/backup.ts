import { backupSchema, type ProgressBackup } from "@/lib/schemas/progress";
import { DATABASE_VERSION, getDatabase } from "./database";

const MAX_IMPORT_SIZE_BYTES = 2_000_000;

export async function exportProgress(): Promise<ProgressBackup> {
  const db = getDatabase();
  const [lessonProgress, activities, readResearch, meta] = await Promise.all([
    db.lessonProgress.toArray(),
    db.activities.toArray(),
    db.readResearch.toArray(),
    db.meta.toArray(),
  ]);
  const backup = backupSchema.parse({
    app: "psychology-daily",
    schemaVersion: DATABASE_VERSION,
    exportedAt: new Date().toISOString(),
    lessonProgress,
    activities,
    readResearch,
    meta,
  });
  await db.meta.put({ key: "lastBackupAt", value: backup.exportedAt });
  return backup;
}

export function parseBackup(raw: string): ProgressBackup {
  if (new TextEncoder().encode(raw).byteLength > MAX_IMPORT_SIZE_BYTES) {
    throw new Error("備份檔案超過 2 MB，已拒絕匯入");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("備份檔案不是有效的 JSON");
  }
  const result = backupSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("備份格式或資料庫版本不相容");
  }
  return result.data;
}

export async function importProgress(raw: string): Promise<void> {
  const backup = parseBackup(raw);
  const db = getDatabase();
  await db.transaction(
    "rw",
    [db.lessonProgress, db.activities, db.readResearch, db.meta],
    async () => {
      await Promise.all([
        db.lessonProgress.clear(),
        db.activities.clear(),
        db.readResearch.clear(),
        db.meta.clear(),
      ]);
      await db.lessonProgress.bulkPut(backup.lessonProgress);
      await db.activities.bulkPut(backup.activities);
      await db.readResearch.bulkPut(backup.readResearch);
      await db.meta.bulkPut([
        ...backup.meta.filter((item) => item.key !== "lastBackupAt"),
        { key: "lastBackupAt", value: backup.exportedAt },
      ]);
    },
  );
}

export async function clearProgress(): Promise<void> {
  const db = getDatabase();
  await db.transaction(
    "rw",
    [db.lessonProgress, db.activities, db.readResearch, db.meta],
    async () => {
      await Promise.all([
        db.lessonProgress.clear(),
        db.activities.clear(),
        db.readResearch.clear(),
        db.meta.clear(),
      ]);
    },
  );
}

