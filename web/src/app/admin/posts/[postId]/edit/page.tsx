import { requireAdminSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function EditAdminPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/admin");
  }

  const { postId } = await params;
  redirect(`/admin?postId=${encodeURIComponent(postId)}&editRemoved=1`);
}
