import type { MetadataRoute } from "next";
import { AI_AND_SEARCH_CRAWLERS, PRIVATE_PATHS } from "@/lib/seo/crawlers";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: AI_AND_SEARCH_CRAWLERS,
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: "https://phonespot.dk/sitemap.xml",
  };
}
