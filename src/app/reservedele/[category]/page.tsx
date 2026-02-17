import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  SPARE_PART_CATEGORIES,
  getSparePartCategory,
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

  // If category has only one "model" (e.g., Samsung/MacBook), redirect logic
  // is handled via the hub page links — but we still render a fallback here.

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

      {/* Model grid */}
      <SectionWrapper>
        <Heading as="h2" size="md" className="mb-8 text-center">
          Vælg din model
        </Heading>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cat.models.map((model) => (
            <Link
              key={model.slug}
              href={`/reservedele/${cat.slug}/${model.slug}`}
              className="group flex items-center justify-center rounded-xl border border-sand bg-white px-4 py-5 text-center transition-all hover:border-green-eco hover:shadow-md"
            >
              <span className="font-display text-sm font-semibold uppercase tracking-[1.5px] text-charcoal transition-colors group-hover:text-green-eco">
                {model.label}
              </span>
            </Link>
          ))}
        </div>
      </SectionWrapper>

      {/* Trust */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
