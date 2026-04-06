import Link from "next/link";
import Image from "next/image";

interface QualityAlternative {
  id: string;
  title: string;
  slug: string | null;
  selling_price: number;
  sale_price: number | null;
  images: string[];
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
  if (alternatives.length <= 1) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[#86868B]">Andre varianter</p>
      <div className="flex flex-wrap gap-2">
        {alternatives.map((alt) => {
          const isCurrent = alt.id === currentProductId;
          const price = alt.sale_price ?? alt.selling_price;
          const href = alt.slug
            ? `/reservedele/${categorySlug}/${brandSlug}/${modelSlug}/${alt.slug}`
            : "#";
          const qualityName = alt.quality_tier?.name ?? "Standard";
          const thumbnail = alt.images?.[0];

          if (isCurrent) {
            return (
              <div
                key={alt.id}
                className="flex items-center gap-2.5 rounded-xl border-2 border-[#1A3D2E] bg-[#1A3D2E]/5 px-3 py-2"
              >
                {/* Thumbnail */}
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#F7F7F8]">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={qualityName}
                      fill
                      sizes="48px"
                      className="object-contain p-0.5"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1}
                        stroke="currentColor"
                        className="h-5 w-5 text-[#E5E5EA]"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#1A3D2E]">{qualityName}</p>
                  {showPrices && (
                    <p className="text-xs font-bold text-[#111111]">
                      {(price / 100).toLocaleString("da-DK")} kr
                    </p>
                  )}
                </div>
              </div>
            );
          }

          return (
            <Link
              key={alt.id}
              href={href}
              className="flex items-center gap-2.5 rounded-xl border border-[#E5E5EA] bg-white px-3 py-2 transition-all hover:border-[#1A3D2E]/40 hover:shadow-sm"
            >
              {/* Thumbnail */}
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#F7F7F8]">
                {thumbnail ? (
                  <Image
                    src={thumbnail}
                    alt={qualityName}
                    fill
                    sizes="48px"
                    className="object-contain p-0.5"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1}
                      stroke="currentColor"
                      className="h-5 w-5 text-[#E5E5EA]"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#111111]">{qualityName}</p>
                {showPrices ? (
                  <p className="text-xs font-bold text-[#111111]">
                    {(price / 100).toLocaleString("da-DK")} kr
                  </p>
                ) : (
                  <p className="text-xs text-[#1A3D2E]">Log ind</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
