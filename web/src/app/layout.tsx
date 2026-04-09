import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Lora } from "next/font/google";
import Script from "next/script";

import { AppProviders } from "@/components/providers/app-providers";
import { ServiceWorkerRegistry } from "@/components/pwa-registry";

import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe5" },
    { media: "(prefers-color-scheme: dark)", color: "#111812" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://jsquaredadventures.com"),
  title: {
    default: "J²Adventures",
    template: "%s | J²Adventures",
  },
  description: "Travel stories, maps, camps, hikes, and photo-led field notes from J²Adventures.",
  openGraph: {
    title: "J²Adventures",
    description: "Travel stories, maps, camps, hikes, and photo-led field notes from J²Adventures.",
    siteName: "J²Adventures",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "J²Adventures",
    description: "Travel stories, maps, camps, hikes, and photo-led field notes from J²Adventures.",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // 6.S.1: Read nonce injected by middleware so the Plausible <Script> is whitelisted by CSP
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;

  return (
    <html lang="en" className={lora.variable} data-scroll-behavior="smooth">
      <body className="antialiased">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <AppProviders>{children}</AppProviders>
        <ServiceWorkerRegistry />
        {process.env.NODE_ENV === "production" ? (
          <Script
            data-domain="jsquaredadventures.com"
            defer
            nonce={nonce}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
