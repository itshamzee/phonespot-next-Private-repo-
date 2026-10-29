"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCart } from "@/components/cart/cart-context";
import type { PublicAccessory } from "@/lib/product/public-accessory";
import { pickUpsell } from "@/lib/product/pick-upsell";

/**
 * Add-to-cart sheet: confirms what was added and suggests accessories that fit
 * the model, each with its own add button (bottom sheet on mobile, side panel
 * on desktop). Without a model, or when nothing fits, it falls back to the two
 * universal screen protectors.
 */

interface Suggestion {
  id: string;
  title: string;
  subtitle: string;
  price: number; // øre
  image: string | null;
  lagersalg?: boolean;
}

const FALLBACK: Suggestion[] = [
  {
    id: "0a718861-eae0-4c83-8cea-70d114a89fea",
    title: "Hærdet glas",
    subtitle: "Kant til kant, hårdhed 9H",
    price: 15900,
    image: "/images/beskyttelsesglas.webp",
  },
  {
    id: "979b3baf-96a8-4b80-b284-74941229dd2b",
    title: "Glas med privatlivsfilter",
    subtitle: "Kun du kan se skærmen",
    price: 24900,
    image: "/images/privacy-glas.webp",
  },
];

const SUBTITLE: Record<string, string> = {
  covers: "Cover",
  beskyttelsesglas: "Beskyttelsesglas",
};

const SUGGESTION_LIMIT = 4;

function formatKr(oere: number): string {
  const kr = oere / 100;
  return `${kr.toLocaleString("da-DK", { minimumFractionDigits: Number.isInteger(kr) ? 0 : 2, maximumFractionDigits: 2 })} kr.`;
}

export function toSuggestion(a: PublicAccessory): Suggestion {
  return {
    id: a.id,
    title: a.name,
    subtitle: SUBTITLE[a.category] ?? "Tilbehør",
    price: a.sale_price ?? a.price,
    image: a.image_url,
    ...(a.lagersalg ? { lagersalg: true } : {}),
  };
}

export function UpsellModal() {
  const { showUpsell, upsellContext, closeUpsell, openCart, addSku, cartState } = useCart();
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const model = upsellContext?.model;

  // Load suggestions for the model each time the sheet opens.
  useEffect(() => {
    if (!showUpsell) return;
    if (!model) {
      setSuggestions(FALLBACK);
      return;
    }
    setSuggestions(null);
    const controller = new AbortController();
    fetch(`/api/accessories?model=${encodeURIComponent(model)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        const fitting = Array.isArray(data) ? pickUpsell(data as PublicAccessory[], SUGGESTION_LIMIT) : [];
        setSuggestions(fitting.length > 0 ? fitting.map(toSuggestion) : FALLBACK);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name !== "AbortError") setSuggestions(FALLBACK);
      });
    return () => controller.abort();
  }, [showUpsell, model]);

  const inCart = new Set(
    cartState.items.flatMap((item) => (item.type === "sku_product" ? [item.skuProductId] : [])),
  );

  const goToCart = () => {
    closeUpsell();
    openCart();
  };

  const handleAdd = (s: Suggestion) => {
    if (inCart.has(s.id)) return;
    addSku({
      type: "sku_product",
      skuProductId: s.id,
      title: s.title,
      price: s.price,
      quantity: 1,
      image: s.image,
      ...(s.lagersalg ? { lagersalg: true as const } : {}),
    });
  };

  // Prevent body scrolling while the sheet is open
  useEffect(() => {
    document.body.style.overflow = showUpsell ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showUpsell]);

  // Escape closes the sheet and shows the cart
  useEffect(() => {
    if (!showUpsell) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeUpsell();
        openCart();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showUpsell, closeUpsell, openCart]);

  if (!showUpsell) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" aria-hidden="true" onClick={closeUpsell} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upsell-title"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-2xl bg-white shadow-xl md:inset-x-auto md:inset-y-0 md:right-0 md:max-h-none md:w-full md:max-w-md md:rounded-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5EA] px-4 py-4 sm:px-5">
          <h2 id="upsell-title" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-[#111111]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="h-5 w-5 text-[#1A3D2E]" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Lagt i kurven
          </h2>
          <button
            type="button"
            onClick={closeUpsell}
            aria-label="Luk og fortsæt med at handle"
            className="text-[#86868B] transition-colors hover:text-[#111111]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {/* What was just added */}
          {upsellContext && (
            <div className="flex items-center gap-3 rounded-xl bg-[#F7F7F8] p-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white">
                {upsellContext.image && (
                  <Image src={upsellContext.image} alt="" fill className="object-contain p-1" sizes="64px" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#111111]">{upsellContext.title}</p>
                <p className="text-sm text-[#86868B]">{formatKr(upsellContext.price)}</p>
              </div>
            </div>
          )}

          {/* Suggestions */}
          <h3 className="mb-2 mt-5 text-sm font-semibold text-[#111111]">
            {model ? `Passer til din ${model}` : "Beskyt din skærm"}
          </h3>
          {suggestions === null ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-[76px] animate-pulse rounded-xl bg-[#F7F7F8]" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-[#E5E5EA]">
              {suggestions.map((s) => {
                const added = inCart.has(s.id);
                return (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#F7F7F8]">
                      {s.image && <Image src={s.image} alt="" fill className="object-contain p-1" sizes="56px" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-[#111111]">{s.title}</p>
                      <p className="text-xs text-[#86868B]">
                        {s.subtitle} · <span className="font-semibold text-[#111111]">{formatKr(s.price)}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdd(s)}
                      disabled={added}
                      aria-label={added ? `${s.title} er lagt i kurven` : `Tilføj ${s.title}`}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        added
                          ? "bg-[#E8F0EC] text-[#1A3D2E]"
                          : "border border-[#1A3D2E] text-[#1A3D2E] hover:bg-[#1A3D2E] hover:text-white"
                      }`}
                    >
                      {added ? "Tilføjet" : "Tilføj"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-[#E5E5EA] px-4 py-4 sm:px-5">
          <button
            type="button"
            onClick={goToCart}
            className="w-full rounded-full bg-[#1A3D2E] py-3.5 font-semibold text-white transition-colors hover:bg-[#244f3c]"
          >
            Gå til kurven
          </button>
          <button
            type="button"
            onClick={closeUpsell}
            className="w-full py-2 text-center text-sm font-medium text-[#86868B] transition-colors hover:text-[#111111]"
          >
            Fortsæt med at handle
          </button>
        </div>
      </div>
    </>
  );
}
