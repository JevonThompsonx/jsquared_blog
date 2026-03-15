"use client";

import { useEffect, useMemo, useRef } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasStoredThemePreference, useNextTheme } from "@/components/theme/theme-provider";

type ThemeMode = "light" | "dark";
type ThemeLook = "sage" | "lichen";

function parseThemePref(raw: string): { mode: ThemeMode; lightLook: ThemeLook; darkLook: ThemeLook } | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
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
 * Runs once per session. If the user is signed in via Supabase and localStorage
 * has no saved theme, fetches their DB preference and restores it. This ensures
 * the saved theme applies on every page, not just /account.
 */
export function UserThemeSync() {
  const { restorePreference } = useNextTheme();
  const synced = useRef(false);

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (synced.current || !supabase) return;

    // If localStorage already has a theme, nothing to do — it's already applied
    // by NextThemeProvider on mount.
    if (hasStoredThemePreference()) {
      synced.current = true;
      return;
    }

    synced.current = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      const res = await fetch("/api/account/profile", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (!res.ok) return;

      const json = await res.json() as { profile?: { themePreference?: string | null } };
      const raw = json.profile?.themePreference;
      if (!raw) return;

      const pref = parseThemePref(raw);
      if (pref) {
        restorePreference(pref.mode, pref.lightLook, pref.darkLook);
      }
    })();
  }, [supabase, restorePreference]);

  return null;
}
