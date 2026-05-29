import type { ThemeMode } from "../../../types";

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem("theme");
  if (isThemeMode(stored)) return stored;

  const applied = document.documentElement.getAttribute("data-theme");
  if (applied === "light" || applied === "dark") return applied;
  return "dark";
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyUiFontSize(size: number) {
  document.documentElement.style.fontSize = `${size}px`;
}
