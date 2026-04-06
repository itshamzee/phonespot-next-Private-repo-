import Link from "next/link";
import { QualityBadge } from "./quality-badge";

interface QualityAlternative {
  id: string;
  title: string;
  slug: string | null;
  selling_price: number;
  sale_price: number | null;
  is_inquiry_only: boolean;
  quality_tier?: {
    name: string;
    slug: string;
    badge_color: string;
    badge_text_color: string;
    short_description: string | null;
    default_warranty_months: number;
  };
}

interface QualityAlternativesProps {
  alternatives: QualityAlternative[];
  currentProductId: string;
  categorySlug: string;
  brandSlug: string;
  modelSlug: string;
  showPrices?: boolean;
}

export function QualityAlternatives({
  alternatives,
  currentProductId,
  categorySlug,
  brandSlug,
  modelSlug,
  showPrices = true,
}: QualityAlternativesProps) {
  if (alternatives.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="font-display text-lg font-bold text-[#111111]">
        Andre kvalitetsmuligheder
      </h2>
      <div className="mt-4 space-y-3">
        {alternatives.map((alt) => {
          const isCurrent = alt.id === currentProductId;
          const price = alt.sale_price ?? alt.selling_price;
          const href = alt.slug
            ? `/reservedele/${categorySlug}/${brandSlug}/${modelSlug}/${alt.slug}`
            : "#";

          return (
            <div
              key={alt.id}
              className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                isCurrent
                  ? "border-[#1A3D2E] bg-[#1A3D2E]/5"
                  : "border-[#E5E5EA] bg-white hover:border-[#86868B]"
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {alt.quality_tier && (
                    <QualityBadge
                      name={alt.quality_tier.name}
                      badgeColor={alt.quality_tier.badge_color}
                      badgeTextColor={alt.quality_tier.badge_text_color}
                      size="sm"
                    />
                  )}
                  {isCurrent && (
                    <span className="text-xs font-medium text-[#1A3D2E]">Valgt</span>
                  )}
                </div>
                {alt.quality_tier?.short_description && (
                  <p className="text-xs text-[#86868B]">
                    {alt.quality_tier.short_description}
                  </p>
                )}
                <p className="text-xs text-[#86868B]">
                  {alt.quality_tier?.default_warranty_months} mdr garanti
                </p>
              </div>

              <div className="flex items-center gap-3">
                {showPrices ? (
                  <span className="text-lg font-bold text-[#111111]">
                    {(price / 100).toLocaleString("da-DK")} kr
                  </span>
                ) : (
                  <Link
                    href="/b2b/login"
                    className="text-sm font-semibold text-[#1A3D2E] hover:underline"
                  >
                    Log ind for pris
                  </Link>
                )}
                {!isCurrent && !alt.is_inquiry_only && (
                  <Link
                    href={href}
                    className="rounded-full bg-[#1A3D2E] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Vælg
                  </Link>
                )}
                {!isCurrent && alt.is_inquiry_only && (
                  <Link
                    href="/kontakt"
                    className="rounded-full border border-[#E5E5EA] px-4 py-2 text-xs font-semibold text-[#111111] transition-colors hover:bg-[#F7F7F8]"
                  >
                    Forespørg
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
