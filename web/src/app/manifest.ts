import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "J²Adventures",
    short_name: "J²Adventures",
    description: "A travel blog for our adventures.",
    lang: "en",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4a5d4e", // Sage green (from the primary theme)
    categories: ["travel", "blog", "lifestyle"],
    icons: [
      // 192/512 PNGs are generated from /icon.svg so Android Chrome can
      // install the PWA on the home screen (SVG-only manifests are rejected).
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // SVG is scalable — kept for browsers that accept `sizes: 'any'` per
        // the Web App Manifest spec.
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/home-desktop.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "J²Adventures home — desktop",
      },
      {
        src: "/screenshots/home-mobile.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "J²Adventures home — mobile",
      },
    ],
  };
}
