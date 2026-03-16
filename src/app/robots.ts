import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/kasse/",
          "/konto/",
          "/reparation/booking",
          "/reparation/bekraeftelse",
          "/reparation/status/",
          "/saelg-din-enhed/accepter",
          "/saelg-din-enhed/afvis",
          "/collections/",
          "/pages/",
          "/products/",
          "/blogs/",
          "/search",
          "/soeg",
        ],
      },
    ],
    sitemap: "https://phonespot.dk/sitemap.xml",
  };
}
