"use client";

// Theme (light/dark) provider — persists preference to localStorage and
// toggles the `dark` class on <html> so Tailwind's dark: variants apply.
// Mirrors the legacy `initTheme()` / `toggleTheme()` from index.html.bak.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "jyp_theme";

interface ThemeContextValue {
  currentTheme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeToDocument(themeValue: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", themeValue === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [currentTheme, setCurrentTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initial = readInitialTheme();
    setCurrentTheme(initial);
    applyThemeToDocument(initial);
  }, []);

  const toggleTheme = useCallback((): void => {
    setCurrentTheme((previousTheme) => {
      const nextTheme: Theme = previousTheme === "dark" ? "light" : "dark";
      applyThemeToDocument(nextTheme);
      if (typeof window !== "undefined") window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  }, []);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({ currentTheme, toggleTheme }),
    [currentTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const contextValue = useContext(ThemeContext);
  if (!contextValue) throw new Error("useTheme must be used inside <ThemeProvider>");
  return contextValue;
}
