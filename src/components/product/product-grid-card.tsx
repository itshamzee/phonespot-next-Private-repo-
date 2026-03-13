import Image from "next/image";
import Link from "next/link";

type ProductGridCardProps = {
  slug: string;
  image?: string;
  title: string;
  minPrice: number | null;
  deviceCount: number;
  brand: string;
  category: string;
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
  deviceCount,
  brand,
  category,
}: ProductGridCardProps) {
  return (
    <Link
      href={`/refurbished/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-sand bg-white transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-cream">
        {deviceCount > 0 && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center rounded-full bg-green-eco px-2.5 py-1 text-xs font-semibold text-white">
              {deviceCount} på lager
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
        <p className="text-xs font-medium uppercase tracking-wide text-gray">
          {brand} · {category}
        </p>
        <h3 className="mt-1 line-clamp-2 font-semibold text-charcoal">
          {title}
        </h3>
        <div className="mt-auto pt-3">
          {minPrice != null ? (
            <p className="text-sm font-bold text-charcoal">
              fra{" "}
              <span className="text-base text-green-eco">
                {formatFromPrice(minPrice)} kr.
              </span>
            </p>
          ) : (
            <p className="text-sm font-medium text-gray">Ikke på lager</p>
          )}
        </div>
      </div>
    </Link>
  );
}
