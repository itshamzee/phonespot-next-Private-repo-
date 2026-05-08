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

  // ----- Spec extraction (laptops) -----
  // The DB stores spec keys with mixed casing and Danish labels
  // (e.g. "Processor", "RAM", "SSD", "Skærm"). Look them up
  // case-insensitively and accept a few aliases.
  const isLaptop =
    category?.toLowerCase() === "laptop" || category?.toLowerCase() === "macbook";

  function getSpec(...aliases: string[]): string | undefined {
    if (!specifications) return undefined;
    for (const [k, v] of Object.entries(specifications)) {
      const lk = k.toLowerCase();
      if (aliases.some((a) => a.toLowerCase() === lk) && v) return v;
    }
    return undefined;
  }

  function shortProcessor(full: string): string {
    // Customer-facing short label. Try modern names first, then fall back
    // to legacy patterns, then to the original string capped to 28 chars.
    const patterns: { re: RegExp; format: (m: RegExpMatchArray) => string }[] = [
      { re: /Snapdragon\s+X\s+(Elite|Plus|\w+)/i, format: (m) => `Snapdragon X ${m[1]}` },
      { re: /Core\s+Ultra\s+([579])\s+\d{3}\w?/i, format: (m) => `Core Ultra ${m[1]} ${m[0].split(/\s+/).slice(-1)[0]}` },
      { re: /Core\s+Ultra\s+([579])(?:\s*\([^)]+\))?/i, format: (m) => `Core Ultra ${m[1]}` },
      { re: /\b(?:Intel\s+)?Core\s+([iI][3579]-\w+)\b/i, format: (m) => m[1] },
      { re: /\b([iI][3579]-\w+)\b/, format: (m) => m[1] },
      { re: /\bRyzen\s*([3579]\s+\w+)\b/i, format: (m) => `Ryzen ${m[1]}` },
      { re: /\bRyzen\s*([3579])\b/i, format: (m) => `Ryzen ${m[1]}` },
      { re: /\bM([1234])(?:\s+(Pro|Max|Ultra))?\b/i, format: (m) => `M${m[1]}${m[2] ? " " + m[2] : ""}` },
    ];
    for (const { re, format } of patterns) {
      const m = full.match(re);
      if (m) return format(m);
    }
    return full.length <= 28 ? full : full.slice(0, 26) + "…";
  }

  const cpuFull = getSpec("processor", "cpu");
  const ramVal = getSpec("ram", "memory", "hukommelse");
  const ssdVal = getSpec("ssd", "storage", "lager", "lagerplads");
  const screenVal = getSpec("skærm", "screen", "display", "screen_size");

  const specParts: string[] = [];
  if (isLaptop) {
    if (cpuFull) specParts.push(shortProcessor(cpuFull));
    if (ramVal) specParts.push(ramVal.replace(/\s+/g, ""));
    if (ssdVal) specParts.push(ssdVal.replace(/\s+/g, ""));
    if (screenVal) {
      const cleaned = screenVal.replace(/["”″]/g, "").replace(/\.0\b/, "").trim();
      // If the value is just a number, append a quote mark
      specParts.push(/^\d/.test(cleaned) && !cleaned.includes('"') ? cleaned + '"' : cleaned);
    }
  }

  return (
    <Link
      href={`/refurbished/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white transition-all hover:shadow-lg hover:border-[#1A3D2E]/20 active:scale-[0.99]"
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-[#F7F7F8] to-[#EFEFEF]">
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
          <p className="mt-1.5 text-[13px] sm:text-sm font-semibold text-[#111111] line-clamp-2 leading-snug">
            {specParts.join(" · ")}
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
              {/* CTA pill — visual affordance that the whole card is tappable.
                  Sized larger on mobile so the touch target is comfortable. */}
              <div
                aria-hidden="true"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#1A3D2E] px-4 py-2 text-sm sm:px-3.5 sm:py-1.5 sm:text-xs font-semibold text-white transition-colors group-hover:bg-[#14301F]"
              >
                Se priser
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                >
                  <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium text-[#86868B]">Ikke på lager</p>
          )}
        </div>
      </div>
    </Link>
  );
}
