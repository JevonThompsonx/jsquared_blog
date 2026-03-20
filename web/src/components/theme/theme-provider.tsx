"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, useState, type CSSProperties, type ReactNode } from "react";

type ThemeMode = "light" | "dark";
type ThemeLook = "sage" | "lichen";

type ThemeContextValue = {
  currentTheme: `${ThemeMode}-${ThemeLook}`;
  mode: ThemeMode;
  look: ThemeLook;
  lookLabel: string;
  lookDescription: string;
  lightLook: ThemeLook;
  darkLook: ThemeLook;
  lightLookLabel: string;
  darkLookLabel: string;
  availableLooks: Array<{ value: ThemeLook; label: string; description: string; swatches: string[] }>;
  setMode: (mode: ThemeMode) => void;
  setLook: (look: ThemeLook) => void;
  toggleMode: () => void;
  cycleLook: () => void;
  /** Atomically restore all three theme dimensions from a saved preference. */
  restorePreference: (mode: ThemeMode, lightLook: ThemeLook, darkLook: ThemeLook) => void;
};

type ThemeVariables = CSSProperties & Record<`--${string}`, string>;

const MODE_STORAGE_KEY = "j2adventures_theme_mode";
const LIGHT_LOOK_STORAGE_KEY = "j2adventures_theme_look_light";
const DARK_LOOK_STORAGE_KEY = "j2adventures_theme_look_dark";
const THEME_COOKIE = "j2_theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function isThemeLook(value: unknown): value is ThemeLook {
  return value === "sage" || value === "lichen";
}

function readThemeCookie(): { mode: ThemeMode | null; lightLook: ThemeLook | null; darkLook: ThemeLook | null } {
  try {
    const match = document.cookie.match(/(?:^|; )j2_theme=([^;]*)/);
    if (!match?.[1]) return { mode: null, lightLook: null, darkLook: null };
    const parsed: unknown = JSON.parse(decodeURIComponent(match[1]));
    if (!isRecord(parsed)) {
      return { mode: null, lightLook: null, darkLook: null };
    }

    const m = parsed["mode"];
    const ll = parsed["lightLook"];
    const dl = parsed["darkLook"];

    return {
      mode: isThemeMode(m) ? m : null,
      lightLook: isThemeLook(ll) ? ll : null,
      darkLook: isThemeLook(dl) ? dl : null,
    };
  } catch {
    return { mode: null, lightLook: null, darkLook: null };
  }
}

function writeThemeCookie(mode: ThemeMode, lightLook: ThemeLook, darkLook: ThemeLook) {
  const value = JSON.stringify({ mode, lightLook, darkLook });
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(value)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

function readStoredThemePreference(): { mode: ThemeMode; lightLook: ThemeLook; darkLook: ThemeLook } {
  if (typeof window === "undefined") {
    return { mode: "light", lightLook: "sage", darkLook: "lichen" };
  }

  let storedMode = window.localStorage.getItem(MODE_STORAGE_KEY);
  let storedLightLook = window.localStorage.getItem(LIGHT_LOOK_STORAGE_KEY);
  let storedDarkLook = window.localStorage.getItem(DARK_LOOK_STORAGE_KEY);

  if (!storedMode || !storedLightLook || !storedDarkLook) {
    const cookie = readThemeCookie();
    if (!storedMode && cookie.mode) {
      storedMode = cookie.mode;
      window.localStorage.setItem(MODE_STORAGE_KEY, cookie.mode);
    }
    if (!storedLightLook && cookie.lightLook) {
      storedLightLook = cookie.lightLook;
      window.localStorage.setItem(LIGHT_LOOK_STORAGE_KEY, cookie.lightLook);
    }
    if (!storedDarkLook && cookie.darkLook) {
      storedDarkLook = cookie.darkLook;
      window.localStorage.setItem(DARK_LOOK_STORAGE_KEY, cookie.darkLook);
    }
  }

  return {
    mode: storedMode === "dark" ? "dark" : "light",
    lightLook: isThemeLook(storedLightLook) ? storedLightLook : "sage",
    darkLook: isThemeLook(storedDarkLook) ? storedDarkLook : "lichen",
  };
}

/** Returns true if localStorage already has a saved theme mode — used by UserThemeSync. */
export function hasStoredThemePreference(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(MODE_STORAGE_KEY));
}

const LOOK_ORDER: ThemeLook[] = ["sage", "lichen"];
const LOOK_LABELS: Record<ThemeLook, string> = {
  sage: "Moss & Linen",
  lichen: "Lichen Light",
};
const LOOK_DESCRIPTIONS: Record<ThemeLook, string> = {
  sage: "Creamy moss-and-linen neutrals with calm green depth for an earthy night look.",
  lichen: "A bright yellow-green palette with blue-green depth and cleaner daylight contrast.",
};
const LOOK_SWATCHES: Record<ThemeLook, string[]> = {
  sage: ["#7c9557", "#557468", "#fdf8ef", "#2f4037"],
  lichen: ["#9aae58", "#5f877b", "#fffaf1", "#33433a"],
};

const themePresets: Record<ThemeMode, Record<ThemeLook, ThemeVariables>> = {
  light: {
    sage: {
      "--background": "linear-gradient(180deg, #f6f2e8 0%, #e9e6d7 44%, #dbe2d4 100%)",
      "--text-primary": "#293328",
      "--text-secondary": "#59665d",
      "--text-highlight": "linear-gradient(90deg, #7c9557 0%, #557468 100%)",
      "--card-bg": "#fdf8ef",
      "--primary": "#7c9557",
      "--primary-light": "#9aae58",
      "--on-primary": "#ffffff",
      "--btn-bg": "#3d5427",
      "--btn-text": "#c8eb75",
      "--border": "#d9d1c1",
      "--spinner": "#7c9557",
      "--text-shadow": "none",
      "--selection-bg": "#7c9557",
      "--selection-text": "#fffdf8",
      "--foreground": "#293328",
      "--muted": "#59665d",
      "--surface": "rgba(253, 248, 239, 0.88)",
      "--surface-strong": "#fdf8ef",
      "--accent": "#7c9557",
      "--accent-strong": "#557468",
      "--accent-soft": "rgba(124, 149, 87, 0.12)",
      "--primary-soft": "rgba(124, 149, 87, 0.12)",
      "--shadow": "0 18px 42px rgba(68, 72, 58, 0.11)",
      "--ring": "rgba(124, 149, 87, 0.18)",
      "--header-bg": "rgba(253, 248, 239, 0.76)",
      "--header-border": "rgba(117, 128, 109, 0.16)",
      "--input-bg": "rgba(255, 252, 246, 0.94)",
      "--input-border": "#d9d1c1",
      "--input-text": "#293328",
      "--hero-panel-bg": "linear-gradient(135deg, rgba(40, 49, 38, 0.70) 0%, rgba(78, 101, 90, 0.42) 100%)",
      "--hero-panel-border": "rgba(255, 250, 240, 0.22)",
      "--hero-shadow": "0 22px 60px rgba(25, 34, 28, 0.24)",
      "--card-shell-bg": "#f7f2e8",
      "--card-shell-shadow": "0 14px 34px rgba(64, 60, 50, 0.10)",
      "--card-shell-shadow-hover": "0 20px 42px rgba(52, 50, 42, 0.16)",
      "--card-panel-bg": "linear-gradient(180deg, #fdf8ef 0%, #f1eadc 100%)",
      "--card-panel-border": "#d9d1c1",
      "--card-panel-border-hover": "#b7c49d",
      "--card-title": "#293328",
      "--card-body": "#59665d",
      "--card-meta": "#707a70",
      "--card-kicker": "#7c9557",
      "--card-chip-bg": "rgba(124, 149, 87, 0.10)",
      "--card-chip-border": "rgba(85, 116, 104, 0.16)",
      "--card-chip-text": "#647950",
      "--card-link": "#557468",
      "--card-link-hover": "#7c9557",
      "--overlay-scrim": "linear-gradient(180deg, rgba(18, 23, 18, 0.08) 0%, rgba(18, 24, 19, 0.26) 38%, rgba(15, 20, 16, 0.86) 100%)",
      "--overlay-panel-bg": "linear-gradient(180deg, rgba(48, 63, 54, 0.22) 0%, rgba(39, 52, 45, 0.88) 28%, rgba(24, 33, 27, 0.98) 100%)",
      "--overlay-panel-border": "rgba(246, 239, 227, 0.18)",
      "--overlay-panel-shadow": "0 -18px 40px rgba(8, 12, 9, 0.28)",
      "--overlay-title": "#fff9ef",
      "--overlay-body": "rgba(248, 243, 232, 0.94)",
      "--overlay-meta": "rgba(230, 225, 213, 0.86)",
      "--overlay-kicker": "#dce8bc",
      "--overlay-chip-bg": "rgba(255, 249, 239, 0.13)",
      "--overlay-chip-border": "rgba(255, 249, 239, 0.18)",
      "--overlay-chip-text": "#fff9ef",
      "--card-image-filter": "saturate(0.98) contrast(1.01)",
    },
    lichen: {
      "--background": "linear-gradient(180deg, #fbf7eb 0%, #e8ecd8 50%, #d6e1d9 100%)",
      "--text-primary": "#273228",
      "--text-secondary": "#5f7067",
      "--text-highlight": "linear-gradient(90deg, #9aae58 0%, #5f877b 100%)",
      "--card-bg": "#fffaf1",
      "--primary": "#9aae58",
      "--primary-light": "#bbca79",
      "--on-primary": "#1e2f1f",
      "--btn-bg": "#3a5432",
      "--btn-text": "#c8eb75",
      "--border": "#d8d8c7",
      "--spinner": "#9aae58",
      "--text-shadow": "none",
      "--selection-bg": "#9aae58",
      "--selection-text": "#fffdf8",
      "--foreground": "#273228",
      "--muted": "#5f7067",
      "--surface": "rgba(255, 250, 241, 0.88)",
      "--surface-strong": "#fffaf1",
      "--accent": "#9aae58",
      "--accent-strong": "#5f877b",
      "--accent-soft": "rgba(154, 174, 88, 0.14)",
      "--primary-soft": "rgba(154, 174, 88, 0.12)",
      "--shadow": "0 18px 42px rgba(78, 85, 62, 0.13)",
      "--ring": "rgba(154, 174, 88, 0.22)",
      "--header-bg": "rgba(255, 250, 241, 0.76)",
      "--header-border": "rgba(121, 139, 111, 0.16)",
      "--input-bg": "rgba(255, 253, 247, 0.94)",
      "--input-border": "#d8d8c7",
      "--input-text": "#273228",
      "--hero-panel-bg": "linear-gradient(135deg, rgba(45, 56, 37, 0.72) 0%, rgba(67, 102, 92, 0.42) 100%)",
      "--hero-panel-border": "rgba(255, 250, 240, 0.24)",
      "--hero-shadow": "0 22px 60px rgba(28, 36, 28, 0.24)",
      "--card-shell-bg": "#f8f4e8",
      "--card-shell-shadow": "0 14px 34px rgba(69, 70, 54, 0.12)",
      "--card-shell-shadow-hover": "0 20px 42px rgba(57, 58, 45, 0.18)",
      "--card-panel-bg": "linear-gradient(180deg, #fffaf1 0%, #eef0df 100%)",
      "--card-panel-border": "#d8d6c1",
      "--card-panel-border-hover": "#abc08a",
      "--card-title": "#2a3429",
      "--card-body": "#5d6e63",
      "--card-meta": "#738177",
      "--card-kicker": "#6d927e",
      "--card-chip-bg": "rgba(154, 174, 88, 0.10)",
      "--card-chip-border": "rgba(95, 135, 123, 0.18)",
      "--card-chip-text": "#617a53",
      "--card-link": "#6d927e",
      "--card-link-hover": "#9aae58",
      "--overlay-scrim": "linear-gradient(180deg, rgba(15, 21, 16, 0.08) 0%, rgba(19, 28, 22, 0.28) 38%, rgba(17, 26, 20, 0.88) 100%)",
      "--overlay-panel-bg": "linear-gradient(180deg, rgba(54, 76, 63, 0.22) 0%, rgba(41, 59, 49, 0.88) 28%, rgba(24, 36, 29, 0.98) 100%)",
      "--overlay-panel-border": "rgba(255, 247, 233, 0.18)",
      "--overlay-panel-shadow": "0 -18px 40px rgba(10, 14, 11, 0.30)",
      "--overlay-title": "#fffaf0",
      "--overlay-body": "rgba(249, 244, 233, 0.94)",
      "--overlay-meta": "rgba(230, 225, 211, 0.86)",
      "--overlay-kicker": "#dcebaf",
      "--overlay-chip-bg": "rgba(255, 247, 233, 0.13)",
      "--overlay-chip-border": "rgba(255, 247, 233, 0.18)",
      "--overlay-chip-text": "#fffaf0",
      "--card-image-filter": "saturate(0.98) contrast(1.01)",
    },
  },
  dark: {
    sage: {
      "--background": "linear-gradient(180deg, #19231d 0%, #223029 44%, #2b3a32 100%)",
      "--text-primary": "#f4f1e7",
      "--text-secondary": "#d0d4c5",
      "--text-highlight": "linear-gradient(90deg, #d5e39a 0%, #9cc7bc 100%)",
      "--card-bg": "#314138",
      "--primary": "#b9ce84",
      "--primary-light": "#d5e5a8",
      "--on-primary": "#17211b",
      "--btn-bg": "#b9ce84",
      "--btn-text": "#17211b",
      "--border": "#495b50",
      "--spinner": "#b9ce84",
      "--text-shadow": "0 1px 3px rgba(0,0,0,0.24)",
      "--selection-bg": "#b9ce84",
      "--selection-text": "#17211b",
      "--foreground": "#f4f1e7",
      "--muted": "#d0d4c5",
      "--surface": "rgba(49, 65, 56, 0.90)",
      "--surface-strong": "#314138",
      "--accent": "#b9ce84",
      "--accent-strong": "#8fb3ab",
      "--accent-soft": "rgba(185, 206, 132, 0.14)",
      "--primary-soft": "rgba(185, 206, 132, 0.15)",
      "--shadow": "0 20px 48px rgba(0, 0, 0, 0.30)",
      "--ring": "rgba(185, 206, 132, 0.22)",
      "--header-bg": "rgba(25, 35, 29, 0.82)",
      "--header-border": "rgba(235, 240, 224, 0.10)",
      "--input-bg": "rgba(49, 65, 56, 0.92)",
      "--input-border": "#495b50",
      "--input-text": "#f8f4ea",
      "--hero-panel-bg": "linear-gradient(135deg, rgba(16, 23, 18, 0.78) 0%, rgba(40, 67, 59, 0.50) 100%)",
      "--hero-panel-border": "rgba(238, 243, 224, 0.14)",
      "--hero-shadow": "0 28px 68px rgba(0, 0, 0, 0.40)",
      "--card-shell-bg": "#2f4037",
      "--card-shell-shadow": "0 16px 38px rgba(0, 0, 0, 0.28)",
      "--card-shell-shadow-hover": "0 22px 48px rgba(0, 0, 0, 0.36)",
      "--card-panel-bg": "linear-gradient(180deg, #394b42 0%, #314038 100%)",
      "--card-panel-border": "#495b50",
      "--card-panel-border-hover": "#7e9971",
      "--card-title": "#fbf6eb",
      "--card-body": "#ddd7cb",
      "--card-meta": "#bbc4b7",
      "--card-kicker": "#9dc7bc",
      "--card-chip-bg": "rgba(251, 246, 235, 0.08)",
      "--card-chip-border": "rgba(185, 206, 132, 0.15)",
      "--card-chip-text": "#e8e0d3",
      "--card-link": "#9dc7bc",
      "--card-link-hover": "#dbe8ab",
      "--overlay-scrim": "linear-gradient(180deg, rgba(5, 8, 6, 0.10) 0%, rgba(6, 10, 8, 0.28) 40%, rgba(4, 7, 5, 0.90) 100%)",
      "--overlay-panel-bg": "linear-gradient(180deg, rgba(38, 58, 47, 0.22) 0%, rgba(30, 48, 39, 0.88) 28%, rgba(17, 28, 22, 0.98) 100%)",
      "--overlay-panel-border": "rgba(244, 239, 228, 0.16)",
      "--overlay-panel-shadow": "0 -18px 40px rgba(0, 0, 0, 0.34)",
      "--overlay-title": "#fffaf0",
      "--overlay-body": "rgba(251, 246, 235, 0.94)",
      "--overlay-meta": "rgba(231, 224, 211, 0.84)",
      "--overlay-kicker": "#dfebb7",
      "--overlay-chip-bg": "rgba(251, 246, 235, 0.13)",
      "--overlay-chip-border": "rgba(251, 246, 235, 0.18)",
      "--overlay-chip-text": "#fffaf0",
      "--card-image-filter": "brightness(0.9) saturate(0.98) contrast(1.02)",
    },
    lichen: {
      "--background": "linear-gradient(180deg, #1a241d 0%, #223028 44%, #2c3d34 100%)",
      "--text-primary": "#f3f1e7",
      "--text-secondary": "#d0d4c5",
      "--text-highlight": "linear-gradient(90deg, #d6e48d 0%, #9dc9be 100%)",
      "--card-bg": "#33433a",
      "--primary": "#c9db7e",
      "--primary-light": "#e0eba3",
      "--on-primary": "#17211b",
      "--btn-bg": "#c9db7e",
      "--btn-text": "#17211b",
      "--border": "#4b5d52",
      "--spinner": "#c9db7e",
      "--text-shadow": "0 1px 3px rgba(0,0,0,0.24)",
      "--selection-bg": "#c9db7e",
      "--selection-text": "#17211b",
      "--foreground": "#f3f1e7",
      "--muted": "#d0d4c5",
      "--surface": "rgba(51, 67, 58, 0.90)",
      "--surface-strong": "#33433a",
      "--accent": "#c9db7e",
      "--accent-strong": "#9dc9be",
      "--accent-soft": "rgba(201, 219, 126, 0.14)",
      "--primary-soft": "rgba(201, 219, 126, 0.15)",
      "--shadow": "0 20px 48px rgba(0, 0, 0, 0.30)",
      "--ring": "rgba(201, 219, 126, 0.24)",
      "--header-bg": "rgba(26, 36, 29, 0.82)",
      "--header-border": "rgba(232, 238, 212, 0.10)",
      "--input-bg": "rgba(51, 67, 58, 0.92)",
      "--input-border": "#4b5d52",
      "--input-text": "#f8f4ea",
      "--hero-panel-bg": "linear-gradient(135deg, rgba(17, 24, 19, 0.78) 0%, rgba(40, 72, 63, 0.50) 100%)",
      "--hero-panel-border": "rgba(238, 243, 224, 0.14)",
      "--hero-shadow": "0 28px 68px rgba(0, 0, 0, 0.40)",
      "--card-shell-bg": "#2f4037",
      "--card-shell-shadow": "0 16px 38px rgba(0, 0, 0, 0.28)",
      "--card-shell-shadow-hover": "0 22px 48px rgba(0, 0, 0, 0.36)",
      "--card-panel-bg": "linear-gradient(180deg, #3a4d43 0%, #324139 100%)",
      "--card-panel-border": "#4b5d52",
      "--card-panel-border-hover": "#7f9872",
      "--card-title": "#fbf6eb",
      "--card-body": "#ddd7cb",
      "--card-meta": "#bbc4b7",
      "--card-kicker": "#9dc9be",
      "--card-chip-bg": "rgba(251, 246, 235, 0.08)",
      "--card-chip-border": "rgba(201, 219, 126, 0.15)",
      "--card-chip-text": "#e8e0d3",
      "--card-link": "#9dc9be",
      "--card-link-hover": "#e0eba3",
      "--overlay-scrim": "linear-gradient(180deg, rgba(5, 8, 6, 0.10) 0%, rgba(7, 11, 8, 0.30) 40%, rgba(4, 8, 6, 0.92) 100%)",
      "--overlay-panel-bg": "linear-gradient(180deg, rgba(38, 61, 49, 0.22) 0%, rgba(31, 50, 41, 0.89) 28%, rgba(18, 30, 24, 0.99) 100%)",
      "--overlay-panel-border": "rgba(244, 239, 228, 0.16)",
      "--overlay-panel-shadow": "0 -18px 40px rgba(0, 0, 0, 0.34)",
      "--overlay-title": "#fffaf0",
      "--overlay-body": "rgba(251, 246, 235, 0.95)",
      "--overlay-meta": "rgba(231, 224, 211, 0.85)",
      "--overlay-kicker": "#deeca9",
      "--overlay-chip-bg": "rgba(251, 246, 235, 0.13)",
      "--overlay-chip-border": "rgba(251, 246, 235, 0.18)",
      "--overlay-chip-text": "#fffaf0",
      "--card-image-filter": "brightness(0.9) saturate(1) contrast(1.03)",
    },
  },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function NextThemeProvider({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const [modeState, setModeState] = useState<ThemeMode>(() => readStoredThemePreference().mode);
  const [lightLookState, setLightLookState] = useState<ThemeLook>(() => readStoredThemePreference().lightLook);
  const [darkLookState, setDarkLookState] = useState<ThemeLook>(() => readStoredThemePreference().darkLook);

  const mode = useMemo<ThemeMode>(() => {
    if (!hydrated) {
      return "light";
    }

    const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY);
    return isThemeMode(storedMode) ? storedMode : modeState;
  }, [hydrated, modeState]);

  const lightLook = useMemo<ThemeLook>(() => {
    if (!hydrated) {
      return "sage";
    }

    const storedLook = window.localStorage.getItem(LIGHT_LOOK_STORAGE_KEY);
    return isThemeLook(storedLook) ? storedLook : lightLookState;
  }, [hydrated, lightLookState]);

  const darkLook = useMemo<ThemeLook>(() => {
    if (!hydrated) {
      return "lichen";
    }

    const storedLook = window.localStorage.getItem(DARK_LOOK_STORAGE_KEY);
    return isThemeLook(storedLook) ? storedLook : darkLookState;
  }, [darkLookState, hydrated]);

  const look = mode === "light" ? lightLook : darkLook;

  const value = useMemo<ThemeContextValue>(() => ({
    currentTheme: `${mode}-${look}`,
    mode,
    look,
    lookLabel: LOOK_LABELS[look],
    lookDescription: LOOK_DESCRIPTIONS[look],
    lightLook,
    darkLook,
    lightLookLabel: LOOK_LABELS[lightLook],
    darkLookLabel: LOOK_LABELS[darkLook],
    availableLooks: LOOK_ORDER.map((value) => ({
      value,
      label: LOOK_LABELS[value],
      description: LOOK_DESCRIPTIONS[value],
      swatches: LOOK_SWATCHES[value],
    })),
    setMode: (nextMode) => {
      setModeState(nextMode);
      window.localStorage.setItem(MODE_STORAGE_KEY, nextMode);
      writeThemeCookie(nextMode, lightLook, darkLook);
    },
    setLook: (nextLook) => {
      if (mode === "light") {
        setLightLookState(nextLook);
        window.localStorage.setItem(LIGHT_LOOK_STORAGE_KEY, nextLook);
        writeThemeCookie(mode, nextLook, darkLook);
        return;
      }

      setDarkLookState(nextLook);
      window.localStorage.setItem(DARK_LOOK_STORAGE_KEY, nextLook);
      writeThemeCookie(mode, lightLook, nextLook);
    },
    toggleMode: () => {
      const nextMode = mode === "light" ? "dark" : "light";
      setModeState(nextMode);
      window.localStorage.setItem(MODE_STORAGE_KEY, nextMode);
      writeThemeCookie(nextMode, lightLook, darkLook);
    },
    cycleLook: () => {
      const nextLook = LOOK_ORDER[(LOOK_ORDER.indexOf(look) + 1) % LOOK_ORDER.length];
      if (mode === "light") {
        setLightLookState(nextLook);
        window.localStorage.setItem(LIGHT_LOOK_STORAGE_KEY, nextLook);
        writeThemeCookie(mode, nextLook, darkLook);
        return;
      }

      setDarkLookState(nextLook);
      window.localStorage.setItem(DARK_LOOK_STORAGE_KEY, nextLook);
      writeThemeCookie(mode, lightLook, nextLook);
    },
    restorePreference: (nextMode, nextLightLook, nextDarkLook) => {
      setModeState(nextMode);
      setLightLookState(nextLightLook);
      setDarkLookState(nextDarkLook);
      window.localStorage.setItem(MODE_STORAGE_KEY, nextMode);
      window.localStorage.setItem(LIGHT_LOOK_STORAGE_KEY, nextLightLook);
      window.localStorage.setItem(DARK_LOOK_STORAGE_KEY, nextDarkLook);
      writeThemeCookie(nextMode, nextLightLook, nextDarkLook);
    },
  }), [darkLook, lightLook, look, mode]);

  const themeStyle = themePresets[mode][look];

  return (
    <ThemeContext.Provider value={value}>
      <div suppressHydrationWarning className="theme-root min-h-screen transition-[background,color,border-color,box-shadow] duration-300" data-theme-look={look} data-theme-mode={mode} style={themeStyle}>
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
