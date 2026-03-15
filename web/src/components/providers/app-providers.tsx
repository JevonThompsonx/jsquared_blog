"use client";

import { SessionProvider } from "next-auth/react";

import { NextThemeProvider } from "@/components/theme/theme-provider";
import { UserThemeSync } from "@/components/providers/user-theme-sync";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemeProvider>
        <UserThemeSync />
        {children}
      </NextThemeProvider>
    </SessionProvider>
  );
}
