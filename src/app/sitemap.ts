import type { MetadataRoute } from "next";

import { COLLECTION_MAP } from "@/lib/collections";
import { SPARE_PART_CATEGORIES } from "@/lib/spare-parts";
import { getPublishedTemplates, getPublishedSkuProducts } from "@/lib/supabase/product-queries";
import { getAllPosts } from "@/lib/blog";
import { COMPARISONS } from "@/lib/comparisons";
import { MODEL_PAGES } from "@/lib/model-pages";
import { getActiveBrands, getAllModelSlugs } from "@/lib/supabase/repairs";
import { SPOT_HUB_TILES, TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { fetchActiveSpotSkus } from "@/lib/spot/queries";

const BASE_URL = "https://phonespot.dk";

// ---------------------------------------------------------------------------
// Spot (Beskyttelsesglas) sitemap entries
// ---------------------------------------------------------------------------

async function spotSitemapEntries(base: string): Promise<MetadataRoute.Sitemap> {
  const skus = await fetchActiveSpotSkus().catch(() => []);
  const covered = new Set(skus.flatMap((s) => s.compatible_models));

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/beskyttelsesglas`,          lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/beskyttelsesglas/vejle`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/beskyttelsesglas/slagelse`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  ];

  for (const tile of SPOT_HUB_TILES) {
    entries.push({
      url: `${base}/beskyttelsesglas/${tile.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const device of TILBEHOER_DEVICES) {
    if (!covered.has(device.slug)) continue;
    const tile = SPOT_HUB_TILES.find(
      (t) =>
        t.brand === device.brand &&
        (t.modelPrefix ? device.slug.startsWith(t.modelPrefix) : true),
    );
    if (!tile) continue;
    entries.push({
      url: `${base}/beskyttelsesglas/${tile.id}/${device.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}

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
      changeFrequency: "weekly",
      priority: 0.9,
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
      url: `${BASE_URL}/prismatch`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/garanti`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/forsikring`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
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

  // ---- Product pages (from Supabase) ----------------------------------------

  const productPages: MetadataRoute.Sitemap = [];

  try {
    const [allTemplates, allSkuProducts] = await Promise.all([
      getPublishedTemplates(),
      getPublishedSkuProducts(),
    ]);

    for (const t of allTemplates) {
      productPages.push({
        url: `${BASE_URL}/refurbished/${t.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const p of allSkuProducts) {
      if (p.slug) {
        productPages.push({
          url: `${BASE_URL}/tilbehoer/${p.category ?? "covers"}/${p.slug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.5,
        });
      }
    }
  } catch {
    // Silently continue if product queries fail
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

  const allPosts = getAllPosts();
  const blogPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    ...allPosts.map((post) => ({
      url: `${BASE_URL}/blog/${post.frontmatter.slug}`,
      lastModified: new Date(post.frontmatter.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  // ---- Comparison pages (Task 6 will populate dynamically) -------------------

  const comparisonPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/sammenlign`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    ...COMPARISONS.map((c) => ({
      url: `${BASE_URL}/sammenlign/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  // ---- Model landing pages ---------------------------------------------------

  const modelPages: MetadataRoute.Sitemap = MODEL_PAGES.map((m) => ({
    url: `${BASE_URL}/refurbished/${m.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // ---- Repair pages -----------------------------------------------------------

  const repairBrands = await getActiveBrands();
  const repairBrandPages: MetadataRoute.Sitemap = repairBrands.map((brand) => ({
    url: `${BASE_URL}/reparation/${brand.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const repairModelSlugs = await getAllModelSlugs();
  const repairModelPages: MetadataRoute.Sitemap = repairModelSlugs.map(({ brand, model }) => ({
    url: `${BASE_URL}/reparation/${brand}/${model}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // ---- Location-specific repair pages -----------------------------------------
  // Only the static landing page that actually exists (/reparation-vejle) —
  // the dynamic /reparation/[location]/... routes were removed in 79cc23d, and
  // /reparation-slagelse was never a real route (it 301s to /reparation), so it
  // must not be advertised here.

  const locationRepairPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/reparation-vejle`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
  ];

  // ---- Service pages ----------------------------------------------------------

  const servicePages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/saelg-din-enhed`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/tilbehoer`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/butik`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/butik/slagelse`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/butik/vejle`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/delbetaling`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/reparation-vejle`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/iphones-vejle`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/baerbare-vejle`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ];

  // ---- Feed URLs (for discoverability — not crawled by search engines) ------

  const feedPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/feeds/google-shopping`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.1,
    },
  ];

  // ---- Spot (Beskyttelsesglas) pages ----------------------------------------

  const spotPages = await spotSitemapEntries(BASE_URL);

  return [...staticPages, ...servicePages, ...collectionPages, ...productPages, ...sparePartPages, ...blogPages, ...comparisonPages, ...modelPages, ...repairBrandPages, ...repairModelPages, ...locationRepairPages, ...feedPages, ...spotPages];
}
