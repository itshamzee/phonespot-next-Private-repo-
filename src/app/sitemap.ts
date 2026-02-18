import type { MetadataRoute } from "next";

import { COLLECTION_MAP } from "@/lib/collections";
import { SPARE_PART_CATEGORIES } from "@/lib/spare-parts";
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
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/reparation`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/kvalitet`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/om-os`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/reklamation`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/smartwatches`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/baerbare`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/baerbare/lenovo`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/baerbare/apple`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/baerbare/hp`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/baerbare/studiecomputer`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/privatlivspolitik`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/handelsbetingelser`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
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

  // ---- Spare parts pages ---------------------------------------------------

  const sparePartPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/reservedele`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  for (const cat of SPARE_PART_CATEGORIES) {
    sparePartPages.push({
      url: `${BASE_URL}/reservedele/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    });

    for (const model of cat.models) {
      sparePartPages.push({
        url: `${BASE_URL}/reservedele/${cat.slug}/${model.slug}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.6,
      });
    }
  }

  // ---- Blog & guide pages (Task 4 will populate dynamically) ----------------

  const blogPages: MetadataRoute.Sitemap = [];
  // TODO: Task 4 — dynamically populate from MDX blog posts

  // ---- Comparison pages (Task 6 will populate dynamically) -------------------

  const comparisonPages: MetadataRoute.Sitemap = [];
  // TODO: Task 6 — dynamically populate from comparison data

  return [...staticPages, ...collectionPages, ...productPages, ...sparePartPages, ...blogPages, ...comparisonPages];
}
