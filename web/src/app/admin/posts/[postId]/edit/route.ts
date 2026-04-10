import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";
import { ADMIN_FLASH_COOKIE_NAME, getAdminFlashCookieOptions } from "@/lib/admin-flash";

export async function GET(_request: Request, context: { params: Promise<{ postId: string }> }) {
  const session = await requireAdminSession();
  const requestUrl = new URL(_request.url);

  if (!session) {
    return NextResponse.redirect(new URL("/admin", requestUrl));
  }

  const { postId } = await context.params;
  const response = NextResponse.redirect(
    new URL(`/admin?postId=${encodeURIComponent(postId)}&editRemoved=1`, requestUrl),
  );

  response.cookies.set(ADMIN_FLASH_COOKIE_NAME, "editRemoved", getAdminFlashCookieOptions(requestUrl.protocol === "https:"));

  return response;
}
