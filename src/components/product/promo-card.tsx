import Link from "next/link";

/**
 * Grid-tile-sized promo that slots into the product grid alongside
 * ProductGridCard. Used for cross-sells like "Husk skærmbeskyttelse"
 * inside /iphones, /ipads, etc.
 */

type PromoVariant = "screen-protector" | "weekly-deal";

interface PromoCardProps {
  variant: PromoVariant;
  href: string;
}

const VARIANTS: Record<PromoVariant, {
  badge: string;
  badgeBg: string;
  bg: string;
  border: string;
  title: string;
  body: string;
  cta: string;
  ctaBg: string;
  icon: React.ReactNode;
}> = {
  "screen-protector": {
    badge: "Husk",
    badgeBg: "bg-[#1A3D2E] text-white",
    bg: "bg-[#FFF8E6]",
    border: "border-[#F1C84B]",
    title: "Skærmbeskyttelse fra 159 kr.",
    body: "Beskyt din nye iPhone med et 9H tempered glass eller privacy-filter. Gratis montering i butik.",
    cta: "Se beskyttelsesglas",
    ctaBg: "bg-[#1A3D2E] hover:bg-[#14301F]",
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
    badgeBg: "bg-[#BF0013] text-white",
    bg: "bg-[#FEF2F2]",
    border: "border-[#FCA5A5]",
    title: "Spar 10% på cover + glas",
    body: "Køb cover og skærmbeskyttelse sammen og få 10% rabat — gælder hele ugen.",
    cta: "Se tilbud",
    ctaBg: "bg-[#BF0013] hover:bg-[#A0000F]",
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
};

export function PromoCard({ variant, href }: PromoCardProps) {
  const v = VARIANTS[variant];

  return (
    <Link
      href={href}
      className={`group flex flex-row sm:flex-col overflow-hidden rounded-2xl border-2 ${v.border} ${v.bg} transition-all hover:shadow-lg active:scale-[0.99]`}
    >
      {/* Icon area — same proportion as product image area for visual rhythm */}
      <div className="relative aspect-square w-40 shrink-0 sm:w-auto flex flex-col items-center justify-center gap-3 p-6">
        <span
          className={`absolute top-3 left-3 inline-flex items-center rounded-full ${v.badgeBg} px-2.5 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide`}
        >
          {v.badge}
        </span>
        {v.icon}
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <h3 className="line-clamp-2 text-sm sm:text-base font-semibold text-[#111111]">
          {v.title}
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-[#6E6E73] line-clamp-3">
          {v.body}
        </p>
        <div className="mt-auto pt-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full ${v.ctaBg} px-3.5 py-1.5 text-xs font-semibold text-white transition-colors`}
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
