import {
  defaultResearchPreferences,
  researchPreferencesSchema,
  type ResearchPreferences,
} from "@/lib/research/preferences";
import { getDatabase } from "./database";
import { notifyDataChanged } from "./sync-events";

const PREFERENCES_META_KEY = "researchPreferences.v1";

export async function getResearchPreferences(): Promise<ResearchPreferences> {
  const stored = await getDatabase().meta.get(PREFERENCES_META_KEY);
  if (typeof stored?.value !== "string") {
    return defaultResearchPreferences();
  }

  try {
    return researchPreferencesSchema.parse(JSON.parse(stored.value));
  } catch {
    return defaultResearchPreferences();
  }
}

export async function saveResearchPreferences(
  input: Omit<ResearchPreferences, "version" | "updatedAt">,
): Promise<ResearchPreferences> {
  const preferences = researchPreferencesSchema.parse({
    ...input,
    version: 1,
    categories: [...new Set(input.categories)],
    studyTypes: [...new Set(input.studyTypes)],
    updatedAt: new Date().toISOString(),
  });
  await getDatabase().meta.put({
    key: PREFERENCES_META_KEY,
    value: JSON.stringify(preferences),
  });
  notifyDataChanged();
  return preferences;
}

export async function resetResearchPreferences(): Promise<ResearchPreferences> {
  await getDatabase().meta.delete(PREFERENCES_META_KEY);
  notifyDataChanged();
  return defaultResearchPreferences();
}
