import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountSettings } from "./account-settings";

export const metadata: Metadata = {
  title: "Account Settings",
};

export default function AccountPage() {
  return (
    <Suspense>
      <AccountSettings />
    </Suspense>
  );
}
