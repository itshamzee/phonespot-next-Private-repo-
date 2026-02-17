"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-context";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { CartUpsell } from "@/components/cart/cart-upsell";

function formatPrice(amount: string, currencyCode = "DKK"): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
  }).format(parseFloat(amount));
}

export function CartDrawer() {
  const { cart, isOpen, closeCart } = useCart();

  const totalItems = cart?.totalQuantity ?? 0;
  const lines = cart?.lines ?? [];

  // Prevent body scrolling when the drawer is open.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeCart();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeCart]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform bg-warm-white shadow-lg transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Indkobskurv"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-sand px-5 py-4">
            <h2 className="font-display text-lg font-semibold uppercase tracking-wider text-charcoal">
              Kurv ({totalItems})
            </h2>
            <button
              type="button"
              className="text-charcoal transition-colors hover:text-green-eco"
              onClick={closeCart}
              aria-label="Luk kurv"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5">
            {lines.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray">Din kurv er tom</p>
              </div>
            ) : (
              <div className="divide-y divide-sand">
                {lines.map((item) => (
                  <CartLineItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Upsell */}
          {lines.length > 0 && <CartUpsell />}

          {/* Footer */}
          {lines.length > 0 && cart && (
            <div className="border-t border-sand px-5 py-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-charcoal">
                  Subtotal
                </span>
                <span className="text-lg font-semibold text-charcoal">
                  {formatPrice(
                    cart.cost.subtotalAmount.amount,
                    cart.cost.subtotalAmount.currencyCode,
                  )}
                </span>
              </div>

              <a
                href={cart.checkoutUrl}
                className="flex w-full items-center justify-center rounded-full bg-green-eco px-6 py-3 font-display text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-green-light"
              >
                Ga til betaling
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
