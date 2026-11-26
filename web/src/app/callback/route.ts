import { handleAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse, type NextRequest } from "next/server";

import { enforceAuthRateLimit, parseAllowedEmails } from "@/lib/auth/workos";
import { mapAuthErrorToCode } from "@/lib/auth/auth-errors";
import { getServerEnv, getWorkosRequestOrigin } from "@/lib/env";
import { resolveWorkosIdentity } from "@/server/auth/workos-identity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const limited = await enforceAuthRateLimit(
    request,
    "auth-callback",
    30,
    300_000,
  );
  if (limited) return limited;
  let baseURL: string;
  try {
    baseURL = getWorkosRequestOrigin(request);
  } catch {
    return new NextResponse("Sign-in failed. Please try again.", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return handleAuth({
    baseURL,
    returnPathname: "/",
    onSuccess: async ({ user }) => {
      await resolveWorkosIdentity(user, {
        allowedEmails: parseAllowedEmails(getServerEnv().ADMIN_ALLOWED_EMAILS),
        promoteAllowedUser: false,
      });
    },
    onError: ({ error }) =>
      NextResponse.redirect(
        new URL(`/login?error=${mapAuthErrorToCode(error)}`, baseURL),
        {
          status: 302,
          headers: { "Cache-Control": "no-store" },
        },
      ),
  })(request);
}
