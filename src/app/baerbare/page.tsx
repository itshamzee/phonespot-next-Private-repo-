import type { Metadata } from "next";
import Link from "next/link";
import { CategoryHero } from "@/components/collection/category-hero";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Bærbare Computere - Refurbished Laptops | PhoneSpot",
  description:
    "Kvalitetstestede bærbare fra Lenovo, Apple og HP. Testet og klar med garanti.",
};

// ---------------------------------------------------------------------------
// Brand tiles data
// ---------------------------------------------------------------------------

const brands = [
  {
    slug: "lenovo",
    title: "Lenovo",
    subtitle: "ThinkPad & IdeaPad",
  },
  {
    slug: "apple",
    title: "Apple",
    subtitle: "MacBook Air & Pro",
  },
  {
    slug: "hp",
    title: "HP",
    subtitle: "EliteBook & ProBook",
  },
];

// ---------------------------------------------------------------------------
// Quality story items
// ---------------------------------------------------------------------------

const qualityItems = [
  {
    icon: "🔋",
    title: "Batteritest",
    description: "Min. 4 timers batteritid verificeret",
  },
  {
    icon: "💻",
    title: "Ren installation",
    description: "Windows/macOS installeret fra bunden",
  },
  {
    icon: "🔍",
    title: "Tastatur & skærm",
    description: "Grundigt inspiceret for fejl",
  },
  {
    icon: "⚡",
    title: "Stresstest",
    description: "Kører under fuld belastning i 1 time",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BaerbarePage() {
  return (
    <>
      {/* 1. CategoryHero */}
      <CategoryHero
        title="Bærbare computere du kan stole på"
        description="Kvalitetstestede bærbare fra de bedste mærker. Testet, rengjort og klar til brug — med garanti."
        badge="Fra 1.999 kr"
      />

      {/* 2. Brand Showcase Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {brands.map((brand, index) => (
            <FadeIn key={brand.slug} delay={index * 0.1}>
              <Link
                href={`/baerbare/${brand.slug}`}
                className="block rounded-radius-lg border border-sand bg-white p-8 text-center transition-shadow hover:shadow-md"
              >
                <h2 className="font-display text-2xl font-bold text-charcoal">
                  {brand.title}
                </h2>
                <p className="mt-2 text-gray">{brand.subtitle}</p>
                <span className="mt-4 inline-block font-semibold text-green-eco">
                  Se udvalg &rarr;
                </span>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* 3. Studiecomputer Highlight */}
      <section className="ps-pattern-dots-green py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <FadeIn>
            <Heading as="h2" size="lg" className="text-white">
              Studiecomputer?
            </Heading>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
              Find den perfekte bærbare til studiet — uden at sprænge SU&apos;en.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <Link
              href="/baerbare/studiecomputer"
              className="mt-8 inline-block rounded-full bg-white px-8 py-3 font-semibold text-green-eco transition-opacity hover:opacity-90"
            >
              Se studiecomputere &rarr;
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* 4. Quality Story Strip */}
      <SectionWrapper background="sand">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {qualityItems.map((item, index) => (
            <FadeIn key={item.title} delay={index * 0.1}>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl">
                  {item.icon}
                </div>
                <h3 className="font-display font-bold text-charcoal">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-gray">{item.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* 5. TrustBar */}
      <TrustBar />
    </>
  );
}
