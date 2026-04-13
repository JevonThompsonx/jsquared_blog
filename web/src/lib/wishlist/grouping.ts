import type { PublicWishlistPlace } from "@/server/queries/wishlist";

export type WishlistLocationGroup = {
  locationName: string;
  places: PublicWishlistPlace[];
};

/**
 * Groups a flat list of wishlist places by their locationName,
 * preserving the first-seen order of distinct locations and the
 * original order of places within each group.
 */
export function groupWishlistByLocation(places: PublicWishlistPlace[]): WishlistLocationGroup[] {
  const order: string[] = [];
  const map = new Map<string, PublicWishlistPlace[]>();

  for (const place of places) {
    if (!map.has(place.locationName)) {
      order.push(place.locationName);
      map.set(place.locationName, []);
    }
    map.get(place.locationName)!.push(place);
  }

  return order.map((locationName) => ({
    locationName,
    places: map.get(locationName)!,
  }));
}
