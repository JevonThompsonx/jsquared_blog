"use client";

import { SessionProvider } from "next-auth/react";

import { NextThemeProvider } from "@/components/theme/theme-provider";
import { UserThemeSync } from "@/components/providers/user-theme-sync";
import { NavigationScrollFix } from "@/components/providers/navigation-scroll-fix";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemeProvider>
        <UserThemeSync />
        <NavigationScrollFix />
        {children}
      </NextThemeProvider>
    </SessionProvider>
  );
}
