import Link from "next/link";
import { SPOT_HUB_TILES, TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";

type BrandMeta = { accent: string; wordmark: string };

const BRAND_META: Record<string, BrandMeta> = {
  iphone:  { accent: "#1A3D2E", wordmark: "iPhone" },
  ipad:    { accent: "#1A3D2E", wordmark: "iPad" },
  samsung: { accent: "#1428A0", wordmark: "Galaxy" },
  pixel:   { accent: "#C8762A", wordmark: "Pixel" },
  xiaomi:  { accent: "#FF6900", wordmark: "Xiaomi" },
  oneplus: { accent: "#C01C2E", wordmark: "OnePlus" },
};

function countFor(tile: typeof SPOT_HUB_TILES[number]): number {
  return TILBEHOER_DEVICES.filter((d) => {
    if (tile.modelPrefix) return d.brand === tile.brand && d.slug.startsWith(tile.modelPrefix);
    return d.brand === tile.brand;
  }).length;
}

export function BrandGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {SPOT_HUB_TILES.map((tile) => {
        const meta = BRAND_META[tile.id] ?? { accent: "#1A3D2E", wordmark: tile.label };
        const count = countFor(tile);

        return (
          <Link
            key={tile.id}
            href={`/beskyttelsesglas/${tile.id}`}
            className="group relative block min-h-[140px] overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-black/[0.12] hover:shadow-[0_20px_40px_-20px_rgba(26,61,46,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3D2E] focus-visible:ring-offset-2 md:min-h-[180px] md:p-8"
          >
            {/* Soft radial accent — appears on hover */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.18]"
              style={{ backgroundColor: meta.accent }}
            />

            {/* Content */}
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/40">
                  {count} {count === 1 ? "model" : "modeller"}
                </p>
                <h3 className="mt-2.5 font-display text-2xl font-semibold leading-none text-[#1A3D2E] md:text-[28px]">
                  {tile.label}
                </h3>
              </div>

              <div className="flex items-center gap-2 text-sm font-semibold text-black/55 transition-colors group-hover:text-[#1A3D2E]">
                <span>Se beskyttelsesglas</span>
                <svg
                  aria-hidden
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Brand accent bar at bottom — reveals on hover */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
              style={{ backgroundColor: meta.accent }}
            />
          </Link>
        );
      })}
    </div>
  );
}
