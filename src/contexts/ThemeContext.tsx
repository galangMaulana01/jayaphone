"use client";

// The authenticated product has one deliberate charcoal workspace. Keep this
// context for existing consumers, but do not restore a local light preference
// that would create a hybrid workspace after the visible switch was removed.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Theme = "light" | "dark";
const FIXED_WORKSPACE_THEME: Theme = "dark";

interface ThemeContextValue {
  currentTheme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDocument(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("dark");
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [currentTheme] = useState<Theme>(FIXED_WORKSPACE_THEME);

  useEffect(() => {
    applyThemeToDocument();
  }, []);

  // Retained for compatibility with existing consumers. The workspace no
  // longer exposes a user-facing theme switch, so this intentionally keeps
  // the presentation fixed instead of persisting another palette.
  const toggleTheme = useCallback((): void => {
    applyThemeToDocument();
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
