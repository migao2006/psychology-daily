import {
  researchInteractionSchema,
  savedResearchFilterSchema,
  type ResearchInteraction,
  type SavedResearchFilter,
} from "@/lib/schemas/progress";
import { getDatabase } from "./database";
import { notifyDataChanged } from "./sync-events";

export async function saveResearchInteraction(
  researchId: string,
  changes: Partial<Pick<ResearchInteraction, "favorite" | "readLater" | "feedback">>,
): Promise<ResearchInteraction> {
  const current = await getDatabase().researchInteractions.get(researchId);
  const next = researchInteractionSchema.parse({
    researchId,
    favorite: current?.favorite ?? false,
    readLater: current?.readLater ?? false,
    feedback: current?.feedback ?? null,
    ...changes,
    updatedAt: new Date().toISOString(),
  });
  await getDatabase().researchInteractions.put(next);
  notifyDataChanged();
  return next;
}

export async function clearResearchInteractions(): Promise<void> {
  await getDatabase().researchInteractions.clear();
  notifyDataChanged();
}

export async function saveResearchFilter(
  input: Omit<SavedResearchFilter, "id" | "updatedAt"> & { id?: string },
): Promise<SavedResearchFilter> {
  const db = getDatabase();
  if (!input.id && (await db.savedResearchFilters.count()) >= 10) {
    throw new Error("最多可儲存 10 組篩選條件");
  }
  const saved = savedResearchFilterSchema.parse({
    ...input,
    id: input.id ?? crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  });
  await db.savedResearchFilters.put(saved);
  notifyDataChanged();
  return saved;
}

export async function deleteResearchFilter(id: string): Promise<void> {
  await getDatabase().savedResearchFilters.delete(id);
  notifyDataChanged();
}
