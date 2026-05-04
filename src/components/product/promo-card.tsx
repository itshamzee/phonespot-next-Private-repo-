import Link from "next/link";

/**
 * Grid-tile-sized promo that slots into the product grid alongside
 * ProductGridCard. Used for cross-sells like "Husk skærmbeskyttelse"
 * inside /iphones, /ipads, etc.
 *
 * Variants:
 *  - screen-protector: warm yellow upsell, "remember a screen protector"
 *  - weekly-deal:      red urgency, "save 10% this week"
 *  - trust:            dark-green editorial, the PhoneSpot quality promise
 */

type PromoVariant = "screen-protector" | "weekly-deal" | "trust";

interface PromoCardProps {
  variant: PromoVariant;
  href: string;
}

interface VariantConfig {
  badge: string;
  badgeClass: string;
  bg: string;
  border: string;
  theme: "light" | "dark";
  title: string;
  body: string;
  cta: string;
  ctaClass: string;
  icon: React.ReactNode;
}

// ── Trust icon: stacked editorial stats ───────────────────────────────────
//
// Two big display numbers separated by a hairline rule. The "+" on 30 is
// scaled down so the digits read as a single typographic unit. Cream on
// dark-green keeps the contrast premium without shouting.
function TrustStats() {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-3">
      <div className="text-center">
        <div className="font-display text-[44px] sm:text-6xl font-bold leading-[0.85] tracking-tight text-[#F5F2EC]">
          36
        </div>
        <div className="mt-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F5F2EC]/70">
          Mdr. garanti
        </div>
      </div>
      <div className="h-px w-8 sm:w-10 bg-[#F5F2EC]/30" aria-hidden="true" />
      <div className="text-center">
        <div className="font-display text-[44px] sm:text-6xl font-bold leading-[0.85] tracking-tight text-[#F5F2EC]">
          30
          <span className="text-2xl sm:text-4xl align-top">+</span>
        </div>
        <div className="mt-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F5F2EC]/70">
          Tests pr. enhed
        </div>
      </div>
    </div>
  );
}

const VARIANTS: Record<PromoVariant, VariantConfig> = {
  "screen-protector": {
    badge: "Husk",
    badgeClass: "bg-[#1A3D2E] text-white",
    bg: "bg-[#FFF8E6]",
    border: "border-[#F1C84B]",
    theme: "light",
    title: "Skærmbeskyttelse fra 159 kr.",
    body: "Beskyt din nye iPhone med et 9H tempered glass eller privacy-filter. Gratis montering i butik.",
    cta: "Se beskyttelsesglas",
    ctaClass: "bg-[#1A3D2E] hover:bg-[#14301F] text-white",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-10 w-10 text-[#C19A2C]"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  "weekly-deal": {
    badge: "Ugens tilbud",
    badgeClass: "bg-[#BF0013] text-white",
    bg: "bg-[#FEF2F2]",
    border: "border-[#FCA5A5]",
    theme: "light",
    title: "Spar 10% på cover + glas",
    body: "Køb cover og skærmbeskyttelse sammen og få 10% rabat — gælder hele ugen.",
    cta: "Se tilbud",
    ctaClass: "bg-[#BF0013] hover:bg-[#A0000F] text-white",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-10 w-10 text-[#BF0013]"
        aria-hidden="true"
      >
        <path d="M20.59 13.41 12 22l-9-9V3h10l7.59 7.59a2 2 0 0 1 0 2.82Z" />
        <circle cx="7.5" cy="7.5" r="1.5" />
      </svg>
    ),
  },
  trust: {
    badge: "Kvalitetsgaranti",
    badgeClass:
      "border border-[#F5F2EC]/30 bg-[#F5F2EC]/10 text-[#F5F2EC] backdrop-blur-sm",
    bg: "bg-[#1A3D2E]",
    border: "border-[#143025]",
    theme: "dark",
    title: "Vi tester hver iPhone individuelt",
    body: "Renoveret af vores certificerede teknikere før den sendes — alt fra batteri til knapper og kamera bliver kontrolleret.",
    cta: "Vores kvalitet",
    ctaClass: "bg-[#F5F2EC] hover:bg-white text-[#1A3D2E]",
    icon: <TrustStats />,
  },
};

export function PromoCard({ variant, href }: PromoCardProps) {
  const v = VARIANTS[variant];
  const isDark = v.theme === "dark";

  return (
    <Link
      href={href}
      className={`group relative flex flex-row sm:flex-col overflow-hidden rounded-2xl border-2 ${v.border} ${v.bg} transition-all hover:shadow-xl active:scale-[0.99]`}
    >
      {/* Subtle radial-gradient overlay for the trust variant — adds depth
          without reading as a "designy" effect. Skipped on light variants. */}
      {isDark && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,242,236,0.08),transparent_60%)]"
        />
      )}

      {/* Icon area — same proportion as product image area for visual rhythm */}
      <div className="relative aspect-square w-36 shrink-0 sm:w-auto flex flex-col items-center justify-center gap-3 p-4 sm:p-6">
        <span
          className={`absolute top-3 left-3 inline-flex items-center rounded-full ${v.badgeClass} px-2.5 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide`}
        >
          {v.badge}
        </span>
        {v.icon}
      </div>

      <div className="relative flex flex-1 flex-col p-3.5 sm:p-4">
        <h3
          className={`line-clamp-2 text-sm sm:text-base font-semibold ${
            isDark ? "text-[#F5F2EC]" : "text-[#111111]"
          }`}
        >
          {v.title}
        </h3>
        <p
          className={`mt-2 text-xs sm:text-sm line-clamp-3 ${
            isDark ? "text-[#F5F2EC]/75" : "text-[#6E6E73]"
          }`}
        >
          {v.body}
        </p>
        <div className="mt-auto pt-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full ${v.ctaClass} px-4 py-2 text-sm sm:px-3.5 sm:py-1.5 sm:text-xs font-semibold transition-colors`}
          >
            {v.cta}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
