import type { MetadataRoute } from "next";

import { COLLECTION_MAP } from "@/lib/collections";
import { getCollectionProducts } from "@/lib/shopify/client";

const BASE_URL = "https://phonespot.dk";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ---- Static pages --------------------------------------------------------

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/soeg`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/kontakt`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/hvorfor-phonespot`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/reparation`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // ---- Collection pages ----------------------------------------------------

  const collectionSlugs = Object.keys(COLLECTION_MAP);

  const collectionPages: MetadataRoute.Sitemap = collectionSlugs.map(
    (slug) => ({
      url: `${BASE_URL}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }),
  );

  // ---- Product pages -------------------------------------------------------

  const productPages: MetadataRoute.Sitemap = [];

  const collectionResults = await Promise.allSettled(
    collectionSlugs.map((slug) => {
      const { shopifyHandle } = COLLECTION_MAP[slug]!;
      return getCollectionProducts(shopifyHandle).then((collection) => ({
        slug,
        collection,
      }));
    }),
  );

  for (const result of collectionResults) {
    if (result.status !== "fulfilled" || !result.value.collection) continue;

    const { slug, collection } = result.value;

    for (const product of collection.products) {
      productPages.push({
        url: `${BASE_URL}/${slug}/${product.handle}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return [...staticPages, ...collectionPages, ...productPages];
}
