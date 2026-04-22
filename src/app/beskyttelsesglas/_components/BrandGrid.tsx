import Link from "next/link";
import { SPOT_HUB_TILES } from "@/lib/tilbehoer-config";

export function BrandGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {SPOT_HUB_TILES.map(tile => (
        <Link
          key={tile.id}
          href={`/beskyttelsesglas/${tile.id}`}
          className="group aspect-[4/3] rounded-2xl bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center border border-gray-200 transition-all hover:border-black hover:-translate-y-1"
        >
          <span className="text-2xl md:text-3xl font-medium">{tile.label}</span>
          <span className="text-sm text-gray-500 mt-2 group-hover:text-black">Se beskyttelsesglas →</span>
        </Link>
      ))}
    </div>
  );
}
