"use client";
import { useEffect } from "react";
export function PreferencesLoader() {
  useEffect(() => {
    const theme = localStorage.getItem("psychology-daily:theme");
    document.documentElement.dataset.theme = theme === "dark" || theme === "light" ? theme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const font = localStorage.getItem("psychology-daily:font-size");
    document.documentElement.dataset.fontSize = font === "large" || font === "xlarge" ? font : "normal";
    if (!localStorage.getItem("psychology-daily:seen-onboarding")) {
      localStorage.setItem("psychology-daily:seen-onboarding", "true");
    }
  }, []);
  return null;
}
