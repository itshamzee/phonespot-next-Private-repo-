import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SparePartsHero } from "@/components/spare-parts/spare-parts-hero";
import { SparePartsFilters } from "@/components/spare-parts/spare-parts-filters";
import { SparePartsGrid } from "@/components/spare-parts/spare-parts-grid";
import {
  getSparePartCategoryBySlug,
  getSparePartProducts,
} from "@/lib/supabase/spare-parts";
import { slugify } from "@/lib/spare-parts-config";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalise(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

// Reconstruct a human-readable model name from a slug.
// "iphone-15-pro-max" -> "iPhone 15 Pro Max" is not possible without a lookup,
// so we do a best-effort capitalise-each-word transform.
function modelFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; brand: string; model: string }>;
}): Promise<Metadata> {
  const { category: categorySlug, brand: brandSlug, model: modelSlug } = await params;
  const category = await getSparePartCategoryBySlug(categorySlug);
  if (!category) return { title: "Ikke fundet — PhoneSpot" };

  const modelName = modelFromSlug(modelSlug);

  // Fetch the cheapest product to include price in meta title
  const { products } = await getSparePartProducts({
    categorySlug,
    brand: brandSlug,
    model: modelName,
    limit: 1,
    offset: 0,
  });

  const cheapestPrice =
    products.length > 0
      ? Math.round((products[0].sale_price ?? products[0].selling_price) / 100)
      : null;

  const priceFragment = cheapestPrice != null ? ` — Fra ${cheapestPrice} kr` : "";
  const title = `${category.name} til ${modelName}${priceFragment} | PhoneSpot`;
  const description = `Køb ${category.name.toLowerCase()} til ${modelName}. Originale og premium kvalitetsdele med op til 2 års garanti. Levering i hele Danmark.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://phonespot.dk/reservedele/${categorySlug}/${brandSlug}/${modelSlug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ModelFilterPage({
  params,
}: {
  params: Promise<{ category: string; brand: string; model: string }>;
}) {
  const { category: categorySlug, brand: brandSlug, model: modelSlug } = await params;
  const category = await getSparePartCategoryBySlug(categorySlug);
  if (!category) notFound();

  const brandName = capitalise(brandSlug);
  const modelName = modelFromSlug(modelSlug);

  const breadcrumb = (
    <nav aria-label="Brødkrumme" className="flex items-center gap-1.5 text-sm text-[#86868B]">
      <Link href="/reservedele" className="transition-colors hover:text-[#111111]">
        Reservedele
      </Link>
      <span aria-hidden="true">/</span>
      <Link
        href={`/reservedele/${categorySlug}`}
        className="transition-colors hover:text-[#111111]"
      >
        {category.name}
      </Link>
      <span aria-hidden="true">/</span>
      <Link
        href={`/reservedele/${categorySlug}/${brandSlug}`}
        className="transition-colors hover:text-[#111111]"
      >
        {brandName}
      </Link>
      <span aria-hidden="true">/</span>
      <span className="font-medium text-[#111111]">{modelName}</span>
    </nav>
  );

  return (
    <>
      <SparePartsHero
        title={`${category.name} til ${modelName}`}
        subtitle={`Originale og premium ${category.name.toLowerCase()} til ${modelName}. Op til 2 års garanti og gratis fragt i Danmark.`}
        breadcrumb={breadcrumb}
      />

      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <SparePartsFilters />
            <div className="flex-1 min-w-0">
              <SparePartsGrid />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
