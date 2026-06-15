"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import {
  createTag,
  deleteTag,
  TagInUseError,
  TagSlugConflictError,
  updateTagDescription,
} from "@/server/dal/admin-tags";
import { adminTagCreateFormSchema, adminTagIdFormSchema } from "@/server/forms/admin-taxonomy";

const updateTagDescriptionSchema = z.object({
  tagId: z.string().trim().min(1),
  description: z.string().max(500).nullable(),
});

async function ensureAdmin() {
  const session = await requireAdminSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/admin?error=AccessDenied");
  }
  return session.user.id;
}

function isStableTagValidationError(error: unknown): boolean {
  return (
    error instanceof Error
    && (error.message === "Invalid request"
      || error.message === "Tag name is required"
      || error.message === "Tag slug is required"
      || error.message === "Tag id is required")
  );
}

export async function updateTagDescriptionAction(formData: FormData): Promise<void> {
  const session = await ensureAdmin();
  void session;

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

// createTagAction
// Input: FormData matching adminTagCreateFormSchema
// Output: redirect to /admin/tags?error=…
// Auth: Admin (Auth.js GitHub)
// UI: submitted from "Create tag" form on the admin tags page
export async function createTagAction(formData: FormData): Promise<void> {
  await ensureAdmin();

  const parsed = adminTagCreateFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    redirect("/admin/tags?error=InvalidTag");
  }

  try {
    await createTag({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
    });
  } catch (error) {
    if (error instanceof TagSlugConflictError) {
      redirect(`/admin/tags?error=SlugTaken&slug=${encodeURIComponent(error.slug)}`);
    }
    if (isStableTagValidationError(error)) {
      redirect("/admin/tags?error=InvalidTag");
    }
    console.error("[admin tags] Failed to create tag", error);
    throw new Error("Failed to save tag");
  }

  try {
    revalidatePath("/admin/tags");
  } catch (error) {
    console.error("[admin tags] revalidation failed after create", error);
  }

  try {
    revalidatePath("/tag/[slug]", "page");
  } catch (error) {
    console.error("[admin tags] revalidation failed for /tag/[slug] after create", error);
  }
}

// deleteTagAction
// Input: FormData with id
// Output: redirect to /admin/tags?error=…
// Auth: Admin (Auth.js GitHub)
// UI: submitted from the "Delete" button on the admin tags page (only enabled when postCount=0)
export async function deleteTagAction(formData: FormData): Promise<void> {
  await ensureAdmin();

  const parsed = adminTagIdFormSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    redirect("/admin/tags?error=InvalidTag");
  }

  try {
    await deleteTag(parsed.data.id);
  } catch (error) {
    if (error instanceof TagInUseError) {
      redirect(`/admin/tags?error=TagInUse&posts=${error.postCount}&id=${encodeURIComponent(error.tagId)}`);
    }
    if (isStableTagValidationError(error)) {
      redirect("/admin/tags?error=InvalidTag");
    }
    console.error("[admin tags] Failed to delete tag", error);
    throw new Error("Failed to delete tag");
  }

  try {
    revalidatePath("/admin/tags");
  } catch (error) {
    console.error("[admin tags] revalidation failed after delete", error);
  }

  try {
    revalidatePath("/tag/[slug]", "page");
  } catch (error) {
    console.error("[admin tags] revalidation failed for /tag/[slug] after delete", error);
  }
}
