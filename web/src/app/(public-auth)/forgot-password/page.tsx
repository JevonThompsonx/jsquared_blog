export const dynamic = "force-dynamic";

import type { Metadata } from "next";

import { AuthKitNotice } from "@/components/auth/authkit-notice";

export const metadata: Metadata = {
  title: "Forgot Password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <AuthKitNotice screen="password" />;
}
