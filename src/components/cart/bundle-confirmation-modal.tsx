"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useCart } from "@/components/cart/cart-context";
import { SOMMER_BUNDLE_2026 } from "@/lib/campaigns/sommer-bundle";

export function BundleConfirmationModal() {
  const { showUpsell, closeUpsell, openCart } = useCart();

  const handleContinue = () => {
    closeUpsell();
    openCart();
  };

  useEffect(() => {
    if (!showUpsell) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showUpsell]);

  useEffect(() => {
    if (!showUpsell) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleContinue();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showUpsell]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!showUpsell) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-warm-white">
      <div className="flex items-center justify-between border-b border-sand px-4 sm:px-5 py-4">
        <button type="button" onClick={handleContinue} aria-label="Luk og fortsæt" className="text-charcoal hover:text-green-eco transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <Image src="/brand/logos/phonespot-wordmark-dark.png" alt="PhoneSpot" width={146} height={28} className="h-7 w-[120px] sm:w-[146px]" />
        <div className="w-6" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-lg">
          <h2 className="mb-1 font-display text-2xl font-bold text-charcoal">Tilføjet i kurv</h2>
          <p className="mb-8 text-sm text-charcoal/60">Du får disse gratis med din iPhone — kun til 30. juni.</p>

          <div className="rounded-2xl border border-green-eco/20 bg-green-eco/5 p-5">
            <p className="mb-4 text-[11px] font-extrabold uppercase tracking-widest text-green-eco">Inkluderet gratis</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-eco text-xs font-bold text-white">+</span>
                <span className="flex-1 text-sm font-medium text-charcoal">Tempered Glass</span>
                <span className="text-sm">
                  <s className="text-charcoal/40">{(SOMMER_BUNDLE_2026.glass_retail_price_oere / 100).toFixed(0)} kr</s>
                  <span className="ml-2 font-bold text-green-eco">Gratis</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-eco text-xs font-bold text-white">+</span>
                <span className="flex-1 text-sm font-medium text-charcoal">TPU cover (klar)</span>
                <span className="text-sm">
                  <s className="text-charcoal/40">{(SOMMER_BUNDLE_2026.tpu_retail_price_oere / 100).toFixed(0)} kr</s>
                  <span className="ml-2 font-bold text-green-eco">Gratis</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-sand px-5 py-4">
        <button
          type="button"
          onClick={handleContinue}
          className="mx-auto block w-full max-w-lg rounded-full bg-charcoal py-3.5 text-center font-semibold text-white transition-colors hover:bg-charcoal/90"
        >
          Gå til kurv →
        </button>
      </div>
    </div>
  );
}
