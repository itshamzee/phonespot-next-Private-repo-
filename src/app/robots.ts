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
          "/search",
          "/soeg",
          "/checkout",
          "/ordre/",
          "/fortryd/",
          "/enhed/",
          "/garanti/", // kun garanti-opslag med kode — /garanti (uden slash) er fortsat åben
          "/b2b/dashboard",
          "/b2b/login",
          "/b2b/registrer",
        ],
      },
    ],
    sitemap: "https://phonespot.dk/sitemap.xml",
  };
}
