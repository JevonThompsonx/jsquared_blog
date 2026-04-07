import { z } from "zod";

const DEFAULT_LOCATION_ZOOM = 8;

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

function coordinateField(bounds: { min: number; max: number }) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }

      return Number(trimmed);
    },
    z.number().finite().min(bounds.min).max(bounds.max),
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
  latitude: coordinateField({ min: -90, max: 90 }),
  longitude: coordinateField({ min: -180, max: 180 }),
  zoom: optionalIntegerField(DEFAULT_LOCATION_ZOOM).pipe(z.number().min(0).max(22)),
  sortOrder: optionalIntegerField(0),
  visited: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(false),
  externalUrl: optionalHttpsUrlField,
});

export type AdminWishlistPlaceFormValues = z.infer<typeof adminWishlistPlaceFormSchema>;
