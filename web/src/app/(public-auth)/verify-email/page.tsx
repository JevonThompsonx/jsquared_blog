export const dynamic = "force-dynamic";

import type { Metadata } from "next";

import { AuthKitNotice } from "@/components/auth/authkit-notice";

export const metadata: Metadata = {
  title: "Verify Email",
  description:
    "Enter the one-time email code from WorkOS AuthKit to verify your email and finish signing in.",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: Promise<{
    redirectTo?: string | string[];
    returnTo?: string | string[];
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const candidate = params.returnTo ?? params.redirectTo;
  return (
    <AuthKitNotice
      returnTo={typeof candidate === "string" ? candidate : undefined}
      screen="recovery"
    />
  );
}
