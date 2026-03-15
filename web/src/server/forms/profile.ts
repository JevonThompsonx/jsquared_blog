import { z } from "zod";

export const patchProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(50, "Display name must be 50 characters or less")
    .optional(),
  avatarUrl: z
    .union([z.string().url("Must be a valid URL starting with http"), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  themePreference: z.string().max(200).nullable().optional(),
});

export type PatchProfileValues = z.infer<typeof patchProfileSchema>;
