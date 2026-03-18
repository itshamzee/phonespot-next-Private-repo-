import Image from "next/image";
import Link from "next/link";

type ProductGridCardProps = {
  slug: string;
  image?: string;
  title: string;
  minPrice: number | null;
  compareAtPrice?: number | null;
  deviceCount: number;
  brand: string;
  category: string;
  locations?: { name: string; type: string; count: number }[];
};

function formatFromPrice(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(oere / 100);
}

export function ProductGridCard({
  slug,
  image,
  title,
  minPrice,
  compareAtPrice,
  deviceCount,
  brand,
  category,
  locations,
}: ProductGridCardProps) {
  const storeLocations = locations?.filter((l) => l.type === "store") ?? [];
  return (
    <Link
      href={`/refurbished/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-sand bg-white transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-cream">
        {deviceCount > 3 && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center rounded-full bg-green-eco px-2.5 py-1 text-xs font-semibold text-white">
              {deviceCount} på lager
            </span>
          </div>
        )}
        {deviceCount > 0 && deviceCount <= 3 && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white">
              Kun {deviceCount} tilbage
            </span>
          </div>
        )}
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            className="object-contain p-6 transition-transform group-hover:scale-105"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              viewBox="0 0 64 64"
              className="h-16 w-16 text-sand"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="16" y="8" width="32" height="48" rx="4" />
              <circle cx="32" cy="52" r="2" />
              <line x1="26" y1="14" x2="38" y2="14" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-sm font-medium uppercase tracking-wide text-gray">
          {brand} · {category}
        </p>
        <h3 className="mt-1 line-clamp-2 font-semibold text-charcoal">
          {title}
        </h3>
        <div className="mt-auto pt-3">
          {minPrice != null ? (
            <div>
              {compareAtPrice != null && compareAtPrice > minPrice && (
                <p className="text-xs text-gray line-through">
                  Nypris: {formatFromPrice(compareAtPrice)} kr.
                </p>
              )}
              <p className="text-sm font-bold text-charcoal">
                fra{" "}
                <span className="text-lg text-green-eco">
                  {formatFromPrice(minPrice)} kr.
                </span>
              </p>
              {compareAtPrice != null && compareAtPrice > minPrice && (
                <p className="mt-0.5 text-xs font-semibold text-green-eco">
                  Spar op til {Math.round((1 - minPrice / compareAtPrice) * 100)}%
                </p>
              )}
              {/* Location availability */}
              {storeLocations.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {storeLocations.map((loc) => (
                    <span
                      key={loc.name}
                      className="inline-flex items-center gap-1 rounded-full bg-green-eco/10 px-2 py-0.5 text-[10px] font-semibold text-green-700"
                    >
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      Hentes i {loc.name}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h-.375a3 3 0 013-3V7.5h9.75" />
                    </svg>
                    Kan sendes
                  </span>
                </div>
              )}
              {deviceCount > 0 && storeLocations.length === 0 && (
                <p className="mt-1 text-[10px] font-semibold text-stone-400">
                  Kan sendes
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm font-medium text-gray">Ikke på lager</p>
          )}
        </div>
      </div>
    </Link>
  );
}
