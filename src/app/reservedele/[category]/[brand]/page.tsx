import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SparePartsHero } from "@/components/spare-parts/spare-parts-hero";
import { SparePartsFilters } from "@/components/spare-parts/spare-parts-filters";
import { SparePartsGrid } from "@/components/spare-parts/spare-parts-grid";
import { getSparePartCategoryBySlug } from "@/lib/supabase/spare-parts";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalise(slug: string): string {
  // "apple" -> "Apple", "samsung" -> "Samsung"
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; brand: string }>;
}): Promise<Metadata> {
  const { category: categorySlug, brand: brandSlug } = await params;
  const category = await getSparePartCategoryBySlug(categorySlug);
  if (!category) return { title: "Ikke fundet — PhoneSpot" };

  const brandName = capitalise(brandSlug);
  const title = `${category.name} til ${brandName} | PhoneSpot`;
  const description = `Køb ${category.name.toLowerCase()} til ${brandName}. Original og premium kvalitet med op til 2 års garanti. Levering i hele Danmark.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://phonespot.dk/reservedele/${categorySlug}/${brandSlug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BrandFilterPage({
  params,
}: {
  params: Promise<{ category: string; brand: string }>;
}) {
  const { category: categorySlug, brand: brandSlug } = await params;
  const category = await getSparePartCategoryBySlug(categorySlug);
  if (!category) notFound();

  const brandName = capitalise(brandSlug);

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
      <span className="font-medium text-[#111111]">{brandName}</span>
    </nav>
  );

  return (
    <>
      <SparePartsHero
        title={`${category.name} til ${brandName}`}
        subtitle={`Originale og premium ${category.name.toLowerCase()} til alle ${brandName}-modeller. Op til 2 års garanti og gratis fragt i Danmark.`}
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
