export const dynamic = "force-dynamic";

import type { Metadata } from "next";

import { AuthKitNotice } from "@/components/auth/authkit-notice";

export const metadata: Metadata = {
  title: "Email Code Help",
  description:
    "Use a one-time email code from WorkOS AuthKit to recover account access. No password is required.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
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
