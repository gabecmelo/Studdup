// Theme switching for the "soft & rounded" token system (AD-008).
//
// The tokens in `tokens.css` react to a `data-theme` attribute on `<html>`:
//   - no attribute  → follow the OS `prefers-color-scheme`;
//   - "light"/"dark" → force that theme, overriding the OS.
// This module persists the user's choice and keeps the attribute + the live OS listener in sync.

export type Theme = "light" | "dark";

/** What the user picked: a fixed theme, or "system" to follow the OS. */
export type ThemePreference = Theme | "system";

const STORAGE_KEY = "studdup.theme";

/** Read the stored preference, defaulting to "system" when absent or invalid. */
export function getStoredPreference(): ThemePreference {
  if (typeof localStorage === "undefined") return "system";
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

/** Whether the OS currently prefers dark. Safe when `matchMedia` is unavailable (SSR/tests). */
export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolve a preference to the concrete theme that will render. */
export function resolveTheme(pref: ThemePreference): Theme {
  if (pref === "light" || pref === "dark") return pref;
  return systemPrefersDark() ? "dark" : "light";
}

/** Stamp (or clear) the `data-theme` attribute on `<html>` for a preference. */
export function applyPreference(pref: ThemePreference): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (pref === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", pref);
  }
}

/** Persist and apply a preference in one step. */
export function setThemePreference(pref: ThemePreference): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, pref);
  }
  applyPreference(pref);
}

/**
 * Flip between light and dark from whatever is currently showing, and persist the result as a
 * fixed preference. Returns the theme now in effect.
 */
export function toggleTheme(): Theme {
  const current = resolveTheme(getStoredPreference());
  const next: Theme = current === "dark" ? "light" : "dark";
  setThemePreference(next);
  return next;
}

/**
 * Apply the stored preference on startup and keep a "system" preference live as the OS theme
 * changes. Returns a cleanup function that detaches the OS listener.
 */
export function initTheme(): () => void {
  applyPreference(getStoredPreference());

  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    // Only react while following the OS; a fixed choice already owns `data-theme`.
    if (getStoredPreference() === "system") applyPreference("system");
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
