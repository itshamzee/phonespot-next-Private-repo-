"use client";

import Image from "next/image";
import { useCart } from "@/components/cart/cart-context";
import { formatOere, lineTotal } from "@/lib/cart/utils";

export function CheckoutSummary() {
  const { cartState, totals } = useCart();

  const { items, discount } = cartState;
  const { subtotal, discountAmount, shippingCost, total } = totals;

  return (
    <div className="rounded-2xl border border-sand bg-cream p-6 space-y-5">
      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-charcoal">
        Din ordre
      </h2>

      {/* Line items */}
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Kurven er tom.</p>
      ) : (
        <ul className="divide-y divide-sand">
          {items.map((item) => {
            const key =
              item.type === "device"
                ? `device:${item.deviceId}`
                : `sku:${item.skuProductId}`;
            const itemTotal = lineTotal(item);

            return (
              <li key={key} className="flex items-start gap-3 py-3">
                {/* Thumbnail */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-warm-white border border-sand">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={64}
                      height={64}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1}
                        stroke="currentColor"
                        className="h-7 w-7"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col justify-between gap-1">
                  <p className="text-sm font-medium leading-tight text-charcoal">
                    {item.title}
                  </p>

                  {item.type === "device" && (
                    <p className="text-xs text-gray-500">
                      Stand {item.grade} · {item.color} · {item.storage}
                    </p>
                  )}

                  {item.type === "sku_product" && item.quantity > 1 && (
                    <p className="text-xs text-gray-500">Antal: {item.quantity}</p>
                  )}
                </div>

                {/* Line price */}
                <span className="shrink-0 text-sm font-semibold text-charcoal">
                  {formatOere(itemTotal)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Totals */}
      <div className="space-y-2 border-t border-sand pt-4 text-sm">
        <div className="flex items-center justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{formatOere(subtotal)}</span>
        </div>

        {discount && discountAmount > 0 && (
          <div className="flex items-center justify-between text-green-eco">
            <span>
              Rabat{" "}
              <span className="rounded bg-green-eco/10 px-1.5 py-0.5 text-xs font-mono font-semibold uppercase">
                {discount.code}
              </span>
            </span>
            <span>−{formatOere(discountAmount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-gray-600">
          <span>Fragt</span>
          <span>{shippingCost === 0 ? "Gratis" : formatOere(shippingCost)}</span>
        </div>

        <div className="flex items-center justify-between border-t border-sand pt-2 text-base font-bold text-charcoal">
          <span>I alt</span>
          <span>{formatOere(total)}</span>
        </div>
      </div>
    </div>
  );
}
