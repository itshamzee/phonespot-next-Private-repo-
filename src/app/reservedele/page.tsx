import type { Metadata } from "next";
import Link from "next/link";
import { SPARE_PART_CATEGORIES } from "@/lib/spare-parts";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";

export const metadata: Metadata = {
  title: "Reservedele til iPhone, iPad, MacBook & Samsung | PhoneSpot",
  description:
    "Kob reservedele til iPhone, Samsung, iPad og MacBook hos PhoneSpot. Skaerme, batterier, kameraer og mere med 24 maneders garanti.",
};

function CategoryIcon({ path }: { path: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-10 w-10"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export default function ReservedelePage() {
  return (
    <>
      {/* Hero */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <Heading as="h1" size="xl" className="text-white">
          Reservedele
        </Heading>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
          Find kvalitetsreservedele til din enhed. Skaerme, batterier, kameraer
          og meget mere — alt med 24 maneders garanti.
        </p>
      </SectionWrapper>

      {/* Category grid */}
      <SectionWrapper>
        <Heading as="h2" size="md" className="mb-8 text-center">
          Vaelg enhedstype
        </Heading>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SPARE_PART_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={
                cat.models.length === 1
                  ? `/reservedele/${cat.slug}/${cat.models[0].slug}`
                  : `/reservedele/${cat.slug}`
              }
              className="group flex flex-col items-center rounded-2xl border border-sand bg-white p-8 text-center transition-all hover:border-green-eco hover:shadow-lg"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cream text-charcoal transition-colors group-hover:bg-green-eco group-hover:text-white">
                <CategoryIcon path={cat.iconPath} />
              </div>
              <h3 className="font-display text-sm font-semibold uppercase tracking-[2px] text-charcoal">
                {cat.label}
              </h3>
              <p className="mt-2 text-sm text-gray">{cat.description}</p>
              <span className="mt-4 text-xs font-semibold uppercase tracking-[2px] text-green-eco">
                {cat.models.length === 1
                  ? "Se reservedele"
                  : `${cat.models.length} modeller`}
                <span className="ml-1" aria-hidden="true">
                  &rarr;
                </span>
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
