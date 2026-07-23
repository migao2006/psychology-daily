"use client";
import { useEffect } from "react";
import { applyUserSettings, getUserSettings } from "@/lib/db/settings";
export function PreferencesLoader() {
  useEffect(() => {
    void getUserSettings().then(applyUserSettings);
  }, []);
  return null;
}
