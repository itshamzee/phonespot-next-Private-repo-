import Image from "next/image";
import Link from "next/link";

/**
 * Compact, reusable teaser for the Storstrøm Forsikring partnership.
 * Used on the repair page, the warranty page and refurbished product pages
 * to point customers towards the dedicated /forsikring page.
 *
 * Insurance is added in-store (PhoneSpot Slagelse) for now, so the copy never
 * promises an online purchase flow.
 */

type Variant = "default" | "repair" | "warranty" | "product";

const COPY: Record<Variant, { eyebrow: string; title: string; body: string; cta: string }> = {
  default: {
    eyebrow: "I samarbejde med Storstrøm Forsikring",
    title: "Elektronikforsikring til din enhed",
    body: "Dæk din enhed mod uheld og funktionsfejl for en lav månedlig rate. Spørg om elektronikforsikring i PhoneSpot Slagelse.",
    cta: "Læs om elektronikforsikring",
  },
  repair: {
    eyebrow: "I samarbejde med Storstrøm Forsikring",
    title: "Forsikr din enhed i forbindelse med reparationen",
    body: "Når du reparerer hos os i Slagelse, kan du tilføje elektronikforsikring og være dækket mod fremtidige uheld — 1 kr. den første måned.",
    cta: "Se elektronikforsikring",
  },
  warranty: {
    eyebrow: "I samarbejde med Storstrøm Forsikring",
    title: "Vil du også være dækket mod uheld?",
    body: "Garantien dækker fejl og mangler. Elektronikforsikring dækker det garantien ikke gør — som fald, skærmskader og væskeskade.",
    cta: "Se elektronikforsikring",
  },
  product: {
    eyebrow: "I samarbejde med Storstrøm Forsikring",
    title: "Kan forsikres mod uheld",
    body: "Tilføj elektronikforsikring til din refurbished enhed for en lav månedlig rate — spørg i butikken i Slagelse.",
    cta: "Læs mere om elektronikforsikring",
  },
};

export function StorstromInsuranceTeaser({
  variant = "default",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const copy = COPY[variant];

  return (
    <div
      className={`flex flex-col gap-5 rounded-2xl border border-[#1A3D2E]/20 bg-[#1A3D2E]/5 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-7 ${className}`}
    >
      <div className="flex shrink-0 items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
        <Image
          src="/brand/partners/storstrom-icon-primary.svg"
          alt="Storstrøm Forsikring"
          width={56}
          height={56}
          className="h-12 w-12"
        />
      </div>

      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
          {copy.eyebrow}
        </p>
        <h3 className="mt-1 font-display text-lg font-bold tracking-tight text-[#111111]">
          {copy.title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[#86868B]">{copy.body}</p>
      </div>

      <Link
        href="/forsikring"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#1A3D2E] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {copy.cta}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </Link>
    </div>
  );
}
