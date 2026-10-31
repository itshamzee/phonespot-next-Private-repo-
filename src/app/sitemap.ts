import { getSaleItems, coversForModel, MIN_INDEXABLE } from "@/app/lagersalg/sale-view";
import type { MetadataRoute } from "next";

import { COLLECTION_MAP } from "@/lib/collections";
import { isSparePart } from "@/lib/spare-part-filter";
import { getPublishedTemplates, getPublishedSkuProducts } from "@/lib/supabase/product-queries";
import { getAllPosts } from "@/lib/blog";
import { COMPARISONS } from "@/lib/comparisons";
import { getActiveBrands, getAllModelSlugs } from "@/lib/supabase/repairs";
import { SPOT_HUB_TILES, TILBEHOER_DEVICES, PUBLIC_TILBEHOER_DEVICES, accessoryProductPath } from "@/lib/tilbehoer-config";
import { fetchActiveSpotSkus } from "@/lib/spot/queries";

const BASE_URL = "https://phonespot.dk";

// Fast dato for statiske sider. Opdateres, når sidernes indhold ændres
// væsentligt, så lastmod ikke skifter ved hvert build.
const STATIC_LAST_MODIFIED = new Date("2026-10-14");

// ---------------------------------------------------------------------------
// Spot (Beskyttelsesglas) sitemap entries
// ---------------------------------------------------------------------------

async function spotSitemapEntries(base: string): Promise<MetadataRoute.Sitemap> {
  const skus = await fetchActiveSpotSkus().catch(() => []);
  const covered = new Set(skus.flatMap((s) => s.compatible_models));

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/beskyttelsesglas`,          lastModified: STATIC_LAST_MODIFIED, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/beskyttelsesglas/vejle`,    lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/beskyttelsesglas/slagelse`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.8 },
  ];

  for (const tile of SPOT_HUB_TILES) {
    entries.push({
      url: `${base}/beskyttelsesglas/${tile.id}`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const device of PUBLIC_TILBEHOER_DEVICES) {
    if (!covered.has(device.slug)) continue;
    const tile = SPOT_HUB_TILES.find(
      (t) =>
        t.brand === device.brand &&
        (t.modelPrefix ? device.slug.startsWith(t.modelPrefix) : true),
    );
    if (!tile) continue;
    entries.push({
      url: `${base}/beskyttelsesglas/${tile.id}/${device.slug}`,
      lastModified: STATIC_LAST_MODIFIED,
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
      url: `${BASE_URL}/black-november`,
      lastModified: new Date("2026-11-01"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/erhverv`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: BASE_URL,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 1.0,
    },
    // /soeg er disallowed i robots.txt og hører ikke hjemme i sitemap.
    {
      url: `${BASE_URL}/faq`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/kontakt`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/hvorfor-phonespot`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/reparation`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/kvalitet`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/om-os`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/reklamation`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/prismatch`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/garanti`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/forsikring`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/smartwatches`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/baerbare`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/privatlivspolitik`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/handelsbetingelser`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // ---- Collection pages ----------------------------------------------------

  const collectionSlugs = Object.keys(COLLECTION_MAP);

  const collectionPages: MetadataRoute.Sitemap = collectionSlugs.map(
    (slug) => ({
      url: `${BASE_URL}/${slug}`,
      lastModified: STATIC_LAST_MODIFIED,
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
      if (isSparePart(p)) continue;
      if (p.slug) {
        productPages.push({
          url: `${BASE_URL}${accessoryProductPath({ subcategory: p.subcategory, category: p.category, slug: p.slug })}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.5,
        });
      }
    }
  } catch {
    // Silently continue if product queries fail
  }

  // ---- Blog & guide pages (Task 4 will populate dynamically) ----------------

  const allPosts = getAllPosts();
  const blogPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      lastModified: STATIC_LAST_MODIFIED,
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
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    ...COMPARISONS.map((c) => ({
      url: `${BASE_URL}/sammenlign/${c.slug}`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  // ---- Repair pages -----------------------------------------------------------

  const repairBrands = await getActiveBrands();
  const repairBrandPages: MetadataRoute.Sitemap = repairBrands.map((brand) => ({
    url: `${BASE_URL}/reparation/${brand.slug}`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const repairModelSlugs = await getAllModelSlugs();
  const repairModelPages: MetadataRoute.Sitemap = repairModelSlugs.map(({ brand, model }) => ({
    url: `${BASE_URL}/reparation/${brand}/${model}`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // ---- Location-specific repair pages -----------------------------------------
  // Static landing pages only — the dynamic /reparation/[location]/... routes
  // were removed in 79cc23d. The town pages and /reparation/indsend (mail-in)
  // were added in 2026-10.

  const locationRepairPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/reparation-vejle`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...[
      "/reparation-slagelse",
      "/reparation-hedensted",
      "/reparation-horsens",
      "/reparation-kolding",
      "/reparation-fredericia",
      "/reparation-naestved",
    ].map((path) => ({
      url: `${BASE_URL}${path}`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    {
      url: `${BASE_URL}/reparation/priser`,
      lastModified: new Date("2026-10-15"),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    ...["/reparation/android", "/reparation/tablet"].map((path) => ({
      url: `${BASE_URL}${path}`,
      lastModified: new Date("2026-10-15"),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    {
      url: `${BASE_URL}/reparation/indsend`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ];

  // ---- Service pages ----------------------------------------------------------

  const servicePages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/saelg-din-enhed`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/saelg-din-enhed/iphone`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/saelg-din-enhed/samsung`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/saelg-din-enhed/ipad`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/saelg-din-enhed/macbook`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/saelg-din-enhed/apple-watch`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/tilbehoer`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/butik`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/butik/slagelse`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/butik/vejle`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/butik/esbjerg`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/delbetaling`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/iphones-vejle`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/baerbare-vejle`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/iphone-18-tilbehoer`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/lagersalg`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
  ];

  // ---- Feed URLs (for discoverability — not crawled by search engines) ------

  const feedPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/feeds/google-shopping`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "daily" as const,
      priority: 0.1,
    },
  ];

  // ---- Spot (Beskyttelsesglas) pages ----------------------------------------

  const spotPages = await spotSitemapEntries(BASE_URL);

  // ---- Lagersalg pr. model (kun modeller med et reelt udvalg) ---------
  const saleCovers = await getSaleItems();
  const coverSalePages: MetadataRoute.Sitemap = TILBEHOER_DEVICES
    .filter((d) => coversForModel(saleCovers, d.slug).length >= MIN_INDEXABLE)
    .map((d) => ({
      url: `${BASE_URL}/lagersalg/${d.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

  return [...staticPages, ...servicePages, ...collectionPages, ...productPages, ...blogPages, ...comparisonPages, ...repairBrandPages, ...repairModelPages, ...locationRepairPages, ...feedPages, ...spotPages, ...coverSalePages];
}
