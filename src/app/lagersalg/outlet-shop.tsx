"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_FILTERS,
  SORT_LABELS,
  KIND_LABELS,
  activeFilterCount,
  applyOutletFilters,
  facetOptions,
  normalizeSearch,
  scopeToModel,
  selectModels,
  type FacetOption,
  type OutletFilters,
  type OutletItem,
  type OutletKind,
  type OutletSort,
} from "./outlet-filter";
import { OutletCard } from "./outlet-card";
import { ColorDot } from "./color-dot";
import { StorefrontIcon } from "@/components/ui/storefront-icon";
import collection from "@/components/product/device-collection.module.css";

const PAGE_SIZE = 24;
const MODEL_PREVIEW = 8;

type ListKey = "kinds" | "sizes" | "brands" | "models" | "types" | "colors";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Lagersalget i browseren: hele udvalget sendes med siden, så søgning, filtre
 * og sortering svarer med det samme. Filtrene ligger ikke i URL'en (ingen
 * tynde filtersider i Google); kun én valgt model afspejles i stien, fordi
 * /lagersalg/[model] er en rigtig side.
 */
export function OutletShop({ items, initialModel }: { items: OutletItem[]; initialModel: string | null }) {
  const [filters, setFilters] = useState<OutletFilters>({ ...EMPTY_FILTERS, models: initialModel ? [initialModel] : [] });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const [shown, setShown] = useState(PAGE_SIZE);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Én valgt model begrænser til covers (scopeToModel); filters er brugerens egne valg.
  const effective = useMemo(() => scopeToModel(filters), [filters]);
  const results = useMemo(() => applyOutletFilters(items, effective), [items, effective]);
  const facets = useMemo(() => facetOptions(items, effective), [items, effective]);
  const activeCount = activeFilterCount(filters);
  const allModels = useMemo(() => facetOptions(items, EMPTY_FILTERS).models, [items]);
  const singleModel = filters.models.length === 1 ? allModels.find((m) => m.value === filters.models[0]) ?? null : null;
  const allKinds = useMemo(() => facetOptions(items, EMPTY_FILTERS).kinds, [items]);
  const kind = filters.kinds.length === 1 ? (filters.kinds[0] as OutletKind) : null;
  // Modelrækken viser kun modeller i den valgte varetype; tasker vælges på bærbar-størrelse i stedet.
  const kindModels = useMemo(() => (kind ? facetOptions(items, { ...EMPTY_FILTERS, kinds: [kind] }).models : allModels), [items, kind, allModels]);
  const bagSizes = useMemo(() => facetOptions(items, { ...EMPTY_FILTERS, kinds: ["bag"] }).sizes, [items]);
  // Modeller hører til covers: tasker vælges på størrelse, "Andet" har ingen modelrække.
  const showModelRow = kind !== "bag" && kind !== "other" && kindModels.length > 1;
  const secondRow = kind === "bag" ? bagSizes.length > 1 : showModelRow;

  function update(patch: Partial<OutletFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setShown(PAGE_SIZE);
  }
  const toggleIn = (key: ListKey, value: string) =>
    key === "models"
      ? update(selectModels(items, filters, toggle(filters.models, value)))
      : update({ [key]: toggle(filters[key], value) } as Partial<OutletFilters>);
  const togglePrice = (value: number) => update({ prices: toggle(filters.prices, value) });
  const reset = () => update({ ...EMPTY_FILTERS, sort: filters.sort });

  function pickKind(next: OutletKind | null) {
    if (next === "bag" || next === "other") {
      update({ kinds: [next], sizes: [], models: [], brands: [] });
      return;
    }
    const inKind = next ? facetOptions(items, { ...EMPTY_FILTERS, kinds: [next] }).models.map((m) => m.value) : null;
    update({
      kinds: next ? [next] : [],
      sizes: [],
      models: inKind ? filters.models.filter((m) => inKind.includes(m)) : filters.models,
    });
  }

  const pickSize = (size: string | null) => update({ sizes: size ? [size] : [] });

  function pickModel(slug: string | null) {
    update({ ...selectModels(items, filters, slug ? [slug] : []), query: "" });
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  // Den valgte model skal kunne ses i den vandrette chip-række, også på mobil.
  const chipRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = chipRowRef.current;
    const active = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (row && active) row.scrollLeft = Math.max(0, active.offsetLeft - row.offsetLeft - 16);
  }, [filters.models]);

  // Én valgt model = den rigtige modelside; ellers oversigten.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const path = filters.models.length === 1 ? `/lagersalg/${filters.models[0]}` : "/lagersalg";
    if (window.location.pathname !== path) window.history.replaceState(window.history.state, "", path);
  }, [filters.models]);

  const heroPool = singleModel ? results : items;
  const heroPhotos = heroPool.flatMap((i) => (i.imageUrl ? [i.imageUrl] : [])).slice(0, 3);
  const heroBrands = facetOptions(items, EMPTY_FILTERS).brands.map((b) => b.label);
  const minOre = (singleModel ? results : items).reduce((m, i) => Math.min(m, i.priceOre), Infinity);
  const minKr = Number.isFinite(minOre) ? minOre / 100 : null;

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...filters.kinds.map((v) => ({ key: `k-${v}`, label: KIND_LABELS[v as OutletKind] ?? v, remove: () => pickKind(null) })),
    ...filters.sizes.map((v) => ({ key: `s-${v}`, label: `Op til ${v}`, remove: () => toggleIn("sizes", v) })),
    ...filters.brands.map((v) => ({ key: `b-${v}`, label: facets.brands.find((o) => o.value === v)?.label ?? v, remove: () => toggleIn("brands", v) })),
    ...filters.models.map((v) => ({ key: `m-${v}`, label: allModels.find((o) => o.value === v)?.label ?? v, remove: () => toggleIn("models", v) })),
    ...filters.types.map((v) => ({ key: `t-${v}`, label: v, remove: () => toggleIn("types", v) })),
    ...filters.colors.map((v) => ({ key: `c-${v}`, label: v, remove: () => toggleIn("colors", v) })),
    ...filters.prices.map((v) => ({ key: `p-${v}`, label: `${v / 100} kr.`, remove: () => togglePrice(v) })),
    ...(filters.query ? [{ key: "q", label: `"${filters.query}"`, remove: () => update({ query: "" }) }] : []),
  ];

  // Overskriften følger varetypen: covers til en model, tasker, ellers varer.
  const noun = (n: number) =>
    singleModel || kind === "cover" || kind === "ipad"
      ? n === 1 ? "cover" : "covers"
      : kind === "bag"
        ? n === 1 ? "taske" : "tasker"
        : n === 1 ? "vare" : "varer";

  const panel = (
    <FilterPanel facets={facets} filters={filters} onToggle={toggleIn} onTogglePrice={togglePrice} />
  );

  return (
    <>
      <Hero
        models={allModels}
        singleModelLabel={singleModel?.label ?? null}
        minKr={minKr}
        total={singleModel ? results.length : items.length}
        totalNoun={singleModel ? (n) => (n === 1 ? "cover" : "covers") : (n) => (n === 1 ? "vare" : "varer")}
        photos={heroPhotos}
        brands={heroBrands}
        onPickModel={pickModel}
        onSearch={(query) => {
          update({ query });
          requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }}
      />

      {/* Varetype først: covers, iPad, tasker eller andet. */}
      {allKinds.length > 1 && (
        <nav aria-label="Vælg varetype" className={`bg-white ${secondRow ? "" : "border-b border-sand"}`}>
          <div className={`mx-auto flex max-w-[1320px] gap-2 overflow-x-auto px-4 pt-3 ${secondRow ? "" : "pb-3"} [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden`}>
            <ModelChip label="Alle" active={filters.kinds.length === 0} onClick={() => pickKind(null)} />
            {allKinds.map((k) => (
              <ModelChip key={k.value} label={k.label} count={k.count} active={kind === k.value} onClick={() => pickKind(k.value as OutletKind)} />
            ))}
          </div>
        </nav>
      )}

      {/* Tasker: vælg efter bærbarens størrelse i stedet for telefonmodel. */}
      {kind === "bag" && bagSizes.length > 1 && (
        <nav aria-label="Vælg størrelse" className="border-b border-sand bg-white">
          <div className="mx-auto flex max-w-[1320px] gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
            <ModelChip label="Alle størrelser" active={filters.sizes.length === 0} onClick={() => pickSize(null)} />
            {bagSizes.map((o) => (
              <ModelChip
                key={o.value}
                label={`Op til ${o.label}`}
                count={o.count}
                active={filters.sizes.length === 1 && filters.sizes[0] === o.value}
                onClick={() => pickSize(o.value)}
              />
            ))}
          </div>
        </nav>
      )}

      {/* Hurtigvalg af model: den vigtigste beslutning for covers, så den står før filtrene. */}
      {showModelRow && (
        <nav aria-label="Vælg model" className="border-b border-sand bg-white">
          <div ref={chipRowRef} className="mx-auto flex max-w-[1320px] gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
            <ModelChip label="Alle modeller" active={filters.models.length === 0} onClick={() => pickModel(null)} />
            {kindModels.map((m) => (
              <ModelChip
                key={m.value}
                label={m.label}
                count={m.count}
                active={filters.models.length === 1 && filters.models[0] === m.value}
                onClick={() => pickModel(m.value)}
              />
            ))}
          </div>
        </nav>
      )}

      {/* Mobil: fast bar med filter og sortering. */}
      <div className="sticky top-0 z-30 border-b border-sand bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1320px] items-center gap-2 px-4 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[5px] border border-charcoal/20 text-[14px] font-semibold text-charcoal"
          >
            <FilterIcon />
            Filtrer
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1A3D2E] px-1.5 text-[11px] text-white">{activeCount}</span>
            )}
          </button>
          <SortSelect value={filters.sort} onChange={(sort) => update({ sort })} className="flex-1" />
        </div>
      </div>

      <div ref={resultsRef} className="mx-auto max-w-[1320px] scroll-mt-16 px-4 pb-16 pt-5 sm:px-6 lg:scroll-mt-4 lg:pt-8">
        <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-10">
          <aside aria-label="Filtre" className="hidden lg:block">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pb-6 pr-2">
              <div className="flex items-baseline justify-between pb-2">
                <h2 className="text-[15px] font-semibold text-charcoal">Filtre</h2>
                {activeCount > 0 && (
                  <button type="button" onClick={reset} className="text-[13px] text-charcoal/65 underline underline-offset-4 hover:text-charcoal">
                    Nulstil
                  </button>
                )}
              </div>
              {panel}
            </div>
          </aside>

          <section aria-labelledby="outlet-results">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="outlet-results" className="text-[15px] font-semibold text-charcoal" aria-live="polite">
                {results.length} {noun(results.length)}
                {singleModel ? ` til ${singleModel.label}` : ""}
              </h2>
              <SortSelect value={filters.sort} onChange={(sort) => update({ sort })} className="hidden w-52 lg:block" />
            </div>

            {chips.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Aktive filtre">
                {chips.map((c) => (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={c.remove}
                      aria-label={`Fjern filter ${c.label}`}
                      className="flex h-9 items-center gap-1.5 rounded-full bg-[#EAF2ED] pl-3 pr-2.5 text-[13px] font-medium text-[#1A3D2E] hover:bg-[#dcebe2]"
                    >
                      {c.label}
                      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={reset} className="h-9 px-2 text-[13px] text-charcoal/65 underline underline-offset-4 hover:text-charcoal">
                    Ryd alle
                  </button>
                </li>
              </ul>
            )}

            {singleModel && (
              <p className="mt-3 rounded-[5px] bg-[#F7F7F8] px-3.5 py-2.5 text-[13px] leading-5 text-charcoal/75">
                Alle covers her er lavet til {singleModel.label}. Du kan se din model under Indstillinger på telefonen, hvis du er i tvivl.
              </p>
            )}

            {results.length > 0 ? (
              <>
                <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
                  {results.slice(0, shown).map((item, i) => (
                    <li key={item.id}>
                      <OutletCard item={item} eager={i < 4} />
                    </li>
                  ))}
                </ul>
                {results.length > shown && (
                  <div className="mt-10 flex flex-col items-center gap-3">
                    <p className="text-[13px] text-charcoal/60">
                      Viser {shown} af {results.length}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShown((n) => n + PAGE_SIZE)}
                      className="h-11 rounded-[5px] border border-charcoal/25 px-6 text-[14px] font-semibold text-charcoal hover:border-charcoal"
                    >
                      Vis flere
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-6 rounded-[12px] border border-dashed border-charcoal/20 px-6 py-12 text-center">
                <p className="text-[17px] font-semibold text-charcoal">Ingen varer matcher dit valg</p>
                <p className="mx-auto mt-2 max-w-sm text-[14px] text-charcoal/65">
                  Fjern et filter, eller se hele udvalget af covers uden for lagersalget.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={reset} className="h-11 rounded-[5px] bg-[#1A3D2E] px-5 text-[14px] font-semibold text-white hover:bg-[#244f3c]">
                    Nulstil filtre
                  </button>
                  <Link href="/tilbehoer/covers" className="flex h-11 items-center rounded-[5px] border border-charcoal/25 px-5 text-[14px] font-semibold text-charcoal">
                    Se alle covers
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onReset={reset}
        resultCount={results.length}
        activeCount={activeCount}
        sort={filters.sort}
        onSort={(sort) => update({ sort })}
      >
        {panel}
      </FilterDrawer>
    </>
  );
}

function Hero({
  models,
  singleModelLabel,
  minKr,
  total,
  totalNoun,
  photos,
  brands,
  onPickModel,
  onSearch,
}: {
  models: FacetOption[];
  singleModelLabel: string | null;
  minKr: number | null;
  total: number;
  totalNoun: (n: number) => string;
  photos: string[];
  brands: string[];
  onPickModel: (slug: string) => void;
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const q = normalizeSearch(query);
  const matches = q ? models.filter((m) => normalizeSearch(m.label).includes(q)).slice(0, 6) : [];
  const listOpen = open && q.length > 0;

  function choose(index: number) {
    const m = matches[index];
    setOpen(false);
    setQuery("");
    if (m) onPickModel(m.value);
    else if (query.trim()) onSearch(query.trim());
  }

  // Samme hero som kategorisiderne (Smartphones, iPhones): genbruger deres stylesheet.
  return (
    <div className={collection.collection} data-category="smartphone">
      <div className={collection.wrap}>
        <nav aria-label="Brødkrumme" className={collection.breadcrumb}>
          <Link href="/">Forside</Link>
          <span aria-hidden="true">/</span>
          <Link href="/tilbehoer">Tilbehør</Link>
          <span aria-hidden="true">/</span>
          {singleModelLabel ? <Link href="/lagersalg">Lagersalg</Link> : <span>Lagersalg</span>}
          {singleModelLabel && (
            <>
              <span aria-hidden="true">/</span>
              <span>{singleModelLabel}</span>
            </>
          )}
        </nav>
        <section className={collection.hero} aria-labelledby="outlet-title">
          <div className={collection.heroCopy}>
            <p className={collection.eyebrow}>Lagersalg · 3 for 2</p>
            <h1 id="outlet-title">{singleModelLabel ? `Covers til ${singleModelLabel}. 3 for 2.` : "3 for 2 på hele lagersalget."}</h1>
            <p className={collection.intro}>
              {singleModelLabel
                ? `Nye covers lavet til ${singleModelLabel}${minKr ? ` fra ${minKr} kr.` : ""}, direkte fra vores lager i Vejle. Læg tre i kurven, så er den billigste gratis.`
                : `Læg tre lagersalgsvarer i kurven, så er den billigste gratis. Det gælder på tværs af modeller. Covers, tasker, iPad-covers og andet tilbehør til outletpriser${minKr ? ` fra ${minKr} kr.` : ""}, direkte fra vores lager i Vejle.`}
            </p>
            <div className={collection.heroActions}>
              <form
                role="search"
                className="relative w-full max-w-[470px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  choose(matches.length ? highlight : -1);
                }}
              >
                <label htmlFor="outlet-search" className="sr-only">
                  Søg efter din telefonmodel
                </label>
                <svg aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#526358]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  id="outlet-search"
                  type="search"
                  autoComplete="off"
                  enterKeyHint="search"
                  role="combobox"
                  aria-expanded={listOpen}
                  aria-controls="outlet-suggestions"
                  aria-autocomplete="list"
                  aria-activedescendant={listOpen && matches[highlight] ? `outlet-opt-${matches[highlight].value}` : undefined}
                  placeholder="Søg efter din telefonmodel..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                    setHighlight(0);
                  }}
                  onFocus={() => setOpen(true)}
                  onBlur={() => setTimeout(() => setOpen(false), 120)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                    if (!matches.length) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlight((h) => Math.min(matches.length - 1, h + 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlight((h) => Math.max(0, h - 1));
                    }
                  }}
                  className="h-12 w-full rounded-[5px] border border-[#d1ded4] bg-white pl-10 pr-[76px] text-[16px] text-charcoal placeholder:text-[#7a857d] focus:border-[#1a3d2e] focus:outline-none focus:ring-2 focus:ring-[#1a3d2e]/15 md:text-[14px]"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 flex h-10 items-center rounded-[4px] bg-[#1a3d2e] px-4 text-[13px] font-semibold text-white hover:bg-[#2a503b]"
                >
                  Søg
                </button>
                {listOpen && (
                  <ul
                    id="outlet-suggestions"
                    role="listbox"
                    className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-[8px] border border-[#d1ded4] bg-white text-charcoal shadow-[0_16px_32px_-16px_rgba(26,61,46,0.35)]"
                  >
                    {matches.length ? (
                      matches.map((m, i) => (
                        <li
                          key={m.value}
                          id={`outlet-opt-${m.value}`}
                          role="option"
                          aria-selected={i === highlight}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => choose(i)}
                          onMouseEnter={() => setHighlight(i)}
                          className={`flex cursor-pointer items-center justify-between px-4 py-3 text-[14px] ${i === highlight ? "bg-[#f2f6f3]" : ""}`}
                        >
                          <span className="font-medium">{m.label}</span>
                          <span className="text-[12px] text-[#526358]">
                            {m.count} {m.count === 1 ? "cover" : "covers"}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-3 text-[13px] text-[#526358]">
                        Ingen covers til &quot;{query.trim()}&quot; på lagersalg lige nu.{" "}
                        <Link href="/tilbehoer/covers" className="font-semibold text-[#1a3d2e] underline underline-offset-4">
                          Se alle covers
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </form>
              <span>
                {total} {totalNoun(total)} i udvalget
              </span>
            </div>
          </div>
          <figure className={collection.heroVisual}>
            <div aria-hidden className="flex items-end justify-center md:-space-x-7">
              {photos.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  className={`h-[104px] w-[74px] rounded-[8px] border border-[#d1ded4] bg-white object-cover shadow-[0_14px_28px_-16px_rgba(26,61,46,0.5)] md:h-[220px] md:w-[156px] ${
                    i === 0 ? "md:-rotate-6 md:translate-y-3" : i === 2 ? "md:rotate-6 md:translate-y-3" : "md:relative md:z-10"
                  } ${i > 0 ? "hidden md:block" : ""}`}
                />
              ))}
            </div>
            {brands.length > 0 && <figcaption>Covers til {brands.join(" og ")}</figcaption>}
          </figure>
        </section>
        <div className={collection.assurance}>
          <Link href="/handelsbetingelser">
            <StorefrontIcon kind="check" />
            <span>
              Gratis levering <span>til pakkeshop</span>
            </span>
          </Link>
          <Link href="#lagersalg-terms-heading">
            <StorefrontIcon kind="check" />
            <span>
              3 for 2 <span>den billigste er gratis</span>
            </span>
          </Link>
          <Link href="/butik">
            <StorefrontIcon kind="pin" />
            <span>
              Hent i butik <span>i Vejle og Slagelse</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ModelChip({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] border px-3.5 text-[14px] transition-colors ${
        active ? "border-[#1A3D2E] bg-[#1A3D2E] font-semibold text-white" : "border-sand bg-white text-charcoal hover:border-charcoal/35"
      }`}
    >
      {label}
      {count != null && <span className={active ? "text-white/70" : "text-charcoal/45"}>{count}</span>}
    </button>
  );
}

function SortSelect({ value, onChange, className = "" }: { value: OutletSort; onChange: (v: OutletSort) => void; className?: string }) {
  return (
    <label className={`relative ${className}`}>
      <span className="sr-only">Sortér</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as OutletSort)}
        className="h-11 w-full appearance-none rounded-[5px] border border-charcoal/20 bg-white pl-3.5 pr-9 text-[14px] font-medium text-charcoal focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/15"
      >
        {(Object.keys(SORT_LABELS) as OutletSort[]).map((s) => (
          <option key={s} value={s}>
            {s === "relevance" ? "Sortér: Relevans" : SORT_LABELS[s]}
          </option>
        ))}
      </select>
      <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/60" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

function FilterPanel({
  facets,
  filters,
  onToggle,
  onTogglePrice,
}: {
  facets: ReturnType<typeof facetOptions>;
  filters: OutletFilters;
  onToggle: (key: ListKey, value: string) => void;
  onTogglePrice: (value: number) => void;
}) {
  const [allModels, setAllModels] = useState(false);
  const models = allModels ? facets.models : facets.models.slice(0, MODEL_PREVIEW);
  return (
    <div className="divide-y divide-sand">
      {facets.brands.length > 1 && (
        <Group title="Telefonmærke">
          {facets.brands.map((o) => (
            <Check key={o.value} option={o} checked={filters.brands.includes(o.value)} onChange={() => onToggle("brands", o.value)} />
          ))}
        </Group>
      )}
      {facets.models.length > 0 && (
        <Group title="Model">
          {models.map((o) => (
            <Check key={o.value} option={o} checked={filters.models.includes(o.value)} onChange={() => onToggle("models", o.value)} />
          ))}
          {facets.models.length > MODEL_PREVIEW && (
            <button type="button" onClick={() => setAllModels((v) => !v)} className="mt-1 h-9 text-[13px] font-medium text-[#1A3D2E] underline underline-offset-4">
              {allModels ? "Vis færre" : `Vis alle ${facets.models.length} modeller`}
            </button>
          )}
        </Group>
      )}
      {facets.types.length > 1 && (
        <Group title="Type">
          {facets.types.map((o) => (
            <Check key={o.value} option={o} checked={filters.types.includes(o.value)} onChange={() => onToggle("types", o.value)} />
          ))}
        </Group>
      )}
      {facets.colors.length > 0 && (
        <Group title="Farve">
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((o) => {
              const on = filters.colors.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && o.count === 0}
                  onClick={() => onToggle("colors", o.value)}
                  className={`flex h-9 items-center gap-2 rounded-full border pl-2.5 pr-3 text-[13px] disabled:opacity-40 ${
                    on ? "border-[#1A3D2E] bg-[#EAF2ED] font-semibold text-[#1A3D2E]" : "border-sand text-charcoal hover:border-charcoal/35"
                  }`}
                >
                  <ColorDot color={o.value} size={14} />
                  {o.label}
                  <span className="text-charcoal/45">{o.count}</span>
                </button>
              );
            })}
          </div>
        </Group>
      )}
      {facets.prices.length > 1 && (
        <Group title="Pris">
          <div className="flex flex-wrap gap-2">
            {facets.prices.map((o) => {
              const on = filters.prices.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && o.count === 0}
                  onClick={() => onTogglePrice(o.value)}
                  className={`h-9 rounded-full border px-3.5 text-[13px] disabled:opacity-40 ${
                    on ? "border-[#1A3D2E] bg-[#EAF2ED] font-semibold text-[#1A3D2E]" : "border-sand text-charcoal hover:border-charcoal/35"
                  }`}
                >
                  {o.label} <span className="text-charcoal/45">({o.count})</span>
                </button>
              );
            })}
          </div>
        </Group>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="py-4">
      <legend className="mb-1 text-[14px] font-semibold text-charcoal">{title}</legend>
      <div className="flex flex-col">{children}</div>
    </fieldset>
  );
}

function Check({ option, checked, onChange }: { option: FacetOption; checked: boolean; onChange: () => void }) {
  const disabled = !checked && option.count === 0;
  return (
    <label className={`flex min-h-10 cursor-pointer items-center gap-3 text-[14px] ${disabled ? "cursor-not-allowed opacity-40" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-[18px] w-[18px] shrink-0 rounded border-charcoal/30 accent-[#1A3D2E]"
      />
      <span className={`flex-1 ${checked ? "font-semibold text-charcoal" : "text-charcoal/85"}`}>{option.label}</span>
      <span className="text-[13px] text-charcoal/45">{option.count}</span>
    </label>
  );
}

function FilterDrawer({
  open,
  onClose,
  onReset,
  resultCount,
  activeCount,
  sort,
  onSort,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  resultCount: number;
  activeCount: number;
  sort: OutletSort;
  onSort: (s: OutletSort) => void;
  children: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button type="button" aria-label="Luk filtre" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="outlet-drawer-title"
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[16px] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-sand px-4 py-3">
          <h2 id="outlet-drawer-title" className="text-[17px] font-semibold text-charcoal">
            Filtrer og sortér
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Luk" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-[5px] text-charcoal">
            <svg aria-hidden viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4">
          <fieldset className="border-b border-sand py-4">
            <legend className="mb-1 text-[14px] font-semibold text-charcoal">Sortér</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SORT_LABELS) as OutletSort[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={sort === s}
                  onClick={() => onSort(s)}
                  className={`h-9 rounded-full border px-3.5 text-[13px] ${
                    sort === s ? "border-[#1A3D2E] bg-[#EAF2ED] font-semibold text-[#1A3D2E]" : "border-sand text-charcoal"
                  }`}
                >
                  {SORT_LABELS[s]}
                </button>
              ))}
            </div>
          </fieldset>
          {children}
        </div>
        <div className="flex gap-3 border-t border-sand px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={onReset}
            disabled={activeCount === 0}
            className="h-12 flex-1 rounded-[5px] border border-charcoal/25 text-[15px] font-semibold text-charcoal disabled:opacity-40"
          >
            Nulstil
          </button>
          <button type="button" onClick={onClose} className="h-12 flex-[2] rounded-[5px] bg-[#1A3D2E] text-[15px] font-semibold text-white">
            Vis {resultCount} {resultCount === 1 ? "produkt" : "produkter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M3 5h14M6 10h8M8.5 15h3" strokeLinecap="round" />
    </svg>
  );
}
