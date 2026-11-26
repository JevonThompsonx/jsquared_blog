export const dynamic = "force-dynamic";

import type { Metadata } from "next";

import { AuthKitNotice } from "@/components/auth/authkit-notice";
import { parseAuthErrorCode } from "@/lib/auth/auth-errors";

export const metadata: Metadata = {
  title: "Log In",
  description:
    "Sign in with a one-time email code from WorkOS AuthKit, a passkey, or a configured social account.",
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string | string[];
    redirectTo?: string | string[];
    returnTo?: string | string[];
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const candidate = params.returnTo ?? params.redirectTo;
  const errorCode = parseAuthErrorCode(
    typeof params.error === "string" ? params.error : null,
  );
  return (
    <AuthKitNotice
      error={errorCode}
      returnTo={typeof candidate === "string" ? candidate : undefined}
      screen="sign-in"
    />
  );
}
