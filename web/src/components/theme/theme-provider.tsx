"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, useState, type CSSProperties, type ReactNode } from "react";

type ThemeName = "midnightGarden" | "enchantedForest" | "daylightGarden" | "daylitForest";

type ThemeContextValue = {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

type ThemeVariables = Record<string, string>;

const THEME_STORAGE_KEY = "j2adventures_theme";

const themes: Record<ThemeName, ThemeVariables> = {
  midnightGarden: {
    "--background": "#2C3E34",
    "--text-primary": "#F1F1EE",
    "--text-secondary": "#D3CEC6",
    "--card-bg": "#3A5045",
    "--primary": "#94C794",
    "--primary-light": "#AED8AE",
    "--border": "#4D6A5A",
    "--spinner": "#94C794",
    "--text-shadow": "0 1px 3px rgba(0,0,0,0.3)",
    "--selection-bg": "#94C794",
    "--selection-text": "#1D2C24",
  },
  enchantedForest: {
    "--background": "#1B4332",
    "--text-primary": "#ECF9EE",
    "--text-secondary": "#D0E2D0",
    "--card-bg": "#2D6A4F",
    "--primary": "#9370DB",
    "--primary-light": "#B19CD9",
    "--border": "#40916C",
    "--spinner": "#9370DB",
    "--text-shadow": "0 1px 3px rgba(0,0,0,0.4)",
    "--selection-bg": "#9370DB",
    "--selection-text": "#ffffff",
  },
  daylightGarden: {
    "--background": "linear-gradient(to bottom, #E0E7D9, #C8D1C3)",
    "--text-primary": "#222B26",
    "--text-secondary": "#4A5D54",
    "--card-bg": "#ffffff",
    "--primary": "#6A8E23",
    "--primary-light": "#94B74B",
    "--border": "#d4e6d4",
    "--spinner": "#6A8E23",
    "--text-shadow": "none",
    "--selection-bg": "#6A8E23",
    "--selection-text": "#ffffff",
  },
  daylitForest: {
    "--background": "linear-gradient(to bottom, #F5F5DC, #C1D5C0)",
    "--text-primary": "#102A1E",
    "--text-secondary": "#2A5240",
    "--card-bg": "#ffffff",
    "--primary": "#52B788",
    "--primary-light": "#95D5B2",
    "--border": "#B7CEB7",
    "--spinner": "#52B788",
    "--text-shadow": "none",
    "--selection-bg": "#52B788",
    "--selection-text": "#ffffff",
  },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function NextThemeProvider({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const [currentTheme, setCurrentTheme] = useState<ThemeName>("daylightGarden");

  const resolvedTheme = useMemo<ThemeName>(() => {
    if (!hydrated) {
      return "daylightGarden";
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
    return storedTheme && themes[storedTheme] ? storedTheme : currentTheme;
  }, [currentTheme, hydrated]);

  const value = useMemo<ThemeContextValue>(() => ({
    currentTheme: resolvedTheme,
    setTheme: (theme) => {
      setCurrentTheme(theme);
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    },
    toggleTheme: () => {
      const nextTheme = resolvedTheme.startsWith("day") ? "midnightGarden" : "daylightGarden";
      setCurrentTheme(nextTheme);
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    },
  }), [resolvedTheme]);

  const themeStyle = {
    ...themes[resolvedTheme],
    "--foreground": "var(--text-primary)",
    "--muted": "var(--text-secondary)",
    "--surface": "var(--card-bg)",
    "--surface-strong": "var(--card-bg)",
    "--accent": "var(--primary)",
    "--accent-strong": "var(--primary)",
    "--accent-soft": "rgba(106, 142, 35, 0.12)",
    "--shadow": resolvedTheme.startsWith("day") ? "0 10px 25px rgba(74, 93, 84, 0.1)" : "0 10px 30px rgba(0, 0, 0, 0.35)",
  } as CSSProperties;

  return (
    <ThemeContext.Provider value={value}>
      <div style={themeStyle} className="min-h-screen transition-colors duration-300">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useNextTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useNextTheme must be used within NextThemeProvider");
  }

  return context;
}
