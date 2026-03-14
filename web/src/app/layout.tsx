import type { Metadata } from "next";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://jsquaredadventures.com"),
  title: {
    default: "J²Adventures",
    template: "%s | J²Adventures",
  },
  description: "A staged migration of J²Adventures toward a unified Next.js architecture for stories, galleries, profiles, comments, scheduling, and SEO.",
  openGraph: {
    title: "J²Adventures",
    description: "Travel stories, photo-led publishing, and a staged move into a unified Next.js app.",
    siteName: "J²Adventures",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "J²Adventures",
    description: "Travel stories, photo-led publishing, and a staged move into a unified Next.js app.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
