"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";
import { geocodeLocation } from "@/lib/geocode";
import {
  createAdminWishlistPlace,
  deleteAdminWishlistPlace,
  setWishlistPlaceLinkedPost,
  updateAdminWishlistPlace,
} from "@/server/dal/admin-wishlist-places";
import {
  adminWishlistPlaceFormSchema,
  adminWishlistPlaceIdSchema,
  adminWishlistPlaceUpdateFormSchema,
} from "@/server/forms/admin-wishlist-place";
export async function createWishlistPlaceAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/admin?error=AccessDenied");
  }

  const parsed = adminWishlistPlaceFormSchema.safeParse({
    name: formData.get("name"),
    locationName: formData.get("locationName"),
    description: formData.get("description"),
    sortOrder: formData.get("sortOrder"),
    visited: formData.get("visited") === "on",
    isPublic: formData.get("isPublic") === "on",
    externalUrl: formData.get("externalUrl"),
  });

  if (!parsed.success) {
    return;
  }

  const geo = await geocodeLocation(parsed.data.locationName);
  if (!geo) {
    throw new Error("Could not geocode location. Please try a different location name.");
  }

  try {
    await createAdminWishlistPlace({
      ...parsed.data,
      latitude: geo.lat,
      longitude: geo.lng,
      zoom: geo.zoom,
      createdByUserId: session.user.id,
    });
  } catch (error) {
    console.error("[admin wishlist] Failed to create wishlist destination", error);
    throw new Error("Failed to save wishlist destination");
  }

  try {
    revalidatePath("/admin/wishlist");
  } catch (error) {
    console.error("[admin wishlist] Revalidation failed for /admin/wishlist after create", error);
  }
}

export async function updateWishlistPlaceAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/admin?error=AccessDenied");
  }

  const parsed = adminWishlistPlaceUpdateFormSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    locationName: formData.get("locationName"),
    description: formData.get("description"),
    sortOrder: formData.get("sortOrder"),
    visited: formData.get("visited") === "on",
    isPublic: formData.get("isPublic") === "on",
    externalUrl: formData.get("externalUrl"),
  });

  if (!parsed.success) {
    return;
  }

  const geo = await geocodeLocation(parsed.data.locationName);
  if (!geo) {
    throw new Error("Could not geocode location. Please try a different location name.");
  }

  try {
    await updateAdminWishlistPlace({
      ...parsed.data,
      latitude: geo.lat,
      longitude: geo.lng,
      zoom: geo.zoom,
    });
  } catch (error) {
    console.error("[admin wishlist] Failed to update wishlist destination", error);
    throw new Error("Failed to save wishlist destination");
  }

  try {
    revalidatePath("/admin/wishlist");
  } catch (error) {
    console.error("[admin wishlist] Revalidation failed for /admin/wishlist after update", error);
  }
}

export async function deleteWishlistPlaceAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/admin?error=AccessDenied");
  }

  const parsedId = adminWishlistPlaceIdSchema.safeParse(formData.get("id"));
  if (!parsedId.success) {
    return;
  }

  try {
    await deleteAdminWishlistPlace(parsedId.data);
  } catch (error) {
    console.error("[admin wishlist] Failed to delete wishlist destination", error);
    throw new Error("Failed to delete wishlist destination");
  }

  try {
    revalidatePath("/admin/wishlist");
  } catch (error) {
    console.error("[admin wishlist] Revalidation failed for /admin/wishlist after delete", error);
  }
}

export async function checkOffWishlistPlaceAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/admin?error=AccessDenied");
  }

  const idParsed = adminWishlistPlaceIdSchema.safeParse(
    (formData.get("id") as string | null)?.trim() ?? "",
  );
  if (!idParsed.success) {
    return;
  }

  const linkedPostIdRaw = (formData.get("linkedPostId") as string | null)?.trim() ?? "";
  let linkedPostId: string | null = null;
  if (linkedPostIdRaw) {
    const linkedParsed = adminWishlistPlaceIdSchema.safeParse(linkedPostIdRaw);
    if (!linkedParsed.success) {
      return;
    }
    linkedPostId = linkedParsed.data;
  }

  await setWishlistPlaceLinkedPost(idParsed.data, linkedPostId);

  try {
    revalidatePath("/admin/wishlist");
  } catch (error) {
    console.error("[admin wishlist] Revalidation failed for /admin/wishlist after check-off", error);
  }
}
