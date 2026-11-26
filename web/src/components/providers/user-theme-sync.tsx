"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { useEffect, useRef } from "react";
import {
  hasStoredThemePreference,
  useNextTheme,
} from "@/components/theme/theme-provider";

type ThemeMode = "light" | "dark";
type ThemeLook = "sage" | "lichen";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function parseThemePref(
  raw: string,
): { mode: ThemeMode; lightLook: ThemeLook; darkLook: ThemeLook } | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }

    const mode = parsed["mode"];
    const lightLook = parsed["lightLook"];
    const darkLook = parsed["darkLook"];
    if (
      (mode === "light" || mode === "dark") &&
      (lightLook === "sage" || lightLook === "lichen") &&
      (darkLook === "sage" || darkLook === "lichen")
    ) {
      return { mode, lightLook, darkLook };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Runs once per session. If the reader is signed in and localStorage has no
 * saved theme, fetches their DB preference and restores it. This ensures the
 * saved theme applies on every page, not just /account.
 */
export function UserThemeSync() {
  const { restorePreference } = useNextTheme();
  const synced = useRef(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (synced.current || loading || !user) return;

    // If localStorage already has a theme, nothing to do — it's already applied
    // by NextThemeProvider on mount.
    if (hasStoredThemePreference()) {
      synced.current = true;
      return;
    }

    synced.current = true;

    void (async () => {
      const res = await fetch("/api/account/profile");
      if (!res.ok) return;

      const json: unknown = await res.json();
      if (!isRecord(json)) {
        return;
      }

      const profile = json["profile"];
      if (!isRecord(profile)) {
        return;
      }

      const raw =
        typeof profile["themePreference"] === "string"
          ? profile["themePreference"]
          : null;
      if (!raw) return;

      const pref = parseThemePref(raw);
      if (pref) {
        restorePreference(pref.mode, pref.lightLook, pref.darkLook);
      }
    })();
  }, [loading, user, restorePreference]);

  return null;
}
