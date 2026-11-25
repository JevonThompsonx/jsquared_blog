export const dynamic = "force-dynamic";

import type { Metadata } from "next";

import { AuthKitNotice } from "@/components/auth/authkit-notice";

export const metadata: Metadata = {
  title: "Log In",
  robots: { index: false, follow: true },
};

export default async function LoginPage({
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
      screen="sign-in"
    />
  );
}
