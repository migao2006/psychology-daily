import {
  defaultUserSettings,
  userSettingsSchema,
  type UserSettings,
} from "@/lib/schemas/progress";
import { getDatabase } from "./database";
import { notifyDataChanged } from "./sync-events";

export async function getUserSettings(): Promise<UserSettings> {
  const stored = await getDatabase().settings.get("userSettings");
  return stored ? userSettingsSchema.parse(stored) : defaultUserSettings();
}

export async function saveUserSettings(
  changes: Partial<Omit<UserSettings, "key" | "updatedAt">>,
): Promise<UserSettings> {
  const current = await getUserSettings();
  const next = userSettingsSchema.parse({
    ...current,
    ...changes,
    key: "userSettings",
    updatedAt: new Date().toISOString(),
  });
  await getDatabase().settings.put(next);
  notifyDataChanged();
  return next;
}

export function applyUserSettings(settings: UserSettings): void {
  const systemDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme =
    settings.theme === "system" ? (systemDark ? "dark" : "light") : settings.theme;
  document.documentElement.dataset.fontSize = settings.fontSize;
}
