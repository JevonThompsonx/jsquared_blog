import { z } from "zod";

// `next/image` throws at render time for hosts not listed in
// `next.config.ts` remotePatterns. Because profile URLs are user-controlled,
// an arbitrary host would break every page that renders that author card.
// Keep this list in sync with `images.remotePatterns` in next.config.ts.
const ALLOWED_AVATAR_HOSTS = ["avatars.githubusercontent.com"] as const;
const AVATAR_PRESET_PATTERN = /^j2:[a-z0-9-]+$/;
const LOCAL_AVATAR_PATTERN =
  /^\/media\/[A-Za-z0-9/_-]+\.(?:avif|gif|jpe?g|png|webp)$/;

function isAllowedAvatarUrl(value: string): boolean {
  if (LOCAL_AVATAR_PATTERN.test(value)) {
    return true;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  return (ALLOWED_AVATAR_HOSTS as readonly string[]).includes(hostname);
}

export const patchProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(50, "Display name must be 50 characters or less")
    .optional(),
  avatarUrl: z
    .union([
      z
        .string()
        .refine(
          (value) =>
            AVATAR_PRESET_PATTERN.test(value) || isAllowedAvatarUrl(value),
          "Avatar must be a preset or an image hosted on an approved provider",
        ),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  themePreference: z.string().max(200).nullable().optional(),
});

export type PatchProfileValues = z.infer<typeof patchProfileSchema>;
