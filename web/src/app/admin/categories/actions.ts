"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";
import {
  CategoryInUseError,
  CategorySlugConflictError,
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/server/dal/categories";
import {
  adminCategoryCreateFormSchema,
  adminCategoryIdFormSchema,
  adminCategoryUpdateFormSchema,
} from "@/server/forms/admin-taxonomy";

async function ensureAdmin() {
  const session = await requireAdminSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/admin?error=AccessDenied");
  }
  return session.user.id;
}

function isStableValidationError(error: unknown): boolean {
  return error instanceof Error
    && (error.message === "Invalid request" || error.message === "Category name is required" || error.message === "Category slug is required");
}

// createCategoryAction
// Input: FormData matching adminCategoryCreateFormSchema
// Output: redirect to /admin/categories?error=…
// Auth: Admin (Auth.js GitHub)
// UI: submitted from "Create category" form on the admin categories page
export async function createCategoryAction(formData: FormData): Promise<void> {
  await ensureAdmin();

  const parsed = adminCategoryCreateFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    redirect("/admin/categories?error=InvalidCategory");
  }

  try {
    await createCategory({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
    });
  } catch (error) {
    if (error instanceof CategorySlugConflictError) {
      redirect(`/admin/categories?error=SlugTaken&slug=${encodeURIComponent(error.slug)}`);
    }
    if (isStableValidationError(error)) {
      redirect("/admin/categories?error=InvalidCategory");
    }
    console.error("[admin categories] Failed to create category", error);
    throw new Error("Failed to save category");
  }

  try {
    revalidatePath("/admin/categories");
    revalidatePath("/categories");
  } catch (error) {
    console.error("[admin categories] revalidation failed after create", error);
  }
}

// updateCategoryAction
// Input: FormData matching adminCategoryUpdateFormSchema (id + name + slug + description)
// Output: redirect to /admin/categories?error=…
// Auth: Admin (Auth.js GitHub)
// UI: submitted from the inline "Edit" form on the admin categories page
export async function updateCategoryAction(formData: FormData): Promise<void> {
  await ensureAdmin();

  const parsed = adminCategoryUpdateFormSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    redirect("/admin/categories?error=InvalidCategory");
  }

  try {
    await updateCategory({
      id: parsed.data.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
    });
  } catch (error) {
    if (error instanceof CategorySlugConflictError) {
      redirect(`/admin/categories?error=SlugTaken&slug=${encodeURIComponent(error.slug)}&id=${encodeURIComponent(parsed.data.id)}`);
    }
    if (isStableValidationError(error)) {
      redirect("/admin/categories?error=InvalidCategory");
    }
    console.error("[admin categories] Failed to update category", error);
    throw new Error("Failed to save category");
  }

  try {
    revalidatePath("/admin/categories");
    revalidatePath("/categories");
  } catch (error) {
    console.error("[admin categories] revalidation failed after update", error);
  }
}

// deleteCategoryAction
// Input: FormData with id
// Output: redirect to /admin/categories?error=…
// Auth: Admin (Auth.js GitHub)
// UI: submitted from the "Delete" button on the admin categories page (only enabled when postCount=0)
export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await ensureAdmin();

  const parsed = adminCategoryIdFormSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    redirect("/admin/categories?error=InvalidCategory");
  }

  try {
    await deleteCategory(parsed.data.id);
  } catch (error) {
    if (error instanceof CategoryInUseError) {
      redirect(`/admin/categories?error=CategoryInUse&posts=${error.postCount}&id=${encodeURIComponent(error.categoryId)}`);
    }
    if (error instanceof Error && error.message === "Category id is required") {
      redirect("/admin/categories?error=InvalidCategory");
    }
    console.error("[admin categories] Failed to delete category", error);
    throw new Error("Failed to delete category");
  }

  try {
    revalidatePath("/admin/categories");
    revalidatePath("/categories");
  } catch (error) {
    console.error("[admin categories] revalidation failed after delete", error);
  }
}
