"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/cart-context";
import { formatOere } from "@/lib/cart/utils";
import { trackPurchase } from "@/lib/tracking/fbq";
import { trackAdsPurchase } from "@/lib/tracking/gtag-ads";

interface OrderItem {
  id: string;
  title: string;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  item_type: "device" | "sku_product";
  grade: string | null;
  color: string | null;
  storage: string | null;
  upgrade_details?: Array<{ label: string; price_oere: number }> | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  customer_name: string;
  customer_email: string;
  created_at: string;
  order_items: OrderItem[];
}

export function ConfirmationView({ order }: { order: Order }) {
  const { clearCart } = useCart();
  const hasUpgrades = order.order_items.some(
    (item) => (item.upgrade_details?.length ?? 0) > 0,
  );

  useEffect(() => {
    let cancelled = false;

    trackPurchase({
      orderId: order.id,
      value: order.total / 100,
      contentIds: order.order_items.map((i) => i.id),
    });

    trackAdsPurchase({
      orderId: order.id,
      orderNumber: order.order_number,
      value: order.total / 100,
    });

    void clearCart();

    return () => {
      cancelled = true;
      void cancelled;
    };
    // Order is fetched server-side and never changes — run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-20">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-eco/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-8 w-8 text-green-eco"
          >
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
          Tak for din ordre!
        </h1>

        <p className="mt-3 text-sm text-gray-500">
          Ordrenummer:{" "}
          <span className="font-mono font-semibold text-charcoal">
            {order.order_number}
          </span>
        </p>

        <p className="mt-2 text-sm text-gray-600">
          Du modtager en bekræftelse på email til{" "}
          <span className="font-medium text-charcoal">{order.customer_email}</span>
        </p>
      </div>

      <div className="mt-10 rounded-2xl border border-sand bg-cream p-6">
        <h2 className="mb-4 font-display text-base font-bold tracking-tight text-charcoal">
          Hvad du har bestilt
        </h2>

        <ul className="divide-y divide-sand">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-warm-white border border-sand">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.title}
                    width={56}
                    height={56}
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
                      className="h-6 w-6"
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

              <div className="flex flex-1 flex-col gap-0.5">
                <p className="text-sm font-medium leading-tight text-charcoal">
                  {item.title}
                </p>
                {item.item_type === "device" &&
                  (item.grade || item.color || item.storage) && (
                    <p className="text-xs text-gray-500">
                      {[
                        item.grade && `Stand ${item.grade}`,
                        item.color,
                        item.storage,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                {item.item_type === "sku_product" && item.quantity > 1 && (
                  <p className="text-xs text-gray-500">Antal: {item.quantity}</p>
                )}
                {item.upgrade_details?.map((u, i) => (
                  <p key={i} className="text-xs text-[#86868B]">
                    + {u.label} ({formatOere(u.price_oere)})
                  </p>
                ))}
              </div>

              <span className="shrink-0 text-sm font-semibold text-charcoal">
                {formatOere(item.line_total)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1.5 border-t border-sand pt-4 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatOere(order.subtotal)}</span>
          </div>

          {order.discount_amount > 0 && (
            <div className="flex justify-between text-green-eco">
              <span>Rabat</span>
              <span>−{formatOere(order.discount_amount)}</span>
            </div>
          )}

          <div className="flex justify-between text-gray-600">
            <span>Fragt</span>
            <span>
              {order.shipping_cost === 0 ? "Gratis" : formatOere(order.shipping_cost)}
            </span>
          </div>

          <div className="flex justify-between border-t border-sand pt-2 text-base font-bold text-charcoal">
            <span>I alt</span>
            <span>{formatOere(order.total)}</span>
          </div>
        </div>

        {hasUpgrades && (
          <p className="mt-4 text-xs text-gray-500">
            Din ordre indeholder en opgradering — der må påregnes op til 3
            hverdages ekstra leveringstid, mens vi monterer og tester.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-sand bg-warm-white p-6">
        <h3 className="font-display text-sm font-semibold tracking-tight text-charcoal">
          Hvad sker der nu?
        </h3>
        <div className="mt-4 space-y-3">
          {[
            "Du modtager en ordrebekræftelse på email",
            "Vi kvalitetstester og klargør din enhed",
            "Du får tracking-info når pakken sendes (1–2 hverdage)",
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-eco text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="text-sm text-charcoal">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Fortsæt med at handle
        </Link>
        <Link
          href="/kontakt"
          className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
        >
          Kontakt os
        </Link>
      </div>
    </div>
  );
}
