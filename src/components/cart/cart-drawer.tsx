"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { CartUpsell } from "@/components/cart/cart-upsell";
import { formatOere } from "@/lib/cart/utils";
import { cartItemKey } from "@/lib/cart/types";
import type { CartDeviceItem } from "@/lib/cart/types";

// ---------------------------------------------------------------------------
// Reservation countdown for device items
// ---------------------------------------------------------------------------

function ReservationTimer({ reservedAt }: { reservedAt: string }) {
  const RESERVATION_MS = 15 * 60 * 1000;

  function msLeft() {
    return Math.max(0, new Date(reservedAt).getTime() + RESERVATION_MS - Date.now());
  }

  const [remaining, setRemaining] = useState(msLeft);

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = msLeft();
      setRemaining(ms);
      if (ms <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [reservedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  if (remaining <= 0) {
    return (
      <span className="text-xs text-red-500 font-medium">Reservation udløbet</span>
    );
  }

  return (
    <span className="text-xs text-amber-600 font-medium tabular-nums">
      Reserveret i {minutes}:{String(seconds).padStart(2, "0")} min
    </span>
  );
}

// ---------------------------------------------------------------------------
// Cart drawer
// ---------------------------------------------------------------------------

export function CartDrawer() {
  const { cartState, totals, isOpen, closeCart } = useCart();

  const items = cartState.items;
  const totalItems = totals.itemCount;

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
            {items.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray">Din kurv er tom</p>
              </div>
            ) : (
              <div className="divide-y divide-sand">
                {items.map((item) => (
                  <div key={cartItemKey(item)}>
                    {item.type === "device" && (
                      <div className="pt-3 pb-1">
                        <ReservationTimer reservedAt={(item as CartDeviceItem).reservedAt} />
                      </div>
                    )}
                    <CartLineItem item={item} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upsell */}
          {items.length > 0 && <CartUpsell />}

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-sand px-5 py-5">
              {/* Discount badge */}
              {cartState.discount && (
                <div className="mb-3 flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-green-eco">
                      Rabatkode
                    </span>
                    <span className="rounded bg-green-eco px-1.5 py-0.5 text-xs font-bold text-white">
                      {cartState.discount.code}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-eco">
                    −{formatOere(totals.discountAmount)}
                  </span>
                </div>
              )}

              {/* Subtotal / total rows */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray">Subtotal</span>
                  <span className="text-sm font-medium text-charcoal">
                    {formatOere(totals.subtotal)}
                  </span>
                </div>
                {totals.shippingCost > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray">Fragt</span>
                    <span className="text-sm font-medium text-charcoal">
                      {formatOere(totals.shippingCost)}
                    </span>
                  </div>
                )}
                {totals.shippingCost === 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray">Fragt</span>
                    <span className="text-sm font-medium text-green-eco">Gratis</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-sand pt-1.5">
                  <span className="text-sm font-semibold text-charcoal">Total</span>
                  <span className="text-lg font-semibold text-charcoal">
                    {formatOere(totals.total)}
                  </span>
                </div>
              </div>

              <Link
                href="/kasse"
                onClick={closeCart}
                className="flex w-full items-center justify-center rounded-full bg-green-eco px-6 py-3 font-display text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-green-light"
              >
                Gå til kassen
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
