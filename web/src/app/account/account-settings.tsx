"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useNextTheme } from "@/components/theme/theme-provider";

type ThemeMode = "light" | "dark";
type ThemeLook = "sage" | "lichen";

type SavedTheme = {
  mode: ThemeMode;
  lightLook: ThemeLook;
  darkLook: ThemeLook;
};

type ProfileData = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  themePreference: string | null;
  email: string;
};

type FieldStatus = "idle" | "saving" | "saved" | "error";

const profileResponseSchema = z.object({
  profile: z.object({
    userId: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    themePreference: z.string().nullable(),
    email: z.string(),
  }),
});

const avatarErrorResponseSchema = z.object({
  error: z.string().optional(),
});

const avatarUploadResponseSchema = z.object({
  avatarUrl: z.string(),
});

// ---------------------------------------------------------------------------
// Avatar preset icons
// ---------------------------------------------------------------------------

type AvatarPreset = { id: string; label: string; bg: string; path: string };

const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "j2:mountain",
    label: "Mountain",
    bg: "#7c9557",
    path: "M12 3L2 21h20L12 3zm0 4.5l6.2 10.5H5.8L12 7.5z",
  },
  {
    id: "j2:compass",
    label: "Compass",
    bg: "#557468",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-9.5L9 16l5.5-2.5L16 8l-5.5 2.5z",
  },
  {
    id: "j2:tent",
    label: "Tent",
    bg: "#8b7355",
    path: "M12 2L3 18h18L12 2zm0 3.8L18.2 16H5.8L12 5.8zM10 16v4h4v-4",
  },
  {
    id: "j2:camera",
    label: "Camera",
    bg: "#6b7a8d",
    path: "M20 5h-3.2L15 3H9L7.2 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm-8 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  },
  {
    id: "j2:wave",
    label: "Wave",
    bg: "#4a8fa8",
    path: "M2 12c1.5-3 3-4.5 4.5-4.5S9 9 10.5 9 13.5 7.5 15 7.5 18 9 19.5 9 21 7.5 22 7.5M2 17c1.5-3 3-4.5 4.5-4.5S9 14 10.5 14 13.5 12.5 15 12.5 18 14 19.5 14 21 12.5 22 12.5",
  },
  {
    id: "j2:bike",
    label: "Bike",
    bg: "#5c8a5c",
    path: "M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm14 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 7l2 5H7l3-5h2zm0 0l2 5H19l-3-5h-4z",
  },
  {
    id: "j2:map",
    label: "Map",
    bg: "#a0785a",
    path: "M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3zm0 2.3L15 9v10.4L9 16.7V6.3zM7 6.7v10L3 18.7V7.3l4-2zm10 0l4 2v11.4l-4 1.6V6.7z",
  },
  {
    id: "j2:sun",
    label: "Sun",
    bg: "#c8843a",
    path: "M12 3v2M12 19v2M3 12H1M23 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  },
];

function getPreset(avatarUrl: string | null): AvatarPreset | null {
  if (!avatarUrl?.startsWith("j2:")) return null;
  return AVATAR_PRESETS.find((p) => p.id === avatarUrl) ?? null;
}

function AvatarDisplay({
  avatarUrl,
  displayName,
  size,
}: {
  avatarUrl: string | null;
  displayName: string;
  size: number;
}) {
  const preset = getPreset(avatarUrl);
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const style = {
    width: size,
    height: size,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
    background: preset ? preset.bg : "var(--primary)",
  } satisfies React.CSSProperties;

  if (preset) {
    return (
      <div style={style}>
        <svg fill="none" height={size * 0.55} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width={size * 0.55}>
          <path d={preset.path} />
        </svg>
      </div>
    );
  }

  if (avatarUrl && !avatarUrl.startsWith("j2:")) {
    return (
      <Image alt={displayName} height={size} src={avatarUrl} style={{ ...style, objectFit: "cover" }} width={size} />
    );
  }

  return (
    <div style={{ ...style, fontSize: size * 0.35, fontWeight: 700, color: "white" }}>
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function isThemeLook(value: unknown): value is ThemeLook {
  return value === "sage" || value === "lichen";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function parseSavedTheme(raw: string): SavedTheme | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed)) {
      const mode = parsed["mode"];
      const lightLook = parsed["lightLook"];
      const darkLook = parsed["darkLook"];

      if (isThemeMode(mode) && isThemeLook(lightLook) && isThemeLook(darkLook)) {
        return { mode, lightLook, darkLook };
      }
    }
  } catch {
    // malformed
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AccountSettings() {
  const { mode, lightLook, darkLook, lookLabel, restorePreference } = useNextTheme();
  const didInit = useRef(false);

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Per-section statuses
  const [nameStatus, setNameStatus] = useState<FieldStatus>("idle");
  const [nameError, setNameError] = useState<string | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<FieldStatus>("idle");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [themeStatus, setThemeStatus] = useState<FieldStatus>("idle");
  const [emailStatus, setEmailStatus] = useState<FieldStatus>("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<FieldStatus>("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (didInit.current || !supabase) return;
    didInit.current = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/login?redirectTo=/account";
        return;
      }

      const accessToken = data.session.access_token;
      setToken(accessToken);

      const res = await fetch("/api/account/profile", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        setLoadError("Failed to load profile. Please refresh.");
        return;
      }

      const json = profileResponseSchema.parse(await res.json());
      const loaded = json.profile;
      setProfile(loaded);
      setDisplayName(loaded.displayName);
      setAvatarUrl(loaded.avatarUrl ?? "");

      if (loaded.themePreference) {
        const saved = parseSavedTheme(loaded.themePreference);
        if (saved) restorePreference(saved.mode, saved.lightLook, saved.darkLook);
      }
    })();
  }, [supabase, restorePreference]);

  async function patchProfile(fields: Record<string, unknown>): Promise<boolean> {
    if (!token) return false;

    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });

    return res.ok;
  }

  async function saveAvatarUrl(url: string) {
    setAvatarStatus("saving");
    setAvatarError(null);
    const ok = await patchProfile({ avatarUrl: url });
    if (ok) {
      setAvatarUrl(url);
      setProfile((prev) => (prev ? { ...prev, avatarUrl: url || null } : prev));
      setAvatarStatus("saved");
      setTimeout(() => setAvatarStatus("idle"), 3000);
    } else {
      setAvatarError("Failed to update avatar.");
      setAvatarStatus("error");
    }
  }

  async function handleSaveDisplayName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) return;

    setNameStatus("saving");
    setNameError(null);
    const ok = await patchProfile({ displayName: trimmed });
    if (ok) {
      setProfile((prev) => (prev ? { ...prev, displayName: trimmed } : prev));
      setNameStatus("saved");
      setTimeout(() => setNameStatus("idle"), 3000);
    } else {
      setNameError("Failed to update display name.");
      setNameStatus("error");
    }
  }

  async function handleSelectPreset(presetId: string) {
    await saveAvatarUrl(presetId);
  }

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploadingAvatar(true);
    setAvatarError(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/account/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const json = avatarErrorResponseSchema.parse(await res.json());
        setAvatarError(json.error ?? "Upload failed.");
        return;
      }

      const json = avatarUploadResponseSchema.parse(await res.json());
      setAvatarUrl(json.avatarUrl);
      setProfile((prev) => (prev ? { ...prev, avatarUrl: json.avatarUrl } : prev));
      setAvatarStatus("saved");
      setTimeout(() => setAvatarStatus("idle"), 3000);
    } catch {
      setAvatarError("Upload failed. Please try again.");
    } finally {
      setUploadingAvatar(false);
      // Reset input so same file can be re-selected
      e.target.value = "";
    }
  }

  async function handleSaveAvatarUrl(e: React.FormEvent) {
    e.preventDefault();
    await saveAvatarUrl(avatarUrl.trim());
  }

  async function handleSaveTheme() {
    setThemeStatus("saving");
    const pref: SavedTheme = { mode, lightLook, darkLook };
    const ok = await patchProfile({ themePreference: JSON.stringify(pref) });
    if (ok) {
      setThemeStatus("saved");
      setTimeout(() => setThemeStatus("idle"), 3000);
    } else {
      setThemeStatus("error");
    }
  }

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newEmail.trim();
    if (!trimmed || !supabase) return;

    setEmailStatus("saving");
    setEmailError(null);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    if (error) {
      setEmailError(error.message);
      setEmailStatus("error");
    } else {
      setNewEmail("");
      setEmailStatus("saved");
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !profile) return;

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setPasswordStatus("saving");
    setPasswordError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });

    if (signInError) {
      setPasswordError("Current password is incorrect.");
      setPasswordStatus("error");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
      setPasswordStatus("error");
    } else {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus("saved");
      setTimeout(() => setPasswordStatus("idle"), 3000);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
        <p className="text-sm text-red-700">{loadError}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

  const modeLabel = mode === "light" ? "Light" : "Dark";

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-[var(--text-primary)]">Account Settings</h1>

      {/* Profile */}
      <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-semibold text-[var(--text-primary)]">Profile</h2>

        {/* Avatar preview */}
        <div className="mb-6 flex items-center gap-4">
          <AvatarDisplay avatarUrl={profile.avatarUrl} displayName={profile.displayName} size={64} />
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{profile.displayName}</p>
            <p className="text-sm text-[var(--text-secondary)]">{profile.email}</p>
          </div>
        </div>

        {/* Display name */}
        <form className="mb-6" onSubmit={handleSaveDisplayName}>
          <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]" htmlFor="displayName">
            Display name
          </label>
          <div className="flex gap-3">
            <input
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              id="displayName"
              maxLength={50}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              type="text"
              value={displayName}
            />
            <button
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-50"
              disabled={nameStatus === "saving" || !displayName.trim()}
              type="submit"
            >
              {nameStatus === "saving" ? "Saving…" : "Save"}
            </button>
          </div>
          {nameError ? <p className="mt-2 text-sm text-red-500">{nameError}</p> : null}
          {nameStatus === "saved" ? <p className="mt-2 text-sm text-green-600">Display name updated.</p> : null}
        </form>

        {/* Avatar */}
        <div>
          <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">Avatar</p>

          {/* Preset icon grid */}
          <p className="mb-2 text-xs text-[var(--text-secondary)]">Choose a preset icon</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {AVATAR_PRESETS.map((preset) => {
              const isSelected = profile.avatarUrl === preset.id;
              return (
                <button
                  key={preset.id}
                  aria-label={preset.label}
                  className={`rounded-full p-0.5 transition-all ${isSelected ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--card-bg)]" : "opacity-80 hover:opacity-100"}`}
                  disabled={avatarStatus === "saving" || uploadingAvatar}
                  onClick={() => void handleSelectPreset(preset.id)}
                  title={preset.label}
                  type="button"
                >
                  <AvatarDisplay avatarUrl={preset.id} displayName={preset.label} size={40} />
                </button>
              );
            })}
          </div>

          {/* File upload */}
          <p className="mb-2 text-xs text-[var(--text-secondary)]">Or upload a photo</p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--primary)] disabled:opacity-50">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {uploadingAvatar ? "Uploading…" : "Upload image"}
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={uploadingAvatar || avatarStatus === "saving"}
              onChange={(e) => void handleAvatarFileChange(e)}
              type="file"
            />
          </label>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)]">JPEG, PNG, WebP or GIF — max 5 MB</p>

          {/* URL input fallback */}
          <form className="mt-4" onSubmit={handleSaveAvatarUrl}>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]" htmlFor="avatarUrl">
              Or paste an image URL
            </label>
            <div className="flex gap-3">
              <input
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                id="avatarUrl"
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                type="url"
                value={avatarUrl.startsWith("j2:") ? "" : avatarUrl}
              />
              <button
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-50"
                disabled={avatarStatus === "saving" || uploadingAvatar}
                type="submit"
              >
                {avatarStatus === "saving" ? "Saving…" : "Save"}
              </button>
            </div>
          </form>

          {avatarError ? <p className="mt-2 text-sm text-red-500">{avatarError}</p> : null}
          {avatarStatus === "saved" ? <p className="mt-2 text-sm text-green-600">Avatar updated.</p> : null}
        </div>
      </section>

      {/* Theme preference */}
      <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">Theme preference</h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Current theme: <strong className="text-[var(--text-primary)]">{modeLabel} · {lookLabel}</strong>
        </p>
        <p className="mb-5 text-sm text-[var(--text-secondary)]">
          Use the theme toggle in the header to change mode or look, then save your preference here.
        </p>
        <button
          className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-50"
          disabled={themeStatus === "saving"}
          onClick={() => void handleSaveTheme()}
          type="button"
        >
          {themeStatus === "saving" ? "Saving…" : "Save current theme as preference"}
        </button>
        {themeStatus === "saved" ? <p className="mt-3 text-sm text-green-600">Theme preference saved.</p> : null}
        {themeStatus === "error" ? <p className="mt-3 text-sm text-red-500">Failed to save theme preference.</p> : null}
      </section>

      {/* Email */}
      <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">Email</h2>
        <p className="mb-1 text-sm text-[var(--text-secondary)]">Current email</p>
        <p className="mb-5 font-medium text-[var(--text-primary)]">{profile.email}</p>

        <form onSubmit={handleUpdateEmail}>
          <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]" htmlFor="newEmail">
            New email address
          </label>
          <div className="flex gap-3">
            <input
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              id="newEmail"
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email"
              type="email"
              value={newEmail}
            />
            <button
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-50"
              disabled={emailStatus === "saving" || !newEmail.trim()}
              type="submit"
            >
              {emailStatus === "saving" ? "Sending…" : "Update"}
            </button>
          </div>
          {emailError ? <p className="mt-2 text-sm text-red-500">{emailError}</p> : null}
          {emailStatus === "saved" ? (
            <p className="mt-2 text-sm text-green-600">Verification email sent — check your inbox to confirm.</p>
          ) : null}
        </form>
      </section>

      {/* Password */}
      <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-semibold text-[var(--text-primary)]">Password</h2>

        <form className="space-y-4" onSubmit={handleUpdatePassword}>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]" htmlFor="currentPassword">
              Current password
            </label>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              id="currentPassword"
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              type="password"
              value={currentPassword}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]" htmlFor="newPassword">
              New password
            </label>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              id="newPassword"
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              type="password"
              value={newPassword}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]" htmlFor="confirmPassword">
              Confirm new password
            </label>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              id="confirmPassword"
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              type="password"
              value={confirmPassword}
            />
          </div>

          <button
            className="w-full rounded-lg bg-[var(--primary)] py-2 text-sm font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-50"
            disabled={passwordStatus === "saving" || !currentPassword || !newPassword || !confirmPassword}
            type="submit"
          >
            {passwordStatus === "saving" ? "Updating…" : "Update password"}
          </button>

          {passwordError ? <p className="text-sm text-red-500">{passwordError}</p> : null}
          {passwordStatus === "saved" ? <p className="text-sm text-green-600">Password updated successfully.</p> : null}
        </form>
      </section>

      {/* Sign out */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold text-[var(--text-primary)]">Sign out</h2>
        <p className="mb-5 text-sm text-[var(--text-secondary)]">You will be returned to the home page.</p>
        <button
          className="rounded-lg border border-red-300 bg-red-50 px-5 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
          type="button"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </section>
    </div>
  );
}
