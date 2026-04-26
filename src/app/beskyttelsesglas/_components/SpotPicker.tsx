"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { useCart } from "@/components/cart/cart-context";
import type { SpotSku, SpotVariantKind } from "@/lib/spot/types";
import type { CartSkuItem } from "@/lib/cart/types";

// Popular models to surface as quick-picks when nothing is selected.
const QUICK_PICKS = [
  "iphone-17-pro-max",
  "iphone-17-pro",
  "iphone-16-pro-max",
  "iphone-16-pro",
  "iphone-15-pro",
  "samsung-s25-ultra",
];

function inferSpotKind(sku: SpotSku): SpotVariantKind {
  const label = (sku.variant_label ?? "").toLowerCase();
  const slug = sku.slug.toLowerCase();
  if (label === "privacy" || slug.includes("-privacy")) return "privacy";
  if (label === "lens" || slug.includes("-lens")) return "lens";
  if (label === "plateau" || slug.includes("-plateau")) return "plateau";
  return "glass";
}

function skuToCartItem(sku: SpotSku): CartSkuItem {
  const spotKind = inferSpotKind(sku);
  const effectivePrice = sku.sale_price ?? sku.selling_price;
  return {
    type: "sku_product",
    skuProductId: sku.id,
    title: sku.title,
    image: sku.images[0] ?? null,
    price: effectivePrice,
    ...(sku.sale_price != null ? { unitPrice: sku.selling_price } : {}),
    quantity: 1,
    variantLabel: sku.variant_label ?? undefined,
    spotKind,
  };
}

function labelFor(slug: string): string {
  return TILBEHOER_DEVICES.find((d) => d.slug === slug)?.label ?? slug;
}

export function SpotPicker({ skus }: { skus: SpotSku[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modelParam = searchParams.get("model") ?? "";

  // All models we have SKUs for
  const coveredModels = useMemo(() => {
    const set = new Set<string>();
    for (const s of skus) for (const m of s.compatible_models) set.add(m);
    return [...set];
  }, [skus]);

  // Group SKUs by model + category
  const lookupFor = useMemo(() => {
    return (modelSlug: string) => {
      const forModel = skus.filter((s) => s.compatible_models.includes(modelSlug));
      const glassVariants = forModel
        .filter((s) => {
          const k = inferSpotKind(s);
          return k === "glass" || k === "privacy";
        })
        .sort((a, b) => a.variant_sort - b.variant_sort);
      const lensSku = forModel.find((s) => inferSpotKind(s) === "lens") ?? null;
      const plateauSkus = forModel
        .filter((s) => inferSpotKind(s) === "plateau")
        .sort((a, b) => a.variant_sort - b.variant_sort);
      return { glassVariants, lensSku, plateauSkus };
    };
  }, [skus]);

  const selected = modelParam && coveredModels.includes(modelParam) ? modelParam : "";

  function selectModel(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("model", slug);
    router.push(`/beskyttelsesglas?${params.toString()}`, { scroll: false });
  }

  function clearModel() {
    router.push(`/beskyttelsesglas`, { scroll: false });
  }

  if (!selected) {
    return <ModelSearch covered={coveredModels} onPick={selectModel} />;
  }

  const { glassVariants, lensSku, plateauSkus } = lookupFor(selected);
  return (
    <ModelConfigurator
      modelSlug={selected}
      glassVariants={glassVariants}
      lensSku={lensSku}
      plateauSkus={plateauSkus}
      onChangeModel={clearModel}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Model search — the "pick your phone" state
// ──────────────────────────────────────────────────────────────────────────

function ModelSearch({
  covered,
  onPick,
}: {
  covered: string[];
  onPick: (slug: string) => void;
}) {
  const [q, setQ] = useState("");
  const coveredSet = useMemo(() => new Set(covered), [covered]);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 1) return [];
    return TILBEHOER_DEVICES.filter(
      (d) => coveredSet.has(d.slug) && (d.label.toLowerCase().includes(term) || d.slug.includes(term)),
    ).slice(0, 8);
  }, [q, coveredSet]);

  const quickPicks = QUICK_PICKS.filter((s) => coveredSet.has(s));

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_4px_24px_-8px_rgba(26,61,46,0.08)] md:rounded-3xl md:p-10">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1A3D2E]/60">Step 1 af 2</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-[#1A3D2E] md:text-3xl">
            Hvilken enhed har du?
          </h2>
        </div>

        <div className="relative mt-6">
          <svg
            aria-hidden
            className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-black/30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Skriv fx iPhone 15, Galaxy S25, iPad Pro..."
            className="w-full rounded-full border border-black/[0.08] bg-[#FAF7F1] py-4 pl-14 pr-5 text-base text-black placeholder-black/40 outline-none transition-all focus:border-[#1A3D2E] focus:bg-white focus:ring-2 focus:ring-[#1A3D2E]/15"
            autoFocus
            aria-label="Søg efter din enhed"
          />
          {matches.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-20 mt-2 max-h-[320px] overflow-auto rounded-2xl border border-black/[0.06] bg-white shadow-xl">
              {matches.map((m) => (
                <li key={m.slug}>
                  <button
                    type="button"
                    onClick={() => onPick(m.slug)}
                    className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-medium transition-colors hover:bg-[#FAF7F1]"
                  >
                    <span>{m.label}</span>
                    <svg aria-hidden className="h-4 w-4 text-black/40" viewBox="0 0 16 16" fill="none">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {q.trim().length === 0 && quickPicks.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-black/40">Populære</p>
            <div className="flex flex-wrap gap-2">
              {quickPicks.map((slug) => (
                <button
                  key={slug}
                  type="button"
                  onClick={() => onPick(slug)}
                  className="rounded-full border border-black/[0.08] bg-[#FAF7F1] px-4 py-2 text-sm font-medium text-[#1A3D2E] transition-all hover:border-[#1A3D2E]/30 hover:bg-white"
                >
                  {labelFor(slug)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Model configurator — "choose variant and add to cart" state
// ──────────────────────────────────────────────────────────────────────────

function ModelConfigurator({
  modelSlug,
  glassVariants,
  lensSku,
  plateauSkus,
  onChangeModel,
}: {
  modelSlug: string;
  glassVariants: SpotSku[];
  lensSku: SpotSku | null;
  plateauSkus: SpotSku[];
  onChangeModel: () => void;
}) {
  const { addSku, openCart } = useCart();
  const [variantId, setVariantId] = useState<string | undefined>(glassVariants[0]?.id);
  const [addLens, setAddLens] = useState(false);
  const [addPlateauId, setAddPlateauId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);

  // When model changes, reset variant selection + scroll the configurator into view.
  useEffect(() => {
    setVariantId(glassVariants[0]?.id);
    setAddLens(false);
    setAddPlateauId(null);
    configRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [modelSlug, glassVariants]);

  if (glassVariants.length === 0) {
    return (
      <section ref={configRef} className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <div className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center md:rounded-3xl">
          <h2 className="font-display text-xl font-bold text-[#1A3D2E]">
            Vi har ikke beskyttelsesglas til {labelFor(modelSlug)} endnu
          </h2>
          <p className="mt-3 text-sm text-black/60">Kig forbi igen snart — eller besøg os i Vejle eller Slagelse så vi kan hjælpe.</p>
          <button type="button" onClick={onChangeModel} className="mt-6 rounded-full border border-[#1A3D2E] px-6 py-3 text-sm font-semibold text-[#1A3D2E] hover:bg-[#1A3D2E] hover:text-white transition-colors">
            Vælg en anden enhed
          </button>
        </div>
      </section>
    );
  }

  const selected = glassVariants.find((v) => v.id === variantId) ?? glassVariants[0];
  const selectedPrice = selected.sale_price ?? selected.selling_price;
  const lensBundlePrice = lensSku ? Math.round((lensSku.selling_price ?? 0) / 2) : 0;
  const plateauSelected = plateauSkus.find((p) => p.id === addPlateauId) ?? null;
  const plateauPrice = plateauSelected?.selling_price ?? 0;

  const totalOere = selectedPrice + (addLens && lensSku ? lensBundlePrice : 0) + plateauPrice;
  const totalKr = (totalOere / 100).toFixed(0);

  function handleAddToCart() {
    addSku(skuToCartItem(selected));
    if (addLens && lensSku) {
      addSku({
        ...skuToCartItem(lensSku),
        price: lensBundlePrice,
        unitPrice: lensSku.selling_price,
      });
    }
    if (plateauSelected) {
      addSku(skuToCartItem(plateauSelected));
    }
    setAdding(true);
    openCart();
    setTimeout(() => setAdding(false), 1800);
  }

  return (
    <section ref={configRef} className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      {/* Change-model link */}
      <button
        type="button"
        onClick={onChangeModel}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-black/50 transition-colors hover:text-[#1A3D2E]"
      >
        <svg aria-hidden className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
          <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Skift enhed
      </button>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
        {/* Product image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#FAF7F1] md:rounded-3xl">
          <Image
            src={selected.images[0] ?? "/spot/hero.png"}
            alt={selected.title}
            fill
            className="object-contain p-8 md:p-12"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>

        {/* Config panel */}
        <div className="flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1A3D2E]/60">Step 2 af 2</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight text-[#1A3D2E] md:text-4xl">
            {labelFor(modelSlug)}
          </h2>
          <p className="mt-2 text-sm text-black/55">Beskyttelsesglas · 9H hærdet · gratis montering i butik</p>

          {/* Variant toggle */}
          <div className="mt-7">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-black/40">Vælg type</p>
            <div className="grid grid-cols-2 gap-2.5">
              {glassVariants.map((v) => {
                const active = v.id === selected.id;
                const kr = ((v.sale_price ?? v.selling_price) / 100).toFixed(0);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    aria-pressed={active}
                    className={`flex flex-col items-start rounded-xl border px-4 py-3.5 text-left transition-all ${
                      active
                        ? "border-[#1A3D2E] bg-[#1A3D2E] text-white shadow-[0_4px_16px_-6px_rgba(26,61,46,0.35)]"
                        : "border-black/[0.08] bg-white hover:border-[#1A3D2E]/40"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${active ? "text-white" : "text-[#1A3D2E]"}`}>
                      {v.variant_label ?? "Standard"}
                    </span>
                    <span className={`mt-0.5 text-xs ${active ? "text-white/80" : "text-black/50"}`}>
                      {kr} kr
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lens bundle option */}
          {lensSku && (
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.08] bg-white p-4 transition-colors hover:border-[#1A3D2E]/40">
              <input
                type="checkbox"
                checked={addLens}
                onChange={(e) => setAddLens(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#1A3D2E]"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#1A3D2E]">+ Kamera-linsebeskyttelse</div>
                <div className="mt-0.5 text-xs">
                  <span className="text-black/30 line-through">{(lensSku.selling_price / 100).toFixed(0)} kr</span>
                  <span className="ml-1.5 font-semibold text-[#1A3D2E]">{(lensBundlePrice / 100).toFixed(0)} kr</span>
                  <span className="ml-1 text-black/50">— 50% rabat med dit glas</span>
                </div>
              </div>
            </label>
          )}

          {/* Plateau color picker (Pro models only) */}
          {plateauSkus.length > 0 && (
            <div className="mt-4 rounded-xl border border-black/[0.08] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#1A3D2E]">+ Plateau kamera-frame</div>
                  <div className="mt-0.5 text-xs text-black/50">
                    Metallisk ramme over hele kameramodulet · {(plateauSkus[0].selling_price / 100).toFixed(0)} kr
                  </div>
                </div>
                {addPlateauId && (
                  <button
                    type="button"
                    onClick={() => setAddPlateauId(null)}
                    className="text-xs font-medium text-black/50 hover:text-[#1A3D2E]"
                  >
                    Fjern
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {plateauSkus.map((p) => {
                  const active = addPlateauId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAddPlateauId(active ? null : p.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        active
                          ? "border-[#1A3D2E] bg-[#1A3D2E] text-white"
                          : "border-black/[0.08] bg-[#FAF7F1] text-[#1A3D2E] hover:border-[#1A3D2E]/30"
                      }`}
                    >
                      {p.variant_label ?? "Farve"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All-accessories link — filtered to the chosen model */}
          <Link
            href={`/tilbehoer?model=${encodeURIComponent(labelFor(modelSlug))}`}
            className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-black/[0.12] bg-[#FAF7F1]/60 p-4 transition-colors hover:border-[#1A3D2E]/30 hover:bg-[#FAF7F1]"
          >
            <div>
              <div className="text-sm font-semibold text-[#1A3D2E]">
                Se alt tilbehør til {labelFor(modelSlug)}
              </div>
              <div className="mt-0.5 text-xs text-black/50">Covers, opladere, kabler og mere — kun til din model</div>
            </div>
            <svg aria-hidden className="h-4 w-4 text-black/40" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          {/* Add to cart */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding}
            className="mt-6 w-full rounded-full bg-[#1A3D2E] py-4 text-base font-bold text-white shadow-[0_10px_30px_-12px_rgba(26,61,46,0.5)] transition-all hover:bg-[#2a5c47] active:scale-[0.98] disabled:opacity-60"
          >
            {adding ? "Lagt i kurv ✓" : `Læg i kurv · ${totalKr} kr`}
          </button>

          <p className="mt-3 text-center text-[11px] text-black/40">Gratis fragt over 500 kr · 36 mdr. garanti · Gratis montering i butik</p>
        </div>
      </div>
    </section>
  );
}
