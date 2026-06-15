import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/posts/*",
          "/tag/*",
          "/category/*",
          "/series/*",
          "/author/*",
          "/wishlist/*",
          "/map",
          "/about",
        ],
        disallow: [
          "/admin/*",
          "/api/*",
          "/account/*",
          "/settings/*",
          "/preview/*",
          "/login",
          "/signup",
          "/callback",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
