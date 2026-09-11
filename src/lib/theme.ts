import { ThemeMode } from "../types";

const THEME_STORAGE_KEY = "msdq_app_theme";

export function getStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === "dark" || saved === "light" || saved === "system") {
      return saved;
    }
  } catch (e) {
    // ignore
  }
  return "dark"; // default to high-end cyber dark theme
}

export function applyTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (e) {
    // ignore
  }

  const root = document.documentElement;
  if (mode === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  } else if (mode === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
  }
}
