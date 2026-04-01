import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { STORE } from "@/lib/store-config";
import {
  getSparePartCategories,
  getSparePartCategoryBySlug,
  getQualityTiers,
} from "@/lib/supabase/spare-parts";
import { SparePartsHero } from "@/components/spare-parts/spare-parts-hero";
import { SparePartsFilters } from "@/components/spare-parts/spare-parts-filters";
import { SparePartsGrid } from "@/components/spare-parts/spare-parts-grid";

export const revalidate = 3600;

type Props = { params: Promise<{ category: string }> };

export async function generateStaticParams() {
  const categories = await getSparePartCategories();
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const cat = await getSparePartCategoryBySlug(slug);
  if (!cat) return {};

  const title = cat.seo_title || `${cat.name} til iPhone & Samsung | PhoneSpot`;
  const description =
    cat.seo_description ||
    `Køb ${cat.name.toLowerCase()} til alle enheder. Op til 2 års garanti. Levering i hele Danmark.`;

  return {
    title,
    description,
    alternates: { canonical: `https://phonespot.dk/reservedele/${slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const cat = await getSparePartCategoryBySlug(slug);
  if (!cat) notFound();

  const qualityTiers = await getQualityTiers();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cat.hero_title || cat.name,
    description: cat.seo_description || cat.description,
    url: `https://phonespot.dk/reservedele/${slug}`,
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <SparePartsHero
        title={cat.hero_title || `${cat.name} til alle enheder`}
        subtitle={cat.hero_subtitle || `Originale og premium ${cat.name.toLowerCase()} med garanti.`}
        breadcrumb={
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <ol className="flex items-center gap-1.5 text-[#86868B]">
              <li><Link href="/reservedele" className="hover:text-[#111111]">Reservedele</Link></li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-[#111111]">{cat.name}</li>
            </ol>
          </nav>
        }
      />

      {/* Quality guide */}
      {cat.quality_guide && (
        <section className="bg-white border-b border-[#E5E5EA]">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <h2 className="font-display text-xl font-bold text-[#111111] mb-4">
              Hvilken kvalitet skal du vælge?
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-[#111111]/70 mb-6">
              {cat.quality_guide}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {qualityTiers.map((tier) => (
                <div key={tier.id} className="rounded-xl border border-[#E5E5EA] bg-[#F7F7F8] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: tier.badge_color, color: tier.badge_text_color }}
                    >
                      {tier.name}
                    </span>
                    <span className="text-xs text-[#86868B]">{tier.default_warranty_months} mdr garanti</span>
                  </div>
                  <p className="text-xs text-[#111111]/70">{tier.short_description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured models */}
      {cat.featured_models && cat.featured_models.length > 0 && (
        <section className="bg-white border-b border-[#E5E5EA]">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <h2 className="font-display text-xl font-bold text-[#111111] mb-4">
              Populære modeller
            </h2>
            <div className="flex flex-wrap gap-2">
              {cat.featured_models.map((m) => (
                <Link
                  key={m.slug}
                  href={`/reservedele/${slug}/${m.brand.toLowerCase()}/${m.slug}`}
                  className="rounded-full border border-[#E5E5EA] bg-[#F7F7F8] px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:border-[#1A3D2E] hover:text-[#1A3D2E]"
                >
                  {m.model}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filter + Grid */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex gap-8">
            <SparePartsFilters />
            <div className="flex-1 min-w-0">
              <SparePartsGrid />
            </div>
          </div>
        </div>
      </section>

      {/* SEO text + FAQ */}
      {(cat.seo_text || (cat.faq && cat.faq.length > 0)) && (
        <section className="border-t border-[#E5E5EA] bg-white">
          <div className="mx-auto max-w-4xl px-4 py-16">
            {cat.seo_text && (
              <div className="text-sm leading-relaxed text-[#111111]/70">
                <h2 className="font-display text-2xl font-bold text-[#111111] mb-6">
                  {cat.name} — Alt hvad du skal vide
                </h2>
                <p>{cat.seo_text}</p>
              </div>
            )}
            {cat.faq && cat.faq.length > 0 && (
              <div className="mt-12">
                <h3 className="font-display text-lg font-bold text-[#111111] mb-6">
                  Ofte stillede spørgsmål
                </h3>
                <dl className="space-y-6">
                  {cat.faq.map((item, i) => (
                    <div key={i}>
                      <dt className="font-medium text-[#111111]">{item.question}</dt>
                      <dd className="mt-1 text-sm text-[#111111]/70">{item.answer}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
