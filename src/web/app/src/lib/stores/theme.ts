/**
 * Theme Store
 *
 * Manages the application theme (light/dark) with system preference detection
 * and localStorage persistence.
 */

import { writable, derived, get } from "svelte/store";

export type Theme = "light" | "dark" | "system";

// localStorage keys
const THEME_PREFERENCE_KEY = "pi-brain-theme-preference";
const SYSTEM_THEME_KEY = "pi-brain-system-theme";

// Theme preference store - what the user explicitly chose
const createThemePreferenceStore = () => {
  // Load from localStorage or default to "system"
  const initialValue = loadThemePreference();

  const { subscribe, set, update } = writable<Theme>(initialValue);

  return {
    subscribe,
    set: (value: Theme) => {
      saveThemePreference(value);
      set(value);
    },
    update,
  };
};

function loadThemePreference(): Theme {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const saved = localStorage.getItem(THEME_PREFERENCE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    // localStorage may be unavailable
  }

  return "system";
}

function saveThemePreference(theme: Theme): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(THEME_PREFERENCE_KEY, theme);
  } catch {
    // localStorage may be unavailable
  }
}

// Helper to get initial system theme
function getInitialSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// System theme store - tracks the actual system preference
const createSystemThemeStore = () => {
  const { subscribe, set } = writable<"light" | "dark">(
    getInitialSystemTheme()
  );

  return { subscribe, set };
};

export const themePreference = createThemePreferenceStore();
export const systemTheme = createSystemThemeStore();

// Active theme store - the actual theme being used
// Derived from preference, falling back to system theme when preference is "system"
export const activeTheme = derived(
  [themePreference, systemTheme],
  ([$preference, $systemTheme]) =>
    $preference === "system" ? $systemTheme : $preference
);

// Track system theme changes
export function initTheme(): () => void {
  if (typeof window === "undefined") {
    // Return no-op cleanup function for SSR
    return () => {
      /* No-op: no listeners to clean up in SSR context */
    };
  }

  // Listen for system theme changes
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleChange = (event: MediaQueryListEvent) => {
    const newSystemTheme = event.matches ? "dark" : "light";
    // Update systemTheme store by creating a new one (writable doesn't expose update)
    // Instead, we'll handle this in the application layer
    updateSystemTheme(newSystemTheme);
  };

  // Apply the initial theme
  applyTheme(get(activeTheme));

  // Set up the listener
  mediaQuery.addEventListener("change", handleChange);

  // Return cleanup function
  return () => {
    mediaQuery.removeEventListener("change", handleChange);
  };
}

function updateSystemTheme(theme: "light" | "dark"): void {
  if (typeof window === "undefined") {
    return;
  }

  // Update the systemTheme store
  systemTheme.set(theme);

  // Store in localStorage for persistence across sessions
  try {
    localStorage.setItem(SYSTEM_THEME_KEY, theme);
  } catch {
    // localStorage may be unavailable
  }
}

// Apply the theme to the document
export function applyTheme(theme: "light" | "dark"): void {
  if (typeof document === "undefined") {
    return;
  }

  // Remove both theme classes
  document.documentElement.classList.remove("light", "dark");

  // Add the active theme class
  document.documentElement.classList.add(theme);

  // Store in localStorage for SSR hydration
  try {
    localStorage.setItem(SYSTEM_THEME_KEY, theme);
  } catch {
    // localStorage may be unavailable
  }
}

// Helper to toggle between light and dark
export function toggleTheme(): void {
  const current = get(themePreference);

  // Lookup table for next theme based on current preference
  const nextThemeMap: Record<Theme, Theme | null> = {
    light: "dark",
    dark: "light",
    system: null, // Handle separately
  };

  const nextTheme = nextThemeMap[current];

  if (nextTheme === null) {
    // If system, switch to the opposite of current active theme
    const active = get(activeTheme);
    themePreference.set(active === "light" ? "dark" : "light");
  } else {
    themePreference.set(nextTheme);
  }
}
