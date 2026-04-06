import Link from "next/link";
import { getPublishedTemplates } from "@/lib/supabase/product-queries";
import { ProductGridCard } from "@/components/product/product-grid-card";

// Target counts per category. Total must equal the grid size (8).
const FEATURED_COUNTS: Record<string, number> = {
  iphone: 4,
  laptop: 2,
  smartwatch: 2,
};
const TOTAL = 8;

export async function FeaturedProducts() {
  let allProducts: {
    slug: string;
    image?: string;
    title: string;
    minPrice: number | null;
    compareAtPrice?: number | null;
    deviceCount: number;
    brand: string;
    category: string;
    locations: { name: string; type: string; count: number }[];
  }[];

  try {
    // Fetch all three categories in parallel
    const [iphones, laptops, smartwatches] = await Promise.all([
      getPublishedTemplates("iphone"),
      getPublishedTemplates("laptop"),
      getPublishedTemplates("smartwatch"),
    ]);

    // Sort each pool: in-stock first, then by min_price ascending
    const sort = (arr: typeof iphones) =>
      [...arr].sort((a, b) => {
        if (b.device_count !== a.device_count)
          return b.device_count - a.device_count;
        return (a.min_price ?? Infinity) - (b.min_price ?? Infinity);
      });

    const pools = {
      iphone: sort(iphones),
      laptop: sort(laptops),
      smartwatch: sort(smartwatches),
    };

    // Pick the target count from each pool, fill spare slots with leftovers
    const picked: typeof iphones = [];
    const leftovers: typeof iphones = [];

    for (const [cat, target] of Object.entries(FEATURED_COUNTS)) {
      const pool = pools[cat as keyof typeof pools] ?? [];
      picked.push(...pool.slice(0, target));
      leftovers.push(...pool.slice(target));
    }

    // If we didn't hit TOTAL, pad with leftover items (any category)
    const needed = TOTAL - picked.length;
    if (needed > 0) {
      picked.push(...leftovers.slice(0, needed));
    }

    // Interleave categories so the grid looks diverse (iphone, laptop, iphone,
    // smartwatch, iphone, laptop, iphone, smartwatch) instead of all iPhones first.
    const buckets: Record<string, typeof iphones> = {};
    for (const p of picked) {
      if (!buckets[p.category]) buckets[p.category] = [];
      buckets[p.category].push(p);
    }
    const interleaved: typeof iphones = [];
    let safety = 0;
    while (interleaved.length < picked.length && safety < 200) {
      safety++;
      for (const cat of Object.keys(buckets)) {
        const item = buckets[cat].shift();
        if (item) interleaved.push(item);
        if (interleaved.length >= picked.length) break;
      }
    }

    allProducts = interleaved.map((t) => ({
      slug: t.slug,
      image: t.images?.[0],
      title: t.display_name,
      minPrice: t.min_price ?? t.base_price_a ?? null,
      compareAtPrice: t.base_price_a ?? null,
      deviceCount: t.device_count,
      brand: t.brand,
      category: t.category,
      locations: t.locations,
    }));
  } catch {
    return null;
  }

  if (allProducts.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
      <div className="mb-8 flex items-baseline justify-between">
        <h2 className="font-display text-3xl font-bold text-charcoal">
          Populære produkter
        </h2>
        <Link
          href="/refurbished"
          className="font-semibold text-green-eco transition-opacity hover:opacity-80"
        >
          Se alle &rarr;
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {allProducts.map((product) => (
          <ProductGridCard
            key={product.slug}
            slug={product.slug}
            image={product.image}
            title={product.title}
            minPrice={product.minPrice}
            compareAtPrice={product.compareAtPrice}
            deviceCount={product.deviceCount}
            brand={product.brand}
            category={product.category}
            locations={product.locations}
            showCategoryBadge
          />
        ))}
      </div>
    </section>
  );
}
