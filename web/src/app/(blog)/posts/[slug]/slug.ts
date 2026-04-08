import { z } from "zod";

const postSlugSchema = z.string().trim().min(1);

export function normalizePostSlug(rawSlug: string): string | null {
  const parsed = postSlugSchema.safeParse(rawSlug);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
