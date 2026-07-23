import {
  backupSchema,
  defaultUserSettings,
  legacyBackupSchema,
  type ProgressBackup,
} from "@/lib/schemas/progress";
import { DATABASE_VERSION, getDatabase } from "./database";
import { notifyDataChanged } from "./sync-events";

const MAX_IMPORT_SIZE_BYTES = 2_000_000;

export async function exportProgress(): Promise<ProgressBackup> {
  const db = getDatabase();
  const [
    lessonProgress,
    activities,
    readResearch,
    meta,
    researchInteractions,
    savedResearchFilters,
    settings,
  ] = await Promise.all([
    db.lessonProgress.toArray(),
    db.activities.toArray(),
    db.readResearch.toArray(),
    db.meta.toArray(),
    db.researchInteractions.toArray(),
    db.savedResearchFilters.toArray(),
    db.settings.toArray(),
  ]);
  const backup = backupSchema.parse({
    app: "psychology-daily",
    schemaVersion: DATABASE_VERSION,
    exportedAt: new Date().toISOString(),
    lessonProgress,
    activities,
    readResearch,
    meta,
    researchInteractions,
    savedResearchFilters,
    settings: settings.length ? settings : [defaultUserSettings()],
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
  const current = backupSchema.safeParse(parsed);
  if (current.success) return current.data;
  const legacy = legacyBackupSchema.safeParse(parsed);
  if (!legacy.success) {
    throw new Error("備份格式或資料庫版本不相容");
  }
  return backupSchema.parse({
    ...legacy.data,
    schemaVersion: 3,
    researchInteractions: [],
    savedResearchFilters: [],
    settings: [defaultUserSettings(new Date(legacy.data.exportedAt))],
  });
}

export async function importProgress(raw: string): Promise<void> {
  const backup = parseBackup(raw);
  const db = getDatabase();
  const tables = [
    db.lessonProgress,
    db.activities,
    db.readResearch,
    db.meta,
    db.researchInteractions,
    db.savedResearchFilters,
    db.settings,
  ] as const;
  await db.transaction("rw", [...tables], async () => {
    await Promise.all(tables.map((table) => table.clear()));
    await db.lessonProgress.bulkPut(backup.lessonProgress);
    await db.activities.bulkPut(backup.activities);
    await db.readResearch.bulkPut(backup.readResearch);
    await db.meta.bulkPut([
      ...backup.meta.filter((item) => item.key !== "lastBackupAt"),
      { key: "lastBackupAt", value: backup.exportedAt },
    ]);
    await db.researchInteractions.bulkPut(backup.researchInteractions);
    await db.savedResearchFilters.bulkPut(backup.savedResearchFilters);
    await db.settings.bulkPut(
      backup.settings.length ? backup.settings : [defaultUserSettings()],
    );
  });
  notifyDataChanged();
}

export async function clearProgress(): Promise<void> {
  const db = getDatabase();
  const tables = [
    db.lessonProgress,
    db.activities,
    db.readResearch,
    db.meta,
    db.researchInteractions,
    db.savedResearchFilters,
    db.settings,
  ] as const;
  await db.transaction("rw", [...tables], async () => {
    await Promise.all(tables.map((table) => table.clear()));
    await db.settings.put(defaultUserSettings());
  });
  notifyDataChanged();
}
