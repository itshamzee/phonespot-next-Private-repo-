"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type FinderModel = { slug: string; label: string; brand: string; brandLabel: string; count: number };

/** Undergruppe inden for et mærke: Apple har både iPhone og iPad. */
function kindOf(slug: string): string {
  if (slug.startsWith("ipad") || slug.includes("-tab-") || slug.includes("matepad")) return "Tablet";
  return "Telefon";
}

/**
 * Kompakt modelvælger til lagersalget: søg direkte efter modellen, eller vælg
 * mærke (og telefon/tablet) og derefter model. Viser kun modeller med covers.
 */
export function LagersalgFinder({ models, selected }: { models: FinderModel[]; selected: string | null }) {
  const router = useRouter();
  const selectedModel = models.find((m) => m.slug === selected) ?? null;
  const brands = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of models) if (!seen.has(m.brand)) seen.set(m.brand, m.brandLabel);
    return [...seen.entries()].map(([slug, label]) => ({ slug, label }));
  }, [models]);

  const [brand, setBrand] = useState<string>(selectedModel?.brand ?? brands[0]?.slug ?? "");
  const brandModels = models.filter((m) => m.brand === brand);
  const kinds = [...new Set(brandModels.map((m) => kindOf(m.slug)))];
  const [kind, setKind] = useState<string>(selectedModel ? kindOf(selectedModel.slug) : "Telefon");
  const activeKind = kinds.includes(kind) ? kind : kinds[0];
  // Den valgte model står først, så den er synlig i den swipebare række på mobil.
  const visible = brandModels
    .filter((m) => kindOf(m.slug) === activeKind)
    .sort((a, b) => Number(b.slug === selected) - Number(a.slug === selected));

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase().replace(/galaxy\s*/g, "");
  const matches = q
    ? models.filter((m) => m.label.toLowerCase().replace(/galaxy\s*/g, "").includes(q)).slice(0, 8)
    : [];

  function go(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/lagersalg/${slug}`);
  }

  return (
    <div className="min-w-0 rounded-2xl border border-sand bg-white p-4 md:p-5">
      <div className="relative">
        <label htmlFor="lagersalg-search" className="sr-only">Søg efter din model</label>
        <svg aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-charcoal/45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id="lagersalg-search"
          type="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls="lagersalg-suggestions"
          placeholder="Søg model, fx iPhone 13"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!matches.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(matches.length - 1, h + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(0, h - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(matches[highlight].slug);
            }
          }}
          className="h-12 w-full rounded-xl border border-sand bg-[#F7F7F8] pl-12 pr-4 text-[16px] text-charcoal placeholder:text-charcoal/45 focus:border-[#1A3D2E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/15"
        />
        {open && q && (
          <ul
            id="lagersalg-suggestions"
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-sand bg-white shadow-lg"
          >
            {matches.length ? (
              matches.map((m, i) => (
                <li key={m.slug} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(m.slug)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-[15px] ${i === highlight ? "bg-[#EAF2ED]" : ""}`}
                  >
                    <span className="font-medium text-charcoal">{m.label}</span>
                    <span className="text-sm text-charcoal/60">{m.count} {m.count === 1 ? "cover" : "covers"}</span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-[15px] text-charcoal/65">Ingen covers til “{query.trim()}” på lagersalg lige nu.</li>
            )}
          </ul>
        )}
      </div>

      {(brands.length > 1 || kinds.length > 1) && (
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist" aria-label="Mærke">
        {brands.length > 1 && brands.map((b) => (
          <button
            key={b.slug}
            type="button"
            role="tab"
            aria-selected={brand === b.slug}
            onClick={() => setBrand(b.slug)}
            className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-medium transition-colors ${
              brand === b.slug ? "border-[#1A3D2E] bg-[#1A3D2E] text-white" : "border-sand bg-white text-charcoal hover:border-charcoal/30"
            }`}
          >
            {b.label}
          </button>
        ))}
        {kinds.length > 1 && (
          <span className="ml-auto flex shrink-0 rounded-full bg-[#F7F7F8] p-1">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={activeKind === k}
                className={`h-9 rounded-full px-4 text-sm font-medium ${activeKind === k ? "bg-white text-charcoal shadow-sm" : "text-charcoal/60"}`}
              >
                {k === "Telefon" && brand === "apple" ? "iPhone" : k === "Tablet" && brand === "apple" ? "iPad" : k}
              </button>
            ))}
          </span>
        )}
      </div>
      )}

      {/* Mobil: én række, der swipes sidelæns. Større skærme: flere rækker. */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
        {selected && (
          <Link href="/lagersalg" className="flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-sm text-charcoal/65 underline underline-offset-4">
            Alle modeller
          </Link>
        )}
        {visible.map((m) => {
          const active = m.slug === selected;
          return (
            <Link
              key={m.slug}
              href={`/lagersalg/${m.slug}`}
              aria-current={active ? "page" : undefined}
              className={`flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-[14px] transition-colors ${
                active ? "border-[#1A3D2E] bg-[#EAF2ED] font-semibold text-[#1A3D2E]" : "border-sand bg-white text-charcoal hover:border-charcoal/30"
              }`}
            >
              {m.label}
              <span className={active ? "text-[#1A3D2E]/70" : "text-charcoal/45"}>{m.count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
