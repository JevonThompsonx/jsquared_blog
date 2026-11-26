import { signOut } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import {
  getWorkosLogoutTarget,
  LOGOUT_RETURN_COOKIE_NAME,
} from "@/lib/auth/workos";
import { getWorkosRequestOrigin } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse | void> {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== getWorkosRequestOrigin(request)) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } catch {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const { returnPath, workosReturnTo, cookieOptions } =
    getWorkosLogoutTarget(request);
  if (returnPath !== "/") {
    const cookieStore = await cookies();
    cookieStore.set(LOGOUT_RETURN_COOKIE_NAME, returnPath, cookieOptions);
  }

  return signOut({ returnTo: workosReturnTo });
}
