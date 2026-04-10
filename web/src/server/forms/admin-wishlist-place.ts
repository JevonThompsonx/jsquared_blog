import { z } from "zod";

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
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  },
  z.union([z.null(), z.url({ protocol: /^https$/ })]),
);

export const adminWishlistPlaceFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  locationName: z.string().trim().min(1, "Location is required"),
  sortOrder: optionalIntegerField(0),
  visited: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(false),
  externalUrl: optionalHttpsUrlField,
});

export const adminWishlistPlaceIdSchema = z.string().trim().uuid("Invalid wishlist place id");

export const adminWishlistPlaceUpdateFormSchema = adminWishlistPlaceFormSchema.extend({
  id: adminWishlistPlaceIdSchema,
});

export type AdminWishlistPlaceFormValues = z.infer<typeof adminWishlistPlaceFormSchema>;
