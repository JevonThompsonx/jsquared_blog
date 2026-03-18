import type { Metadata } from "next";
import { Lora } from "next/font/google";
import Script from "next/script";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={lora.variable}>
      <body>
        <AppProviders>{children}</AppProviders>
        {process.env.NODE_ENV === "production" ? (
          <Script
            data-domain="jsquaredadventures.com"
            defer
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
