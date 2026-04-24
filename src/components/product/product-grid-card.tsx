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
  showCategoryBadge?: boolean;
  specifications?: Record<string, string>;
};

function formatFromPrice(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(oere / 100);
}

function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    iphone: "iPhone",
    smartphone: "Smartphone",
    laptop: "Laptop",
    macbook: "MacBook",
    ipad: "iPad",
    tablet: "Tablet",
    smartwatch: "Smartwatch",
    watch: "Watch",
    airpods: "AirPods",
    headphones: "Headphones",
  };
  return map[category.toLowerCase()] ?? category;
}

function DevicePlaceholderIcon({ category }: { category: string }) {
  const cat = category.toLowerCase();

  // Laptop / MacBook
  if (cat === "laptop" || cat === "macbook") {
    return (
      <svg
        viewBox="0 0 64 64"
        className="h-16 w-16 text-[#C7C7CC]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Screen */}
        <rect x="10" y="10" width="44" height="30" rx="3" />
        {/* Hinge base */}
        <path d="M4 42h56l-3 5H7L4 42z" />
        {/* Notch */}
        <rect x="28" y="38" width="8" height="4" rx="1" />
      </svg>
    );
  }

  // iPad / Tablet
  if (cat === "ipad" || cat === "tablet") {
    return (
      <svg
        viewBox="0 0 64 64"
        className="h-16 w-16 text-[#C7C7CC]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="14" y="6" width="36" height="52" rx="4" />
        <circle cx="32" cy="54" r="2" />
        <line x1="26" y1="11" x2="38" y2="11" />
      </svg>
    );
  }

  // Smartwatch / Watch
  if (cat === "smartwatch" || cat === "watch") {
    return (
      <svg
        viewBox="0 0 64 64"
        className="h-16 w-16 text-[#C7C7CC]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Strap top */}
        <path d="M24 6h16v10H24z" rx="2" />
        {/* Watch body */}
        <rect x="16" y="16" width="32" height="32" rx="8" />
        {/* Strap bottom */}
        <path d="M24 48h16v10H24z" rx="2" />
        {/* Crown button */}
        <rect x="48" y="24" width="4" height="10" rx="2" />
        {/* Clock hands */}
        <line x1="32" y1="32" x2="32" y2="24" />
        <line x1="32" y1="32" x2="38" y2="36" />
      </svg>
    );
  }

  // AirPods / Headphones
  if (cat === "airpods" || cat === "headphones") {
    return (
      <svg
        viewBox="0 0 64 64"
        className="h-16 w-16 text-[#C7C7CC]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 32a20 20 0 0140 0" />
        <rect x="8" y="32" width="8" height="16" rx="4" />
        <rect x="48" y="32" width="8" height="16" rx="4" />
      </svg>
    );
  }

  // Default: phone (iphone / smartphone / fallback)
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-16 w-16 text-[#C7C7CC]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="16" y="6" width="32" height="52" rx="5" />
      {/* Front camera notch */}
      <rect x="26" y="10" width="12" height="3" rx="1.5" />
      {/* Home indicator */}
      <line x1="26" y1="54" x2="38" y2="54" strokeWidth="2" />
    </svg>
  );
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
  showCategoryBadge = false,
  specifications,
}: ProductGridCardProps) {
  const storeLocations = locations?.filter((l) => l.type === "store") ?? [];

  // Build compact spec line for laptops
  const isLaptop = category?.toLowerCase() === "laptop" || category?.toLowerCase() === "macbook";
  const specParts: string[] = [];
  if (isLaptop && specifications?.processor) {
    // Extract short processor name (e.g. "i5-1135G7" from "Intel Core i5-1135G7")
    const procMatch = specifications.processor.match(/([iI][3579]-\w+|Ryzen\s*\d\s*\w+|M[1234]\s*\w*)/);
    if (procMatch) specParts.push(procMatch[1].trim());
    if (specifications.ram) specParts.push(specifications.ram.replace(/\s+/g, ""));
    if (specifications.storage) specParts.push(specifications.storage.replace(/\s+/g, ""));
    if (specifications.screen_size) {
      const screen = specifications.screen_size.replace(/["\u201D\u2033]/g, "").replace(/\.0$/, "");
      specParts.push(screen + '"');
    }
  }

  return (
    <Link
      href={`/refurbished/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white transition-all hover:shadow-lg hover:border-[#1A3D2E]/20"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-[#F7F7F8] to-[#EFEFEF]">
        {/* Stock badge — top left */}
        {deviceCount > 3 && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center rounded-full bg-[#1A3D2E] px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-white shadow-sm">
              {deviceCount} på lager
            </span>
          </div>
        )}
        {deviceCount > 0 && deviceCount <= 3 && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center rounded-full bg-[#F7F7F8] px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-[#6E6E73] shadow-sm">
              Kun {deviceCount} tilbage
            </span>
          </div>
        )}

        {/* Category pill — bottom left, only when requested */}
        {showCategoryBadge && (
          <div className="absolute bottom-3 left-3 z-10">
            <span className="inline-flex items-center rounded-full bg-white/85 px-2.5 py-0.5 text-[11px] font-semibold text-[#1A3D2E] shadow-sm backdrop-blur-sm">
              {categoryLabel(category)}
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
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <DevicePlaceholderIcon category={category} />
            <span className="text-[11px] font-medium text-[#AEAEB2]">
              Billede kommer snart
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wide text-[#86868B]">
          {brand} · {categoryLabel(category)}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm sm:text-base font-semibold text-[#111111] group-hover:text-[#1A3D2E]">
          {title}
        </h3>
        {specParts.length > 0 && (
          <p className="mt-1 text-xs text-[#86868B] truncate line-clamp-1">
            {specParts.join(" \u00B7 ")}
          </p>
        )}
        <div className="mt-auto pt-3">
          {minPrice != null ? (
            <div>
              {compareAtPrice != null && compareAtPrice > minPrice && (
                <p className="text-xs text-[#86868B] line-through">
                  Nypris: {formatFromPrice(compareAtPrice)} kr.
                </p>
              )}
              <p className="text-xs font-semibold text-[#6E6E73]">
                fra
              </p>
              <p className="font-bold text-xl sm:text-2xl text-[#1A3D2E] leading-tight">
                {formatFromPrice(minPrice)} kr.
              </p>
              <p className="text-[11px] sm:text-xs text-[#6E6E73]">inkl. moms</p>
              {compareAtPrice != null && compareAtPrice > minPrice && (
                <p className="mt-0.5 text-xs font-semibold text-[#1A3D2E]">
                  Spar op til {Math.round((1 - minPrice / compareAtPrice) * 100)}%
                </p>
              )}
              {/* Shipping info */}
              {deviceCount > 0 && (
                <p className="mt-1 text-[11px] sm:text-xs font-semibold text-[#86868B]">
                  Kan sendes eller afhentes i butik
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm font-medium text-[#86868B]">Ikke på lager</p>
          )}
        </div>
      </div>
    </Link>
  );
}
