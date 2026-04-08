"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { updateTagDescription } from "@/server/dal/admin-tags";

const updateTagDescriptionSchema = z.object({
  tagId: z.string().trim().min(1),
  description: z.string().max(500).nullable(),
});

export async function updateTagDescriptionAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/admin?error=AccessDenied");
  }

  const raw = updateTagDescriptionSchema.safeParse({
    tagId: formData.get("tagId"),
    description: formData.get("description") || null,
  });

  if (!raw.success) {
    return;
  }

  const normalizedDescription = raw.data.description?.trim() ? raw.data.description.trim() : null;

  try {
    await updateTagDescription(raw.data.tagId, normalizedDescription);
  } catch (error) {
    console.error("[admin tags] Failed to update tag description", error);
    throw new Error("Failed to save tag description");
  }

  try {
    revalidatePath("/admin/tags");
  } catch (error) {
    console.error("[admin tags] revalidation failed for /admin/tags", error);
  }

  try {
    revalidatePath("/tag/[slug]", "page");
  } catch (error) {
    console.error("[admin tags] revalidation failed for /tag/[slug]", error);
  }
}
