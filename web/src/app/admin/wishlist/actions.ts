"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";
import {
  createAdminWishlistPlace,
  deleteAdminWishlistPlace,
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
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    zoom: formData.get("zoom"),
    sortOrder: formData.get("sortOrder"),
    visited: formData.get("visited") === "on",
    isPublic: formData.get("isPublic") === "on",
    externalUrl: formData.get("externalUrl"),
  });

  if (!parsed.success) {
    return;
  }

  try {
    await createAdminWishlistPlace({
      ...parsed.data,
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
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    zoom: formData.get("zoom"),
    sortOrder: formData.get("sortOrder"),
    visited: formData.get("visited") === "on",
    isPublic: formData.get("isPublic") === "on",
    externalUrl: formData.get("externalUrl"),
  });

  if (!parsed.success) {
    return;
  }

  try {
    await updateAdminWishlistPlace(parsed.data);
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
