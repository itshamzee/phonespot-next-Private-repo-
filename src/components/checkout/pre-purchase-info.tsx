"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STORES } from "@/lib/store-config";
import { useCart } from "@/components/cart/cart-context";

export function PrePurchaseInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const { cartState } = useCart();
  // The 36-month PhoneSpot warranty is sold with graded refurbished devices
  // only — an accessory-only cart (cases, chargers, cables) never qualifies
  // for it, only the statutory 24-month reklamationsret. Showing the device
  // warranty as a blanket legal disclosure at checkout would be a false
  // claim on an accessory-only order.
  //
  // CartProvider's useReducer lazily initializes from localStorage
  // (lib/cart/storage.ts loadCart()): it returns an EMPTY cart on the server
  // (no `window`), but on the client it reads the real, persisted cart
  // synchronously on the very first render — before any effect runs and
  // before hydration has reconciled. So SSR always renders the safe
  // (reklamationsret-only) copy, while the client's first render can
  // already see a device and render the 36-month <li> — a hydration
  // mismatch that also changes DOM structure (an <li> is added/removed).
  // To make the first client render match the server exactly, `hasDevice`
  // starts `false` and is only set from the real cart inside an effect,
  // i.e. after mount (same deterministic pattern as PickupLine's
  // clock-independent first render). Never render the 36-month claim
  // before the cart is genuinely known.
  const [hasDevice, setHasDevice] = useState(false);
  useEffect(() => {
    setHasDevice(cartState.items.some((item) => item.type === "device"));
  }, [cartState.items]);

  return (
    <div className="rounded-xl border border-sand bg-cream">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-charcoal">
          Vigtige oplysninger inden køb
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-5 w-5 shrink-0 text-charcoal transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-sand px-4 pb-4 pt-3 text-sm text-charcoal space-y-3">
          {/* Seller info */}
          <div>
            <p className="font-semibold">Sælger</p>
            <p className="text-gray text-xs mt-0.5">
              PhoneSpot ApS · CVR: 38688766
              <br />
              {STORES.slagelse.street}, {STORES.slagelse.zip} {STORES.slagelse.city}
            </p>
          </div>

          {/* Consumer rights */}
          <div>
            <p className="font-semibold">Dine rettigheder</p>
            <ul className="mt-1 space-y-1 text-xs text-gray list-disc list-inside">
              <li>14 dages fortrydelsesret fra modtagelse</li>
              <li>24 måneders reklamationsret (mangelsansvar)</li>
              {hasDevice && <li>36 måneders garanti fra PhoneSpot på refurbished enheder</li>}
            </ul>
          </div>

          {/* Payment methods */}
          <div>
            <p className="font-semibold">Betalingsmetoder</p>
            <p className="text-xs text-gray mt-0.5">
              Dankort · Visa/Mastercard · MobilePay
            </p>
          </div>

          {/* Used-goods VAT note */}
          <div className="rounded-lg bg-warm-white border border-sand px-3 py-2 text-xs text-gray">
            <strong className="text-charcoal">Brugtmomsordning:</strong> Varer er solgt
            under brugtmomsordningen. Køber har ikke fradragsret for moms.
          </div>

          {/* Terms link */}
          <p className="text-xs">
            <Link
              href="/handelsbetingelser"
              className="text-green-eco underline hover:opacity-80"
              target="_blank"
              rel="noopener noreferrer"
            >
              Læs vores fulde handelsbetingelser →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
