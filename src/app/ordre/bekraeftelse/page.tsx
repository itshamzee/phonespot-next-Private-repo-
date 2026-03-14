"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/cart-context";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatOere } from "@/lib/cart/utils";

// -----------------------------------------------------------------------
// Types for the order data fetched from Supabase
// -----------------------------------------------------------------------

interface RawOrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type: "device" | "sku_product";
  device: {
    grade: string | null;
    color: string | null;
    storage: string | null;
    template: {
      display_name: string;
      images: string[];
    } | null;
  } | null;
  sku_product: {
    title: string;
    images: string[];
  } | null;
}

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
}

interface RawOrder {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  created_at: string;
  customer: {
    name: string;
    email: string;
  } | null;
  order_items: RawOrderItem[];
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

// -----------------------------------------------------------------------
// Inner component (uses useSearchParams — must be wrapped in Suspense)
// -----------------------------------------------------------------------

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const { clearCart } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Ingen ordre-session fundet.");
      setLoading(false);
      return;
    }

    let cleared = false;

    async function fetchOrder() {
      const supabase = createBrowserClient();

      const { data, error: dbError } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          status,
          subtotal,
          discount_amount,
          shipping_cost,
          total,
          created_at,
          customer:customers!customer_id (
            name,
            email
          ),
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            item_type,
            device:devices!device_id (
              grade,
              color,
              storage,
              template:product_templates!template_id (
                display_name,
                images
              )
            ),
            sku_product:sku_products!sku_product_id (
              title,
              images
            )
          )
        `,
        )
        .eq("stripe_checkout_session_id", sessionId)
        .single();

      if (dbError || !data) {
        setError("Vi kunne ikke finde din ordre. Kontakt os på hej@phonespot.dk.");
        setLoading(false);
        return;
      }

      // Transform raw data into the display format
      const raw = data as unknown as RawOrder;
      const transformedOrder: Order = {
        id: raw.id,
        order_number: raw.order_number,
        status: raw.status,
        subtotal: raw.subtotal,
        discount_amount: raw.discount_amount,
        shipping_cost: raw.shipping_cost,
        total: raw.total,
        customer_name: raw.customer?.name ?? "",
        customer_email: raw.customer?.email ?? "",
        created_at: raw.created_at,
        order_items: raw.order_items.map((item) => {
          const isDevice = item.item_type === "device";
          const title = isDevice
            ? item.device?.template?.display_name ?? "Enhed"
            : item.sku_product?.title ?? "Produkt";
          const image = isDevice
            ? item.device?.template?.images?.[0] ?? null
            : item.sku_product?.images?.[0] ?? null;
          return {
            id: item.id,
            title,
            image_url: image,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.total_price,
            item_type: item.item_type,
            grade: isDevice ? item.device?.grade ?? null : null,
            color: isDevice ? item.device?.color ?? null : null,
            storage: isDevice ? item.device?.storage ?? null : null,
          };
        }),
      };

      setOrder(transformedOrder);
      setLoading(false);

      // Clear the cart once — only do it once even on React strict-mode double-invoke
      if (!cleared) {
        cleared = true;
        await clearCart();
      }
    }

    void fetchOrder();
  }, [sessionId, clearCart]);

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-10 w-10 animate-spin text-green-eco"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4Z"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-500">Henter din ordre…</p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error
  // -----------------------------------------------------------------------
  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center px-4">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-8 w-8 text-red-500"
          >
            <path
              fillRule="evenodd"
              d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 1.998-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-charcoal">
          Noget gik galt
        </h1>
        <p className="mt-4 text-sm text-gray-600">{error ?? "Ukendt fejl."}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Gå til forsiden
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

  // -----------------------------------------------------------------------
  // Success
  // -----------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-20">
      {/* Green checkmark header */}
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

        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-charcoal md:text-4xl">
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

      {/* Order items */}
      <div className="mt-10 rounded-2xl border border-sand bg-cream p-6">
        <h2 className="mb-4 font-display text-base font-bold uppercase tracking-wide text-charcoal">
          Hvad du har bestilt
        </h2>

        <ul className="divide-y divide-sand">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-3">
              {/* Thumbnail */}
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

              {/* Details */}
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="text-sm font-medium leading-tight text-charcoal">
                  {item.title}
                </p>
                {item.item_type === "device" && (item.grade || item.color || item.storage) && (
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
              </div>

              {/* Line total */}
              <span className="shrink-0 text-sm font-semibold text-charcoal">
                {formatOere(item.line_total)}
              </span>
            </li>
          ))}
        </ul>

        {/* Totals */}
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
      </div>

      {/* What happens next */}
      <div className="mt-6 rounded-2xl border border-sand bg-warm-white p-6">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-charcoal">
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

      {/* CTAs */}
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

// -----------------------------------------------------------------------
// Page export — wraps ConfirmationContent in Suspense (required for
// useSearchParams in Next.js App Router)
// -----------------------------------------------------------------------

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <svg
            className="h-10 w-10 animate-spin text-green-eco"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4Z"
            />
          </svg>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
