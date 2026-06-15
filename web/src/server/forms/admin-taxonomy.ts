import { z } from "zod";

import { slugify } from "@/lib/utils";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const INVALID_SLUG_SENTINEL = "__invalid-slug__";

const optionalSlugField = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const normalized = slugify(trimmed);
    return normalized || INVALID_SLUG_SENTINEL;
  },
  z.union([
    z.null(),
    z.string().min(1).max(120).regex(SLUG_REGEX, "Invalid slug (use lowercase letters, numbers, and dashes)"),
  ]),
);

const optionalDescriptionField = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  },
  z.string().max(500).nullable(),
);

const idField = z.string().trim().min(1, "Id is required");

export const adminCategoryCreateFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
  slug: optionalSlugField,
  description: optionalDescriptionField,
});

export const adminCategoryUpdateFormSchema = z.object({
  id: idField,
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
  slug: optionalSlugField,
  description: optionalDescriptionField,
});

export const adminCategoryIdFormSchema = z.object({
  id: idField,
});

export const adminTagCreateFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
  slug: optionalSlugField,
  description: optionalDescriptionField,
});

export const adminTagIdFormSchema = z.object({
  id: idField,
});

export type AdminCategoryCreateFormValues = z.infer<typeof adminCategoryCreateFormSchema>;
export type AdminCategoryUpdateFormValues = z.infer<typeof adminCategoryUpdateFormSchema>;
export type AdminTagCreateFormValues = z.infer<typeof adminTagCreateFormSchema>;
