import { z } from "zod";

export type WishlistLinkedPostStatus = "draft" | "published" | "scheduled" | null;

export type WishlistLocationSelection = {
  provider: "nominatim";
  placeId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  zoom: number;
  kind: string;
};

export type WishlistSurfaceState = {
  isCheckedOff: boolean;
  shouldShowInAdmin: boolean;
  shouldShowInPublic: boolean;
};

export type WishlistSurfaceInput = {
  linkedPostId: string | null;
  linkedPostStatus: WishlistLinkedPostStatus;
};

const wishlistLocationSelectionSchema = z.object({
  provider: z.literal("nominatim"),
  placeId: z.string().trim().min(1),
  locationName: z.string().trim().min(1),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  zoom: z.number().int().min(0).max(22),
  kind: z.string().trim().min(1),
});

export function parseWishlistLocationSelection(value: unknown): WishlistLocationSelection {
  let parsedValue = value;

  if (typeof value === "string") {
    try {
      parsedValue = JSON.parse(value);
    } catch {
      throw new Error("Invalid wishlist location selection");
    }
  }

  const result = wishlistLocationSelectionSchema.safeParse(parsedValue);
  if (!result.success) {
    throw new Error("Invalid wishlist location selection");
  }

  return result.data;
}

export function getWishlistSurfaceState(input: WishlistSurfaceInput): WishlistSurfaceState {
  const isCheckedOff = Boolean(input.linkedPostId);
  const shouldHideFromWishlist = isCheckedOff && input.linkedPostStatus === "published";

  return {
    isCheckedOff,
    shouldShowInAdmin: !shouldHideFromWishlist,
    shouldShowInPublic: !shouldHideFromWishlist,
  };
}
