import { z } from "zod";

import { slugify } from "@/lib/utils";

function optionalIntegerField(defaultValue: number) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return defaultValue;
      }

      return Number(trimmed);
    },
    z.number().int().finite(),
  );
}

const optionalHttpsUrlField = z.preprocess(
  (value) => {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  },
  z.union([z.null(), z.url({ protocol: /^https$/ })]),
);

const optionalTextAreaField = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed || null;
  },
  z.string().max(500).nullable(),
);

const optionalVisitedYearField = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return Number(trimmed);
  },
  z.number().int().min(1900).max(2100).nullable(),
);

const INVALID_DETAIL_SLUG_SENTINEL = "__invalid-detail-slug__";

const optionalDetailSlugField = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const normalized = slugify(trimmed);
    return normalized || INVALID_DETAIL_SLUG_SENTINEL;
  },
  z.union([
    z.null(),
    z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid detail page slug"),
  ]),
);

const itemTypeField = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return "single";
    if (typeof value !== "string") return "single";
    const trimmed = value.trim();
    return trimmed === "multi" ? "multi" : "single";
  },
  z.enum(["single", "multi"]).default("single"),
);

const optionalParentIdField = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed || null;
  },
  z.string().uuid("Invalid parent id").nullable(),
);

export const adminWishlistPlaceFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  locationName: z.string().trim().min(1, "Location is required"),
  description: optionalTextAreaField,
  sortOrder: optionalIntegerField(0),
  visited: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(true),
  externalUrl: optionalHttpsUrlField,
  visitedYear: optionalVisitedYearField,
  imageUrl: optionalHttpsUrlField,
  detailSlug: optionalDetailSlugField,
  itemType: itemTypeField,
  parentId: optionalParentIdField,
});

export const adminWishlistPlaceIdSchema = z.string().trim().uuid("Invalid wishlist place id");

export const adminWishlistPlaceUpdateFormSchema = adminWishlistPlaceFormSchema.extend({
  id: adminWishlistPlaceIdSchema,
});

export type AdminWishlistPlaceFormValues = z.infer<typeof adminWishlistPlaceFormSchema>;
