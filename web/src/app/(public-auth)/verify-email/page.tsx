export const dynamic = "force-dynamic";

import type { Metadata } from "next";

import { AuthKitNotice } from "@/components/auth/authkit-notice";

export const metadata: Metadata = {
  title: "Confirm Email",
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return <AuthKitNotice screen="password" />;
}
