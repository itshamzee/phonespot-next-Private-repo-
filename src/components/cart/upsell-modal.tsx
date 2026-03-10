"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCart } from "@/components/cart/cart-context";

const UPSELL_PRODUCTS = [
  {
    id: "tempered-glass",
    title: "Tempered Glass",
    subtitle: "Kant til kant",
    description: "9H hårdheds skærmbeskyttelse der dækker hele skærmen",
    price: 159,
    variantId: "", // Will be connected to Shopify later
    image: "/images/panserglas.png",
  },
  {
    id: "privacy-glass",
    title: "Privacy Glass",
    subtitle: "Anti-kig beskyttelse",
    description: "Skærmbeskyttelse med privacy-filter — kun du kan se skærmen",
    price: 249,
    variantId: "", // Will be connected to Shopify later
    image: "/images/privacy-glas.png",
    popular: true,
  },
];

export function UpsellModal() {
  const { showUpsell, closeUpsell, openCart } = useCart();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Reset selection when modal opens
  useEffect(() => {
    if (showUpsell) setSelectedId(null);
  }, [showUpsell]);

  const handleSkip = () => {
    closeUpsell();
    openCart();
  };

  const handleAdd = () => {
    // No-op for now — variantId is empty until Shopify variant is configured
    // When ready: await addToCart(cart.id, selected.variantId)
    closeUpsell();
    openCart();
  };

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (showUpsell) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showUpsell]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeUpsell();
        openCart();
      }
    }
    if (showUpsell) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showUpsell, closeUpsell, openCart]);

  if (!showUpsell) return null;

  const selected = UPSELL_PRODUCTS.find((p) => p.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-warm-white">
      {/* Header with logo */}
      <div className="flex items-center justify-between border-b border-sand px-5 py-4">
        <button
          type="button"
          onClick={handleSkip}
          aria-label="Luk og fortsæt"
          className="text-charcoal transition-colors hover:text-green-eco"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
        </button>

        {/* Center logo */}
        <Image
          src="/brand/logos/phonespot-wordmark-dark.svg"
          alt="PhoneSpot"
          width={146}
          height={28}
          className="h-7 w-auto"
        />

        {/* Spacer to balance the back button */}
        <div className="w-6" />
      </div>

      {/* Content — centered vertically */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-6">
        <h2 className="mb-6 font-display text-xl font-bold text-charcoal md:text-2xl">
          Beskyt din skærm
        </h2>

        <div className="flex w-full max-w-3xl flex-col gap-4 md:flex-row md:gap-6">
          {UPSELL_PRODUCTS.map((product) => {
            const isSelected = selectedId === product.id;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedId(isSelected ? null : product.id)}
                className={`relative flex gap-4 rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all md:flex-1 md:flex-col md:items-center md:gap-5 md:p-8 ${
                  isSelected
                    ? "border-green-eco ring-1 ring-green-eco/20"
                    : "border-sand hover:border-charcoal/20"
                }`}
              >
                {/* Popular badge */}
                {product.popular && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-green-eco px-3 py-0.5 text-xs font-semibold text-white">
                    Populær
                  </span>
                )}

                {/* Selection indicator */}
                <div className="absolute top-4 right-4 md:top-5 md:right-5">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors md:h-7 md:w-7 ${
                      isSelected
                        ? "border-green-eco bg-green-eco"
                        : "border-charcoal/20"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                        className="h-3.5 w-3.5 text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Product image */}
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-sand/30 md:h-48 md:w-48 md:rounded-2xl">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-contain p-1 md:p-3"
                    sizes="(min-width: 768px) 192px, 96px"
                  />
                </div>

                {/* Product info */}
                <div className="flex flex-1 flex-col justify-center gap-1 pr-8 md:items-center md:gap-2 md:pr-0 md:text-center">
                  <h3 className="font-display text-base font-bold text-charcoal md:text-xl">
                    {product.title}
                  </h3>
                  <p className="text-xs font-medium text-charcoal/50 md:text-sm">
                    {product.subtitle}
                  </p>
                  <p className="text-sm text-charcoal/70 md:text-base">
                    {product.description}
                  </p>
                  <p className="mt-1 text-lg font-bold text-green-eco md:mt-2 md:text-2xl">
                    {product.price} kr
                  </p>
                  <p className="text-xs font-semibold text-green-eco md:text-sm">
                    Inkl. gratis montering
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-sand px-5 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {selected ? (
            <button
              type="button"
              onClick={handleAdd}
              className="w-full rounded-full bg-green-eco py-3.5 font-semibold text-white transition-colors hover:bg-green-light"
            >
              Tilføj {selected.title} — {selected.price} kr
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full rounded-full bg-green-eco/40 py-3.5 font-semibold text-white cursor-not-allowed"
            >
              Vælg en skærmbeskyttelse
            </button>
          )}
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2.5 text-center text-sm font-medium text-charcoal/60 transition-colors hover:text-charcoal"
          >
            Nej tak, fortsæt uden
          </button>
        </div>
      </div>
    </div>
  );
}
