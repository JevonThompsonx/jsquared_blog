"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { updateTagDescription } from "@/server/dal/admin-tags";

const updateTagDescriptionSchema = z.object({
  tagId: z.string().min(1),
  description: z.string().max(500).nullable(),
});

export async function updateTagDescriptionAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  if (session?.user?.role !== "admin") {
    return;
  }

  const raw = updateTagDescriptionSchema.safeParse({
    tagId: formData.get("tagId"),
    description: formData.get("description") || null,
  });

  if (!raw.success) {
    return;
  }

  await updateTagDescription(raw.data.tagId, raw.data.description);
  revalidatePath("/admin/tags");
  revalidatePath("/tag/[slug]", "page");
}
