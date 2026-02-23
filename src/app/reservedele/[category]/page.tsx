import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  SPARE_PART_CATEGORIES,
  getSparePartCategory,
  getModelsByGeneration,
} from "@/lib/spare-parts";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";

// ---------------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return SPARE_PART_CATEGORIES.map((cat) => ({ category: cat.slug }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const cat = getSparePartCategory(slug);
  if (!cat) return { title: "Ikke fundet - PhoneSpot" };

  return {
    title: `${cat.label} - Vælg model | PhoneSpot`,
    description: cat.description,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const cat = getSparePartCategory(slug);
  if (!cat) notFound();

  const generations = getModelsByGeneration(slug);

  return (
    <>
      {/* Hero */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <nav className="mb-4 text-sm text-white/50" aria-label="Breadcrumb">
          <Link href="/reservedele" className="hover:text-white/80">
            Reservedele
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <span className="text-white/80">{cat.label}</span>
        </nav>
        <Heading as="h1" size="xl" className="text-white">
          {cat.label}
        </Heading>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
          {cat.description}
        </p>
      </SectionWrapper>

      {/* Model grid — grouped by generation */}
      <SectionWrapper>
        {generations.length === 1 && generations[0].generation === "Alle" ? (
          // No generation grouping — flat grid
          <>
            <Heading as="h2" size="md" className="mb-8 text-center">
              Vælg din model
            </Heading>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {cat.models.map((model) => (
                <Link
                  key={model.slug}
                  href={`/reservedele/${cat.slug}/${model.slug}`}
                  className="group flex flex-col items-center justify-center rounded-2xl border border-sand bg-white px-4 py-8 text-center transition-all hover:border-green-eco hover:shadow-md"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cream text-charcoal transition-colors group-hover:bg-green-eco group-hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                      <path d={cat.iconPath} />
                    </svg>
                  </div>
                  <span className="font-display text-sm font-semibold uppercase tracking-[1.5px] text-charcoal transition-colors group-hover:text-green-eco">
                    {model.label}
                  </span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          // Generation-grouped layout
          <>
            <Heading as="h2" size="md" className="mb-10 text-center">
              Vælg din model
            </Heading>
            <div className="space-y-12">
              {generations.map(({ generation, models }) => (
                <div key={generation}>
                  <h3 className="mb-4 flex items-center gap-3 font-display text-lg font-semibold uppercase tracking-[2px] text-charcoal">
                    <span className="h-px flex-1 bg-sand" />
                    <span>{generation}</span>
                    <span className="h-px flex-1 bg-sand" />
                  </h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {models.map((model) => (
                      <Link
                        key={model.slug}
                        href={`/reservedele/${cat.slug}/${model.slug}`}
                        className="group flex flex-col items-center justify-center rounded-2xl border border-sand bg-white px-4 py-8 text-center transition-all hover:border-green-eco hover:shadow-md"
                      >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cream text-charcoal transition-colors group-hover:bg-green-eco group-hover:text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                            <path d={cat.iconPath} />
                          </svg>
                        </div>
                        <span className="font-display text-sm font-semibold uppercase tracking-[1.5px] text-charcoal transition-colors group-hover:text-green-eco">
                          {model.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SectionWrapper>

      {/* Trust */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
