"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";
import { deleteSeasonByKey, upsertSeason } from "@/server/dal/seasons";

function generateId(): string {
  return crypto.randomUUID();
}

export async function upsertSeasonAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/admin?error=AccessDenied");
  }

  const seasonKey = (formData.get("seasonKey") as string | null)?.trim() ?? "";
  const displayName = (formData.get("displayName") as string | null)?.trim() ?? "";

  if (!seasonKey || !displayName || displayName.length > 100) {
    return;
  }

  await upsertSeason(generateId(), seasonKey, displayName, session.user.id);
  revalidatePath("/admin/seasons");
  revalidatePath("/");
}

export async function deleteSeasonAction(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/admin?error=AccessDenied");
  }

  const seasonKey = (formData.get("seasonKey") as string | null)?.trim() ?? "";
  if (!seasonKey) {
    return;
  }

  await deleteSeasonByKey(seasonKey);
  revalidatePath("/admin/seasons");
  revalidatePath("/");
}
