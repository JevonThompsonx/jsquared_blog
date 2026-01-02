import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { ThemeName } from "../../../shared/src/types";
import { useAuth } from "./AuthContext";

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "j2adventures_theme";
const VALID_THEMES: ThemeName[] = [
  "midnightGarden",
  "enchantedForest",
  "daylightGarden",
  "daylitForest",
];

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user, updateProfile } = useAuth();

  // Initialize from localStorage or default
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && VALID_THEMES.includes(stored as ThemeName)) {
        return stored as ThemeName;
      }
    }
    return "daylightGarden";
  });

  // Sync with user preference when logged in
  useEffect(() => {
    if (user?.theme_preference && VALID_THEMES.includes(user.theme_preference)) {
      setCurrentTheme(user.theme_preference);
      localStorage.setItem(THEME_STORAGE_KEY, user.theme_preference);
    }
  }, [user?.theme_preference]);

  const setTheme = async (theme: ThemeName) => {
    setCurrentTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // Persist to database if logged in
    if (user) {
      try {
        await updateProfile({ theme_preference: theme });
      } catch (error) {
        console.error("Failed to save theme preference:", error);
      }
    }
  };

  const toggleTheme = () => {
    const newTheme = currentTheme.startsWith("day")
      ? "midnightGarden"
      : "daylightGarden";
    setTheme(newTheme);
  };

  const isDark = !currentTheme.startsWith("day");

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
