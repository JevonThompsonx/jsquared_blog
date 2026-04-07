"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";
import { createAdminWishlistPlace } from "@/server/dal/admin-wishlist-places";
import { adminWishlistPlaceFormSchema } from "@/server/forms/admin-wishlist-place";

export async function createWishlistPlaceAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
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

  await createAdminWishlistPlace({
    ...parsed.data,
    createdByUserId: session.user.id,
  });

  revalidatePath("/admin/wishlist");
}
