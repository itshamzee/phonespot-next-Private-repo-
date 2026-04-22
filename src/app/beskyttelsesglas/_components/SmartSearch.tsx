"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { TILBEHOER_DEVICES, SPOT_HUB_TILES } from "@/lib/tilbehoer-config";

function brandKeyFor(deviceSlug: string, deviceBrand: string): string {
  // ipad-* → ipad tile; iphone-* → iphone tile; otherwise brand's tile
  const withPrefix = SPOT_HUB_TILES.find(t =>
    t.brand === deviceBrand && t.modelPrefix && deviceSlug.startsWith(t.modelPrefix)
  );
  if (withPrefix) return withPrefix.id;
  const plain = SPOT_HUB_TILES.find(t => t.brand === deviceBrand && !t.modelPrefix);
  return plain?.id ?? deviceBrand;
}

export function SmartSearch({ models }: { models: string[] }) {
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    if (q.trim().length < 2) return [];
    const term = q.toLowerCase();
    return TILBEHOER_DEVICES
      .filter(d => models.includes(d.slug))
      .filter(d => d.label.toLowerCase().includes(term) || d.slug.includes(term))
      .slice(0, 8);
  }, [q, models]);

  return (
    <div className="relative mx-auto max-w-md">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Hvilken telefon har du?"
        className="w-full rounded-full px-6 py-4 text-black placeholder-gray-500 shadow-xl"
        aria-label="Søg telefonmodel"
      />
      {matches.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-2 bg-white text-black rounded-2xl shadow-2xl overflow-hidden">
          {matches.map(m => (
            <li key={m.slug}>
              <Link href={`/beskyttelsesglas/${brandKeyFor(m.slug, m.brand)}/${m.slug}`} className="block px-6 py-3 hover:bg-gray-100">
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
