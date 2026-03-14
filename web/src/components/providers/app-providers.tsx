"use client";

import { SessionProvider } from "next-auth/react";

import { NextThemeProvider } from "@/components/theme/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemeProvider>{children}</NextThemeProvider>
    </SessionProvider>
  );
}
