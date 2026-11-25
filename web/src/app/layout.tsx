import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Lora } from "next/font/google";
import Script from "next/script";
import { preconnect } from "react-dom";

import { SiteFooter } from "@/components/layout/site-footer";
import { AppProviders } from "@/components/providers/app-providers";
import { ServiceWorkerRegistry } from "@/components/pwa-registry";
import { BackToTop } from "@/components/ui/back-to-top";

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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://jsquaredadventures.com",
  ),
  title: {
    default: "J²Adventures",
    template: "%s | J²Adventures",
  },
  description:
    "Travel stories, maps, camps, hikes, and photo-led field notes from J²Adventures.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "J²Adventures",
    description:
      "Travel stories, maps, camps, hikes, and photo-led field notes from J²Adventures.",
    siteName: "J²Adventures",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/images/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "J²Adventures — travel stories from the road",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "J²Adventures",
    description:
      "Travel stories, maps, camps, hikes, and photo-led field notes from J²Adventures.",
    images: ["/images/og-default.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // 6.S.1: Read nonce injected by middleware so the Plausible <Script> is whitelisted by CSP
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;

  // Warm the image CDN connection before the hero/card images are discovered.
  // Self-hosted media is served from this origin, so no third-party preconnect
  // is needed once legacy Cloudinary URLs are migrated.
  preconnect("https://jsquaredadventures.com", { crossOrigin: "anonymous" });

  return (
    <html lang="en" className={lora.variable} data-scroll-behavior="smooth">
      <body className="antialiased">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <AppProviders>{children}</AppProviders>
        <SiteFooter />
        <BackToTop />
        <ServiceWorkerRegistry />
        {process.env.NODE_ENV === "production" ? (
          <Script
            data-api="https://plausible.io/api/event"
            data-domain={
              process.env.NEXT_PUBLIC_SITE_URL
                ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
                : "jsquaredadventures.com"
            }
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
