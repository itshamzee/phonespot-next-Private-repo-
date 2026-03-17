"use client";

import { useState } from "react";
import Link from "next/link";
import { StoreBadge } from "@/components/ui/store-badge";
import { useCart } from "@/components/cart/cart-context";

interface AccessoryCardProps {
  id: string;
  name: string;
  slug: string;
  category: string;
  brand: string | null;
  price: number; // øre
  image_url: string | null;
  store_stock: number;
  online_stock: number;
}

interface ReservationState {
  name: string;
  phone: string;
  email: string;
  submitting: boolean;
  done: boolean;
  error: string | null;
}

function ReservationModal({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<ReservationState>({
    name: "",
    phone: "",
    email: "",
    submitting: false,
    done: false,
    error: null,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState((s) => ({ ...s, submitting: true, error: null }));

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_type: "accessory",
          product_id: productId,
          product_name: productName,
          customer_name: state.name,
          customer_phone: state.phone,
          customer_email: state.email || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Reservation mislykkedes");
      }

      setState((s) => ({ ...s, done: true, submitting: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        submitting: false,
        error: err instanceof Error ? err.message : "Noget gik galt",
      }));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {state.done ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-7 w-7 text-green-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-charcoal">
              Reservation oprettet
            </h3>
            <p className="mt-2 text-sm text-charcoal/60">
              Vi holder produktet til dig. Du hores fra os hurtigst muligt.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-full bg-green-eco py-3 text-sm font-bold text-white"
            >
              Luk
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-charcoal">
                  Reserver til afhentning
                </h3>
                <p className="mt-0.5 text-sm text-charcoal/60 line-clamp-1">
                  {productName}
                </p>
              </div>
              <button
                onClick={onClose}
                className="ml-4 shrink-0 rounded-full p-1.5 text-charcoal/40 hover:bg-sand hover:text-charcoal"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-charcoal/60">
                  Navn *
                </label>
                <input
                  type="text"
                  required
                  value={state.name}
                  onChange={(e) =>
                    setState((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="Dit fulde navn"
                  className="w-full rounded-xl border border-sand bg-cream px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-green-eco focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-charcoal/60">
                  Telefon *
                </label>
                <input
                  type="tel"
                  required
                  value={state.phone}
                  onChange={(e) =>
                    setState((s) => ({ ...s, phone: e.target.value }))
                  }
                  placeholder="+45 12 34 56 78"
                  className="w-full rounded-xl border border-sand bg-cream px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-green-eco focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-charcoal/60">
                  E-mail (valgfrit)
                </label>
                <input
                  type="email"
                  value={state.email}
                  onChange={(e) =>
                    setState((s) => ({ ...s, email: e.target.value }))
                  }
                  placeholder="din@email.dk"
                  className="w-full rounded-xl border border-sand bg-cream px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-green-eco focus:outline-none"
                />
              </div>

              {state.error && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={state.submitting}
                className="mt-1 w-full rounded-full bg-green-eco py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {state.submitting ? "Reserverer..." : "Reserver til afhentning"}
              </button>
            </form>

            <p className="mt-3 text-center text-xs text-charcoal/40">
              Afhentning i VestsjællandsCentret, Slagelse
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function AccessoryCard({
  id,
  name,
  slug,
  category,
  price,
  image_url,
  store_stock,
  online_stock,
  brand,
}: AccessoryCardProps) {
  const [showReservation, setShowReservation] = useState(false);
  const { addSku, openCart } = useCart();

  const priceFormatted = (price / 100).toLocaleString("da-DK", {
    minimumFractionDigits: 0,
  });

  const href = `/tilbehoer/${category}/${slug}`;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addSku({
      type: "sku_product",
      skuProductId: id,
      title: name,
      price,
      quantity: 1,
      image: image_url ?? "",
    });
    openCart();
  }

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-2xl border border-sand bg-white transition-shadow hover:shadow-md">
        {/* Image — clickable */}
        <Link href={href} className="relative aspect-square overflow-hidden bg-cream block">
          {image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image_url}
              alt={name}
              className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sand">
              <svg
                viewBox="0 0 64 64"
                className="h-16 w-16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="16" y="8" width="32" height="48" rx="4" />
                <circle cx="32" cy="52" r="2" />
              </svg>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <StoreBadge storeStock={store_stock} />
          </div>
        </Link>

        {/* Info */}
        <div className="flex flex-1 flex-col p-4">
          {brand && (
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              {brand}
            </p>
          )}
          <Link href={href}>
            <h3 className="mt-1 line-clamp-2 font-semibold text-charcoal hover:text-green-eco transition-colors">
              {name}
            </h3>
          </Link>
          <div className="mt-auto pt-3">
            <p className="text-lg font-bold text-green-eco">
              {priceFormatted} kr.
            </p>
            {online_stock > 0 && (
              <p className="mt-0.5 text-xs text-charcoal/50">
                {online_stock} stk. online
              </p>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAddToCart}
              className="flex-1 rounded-full bg-green-eco py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Tilføj til kurv
            </button>
            {store_stock > 0 && (
              <button
                onClick={() => setShowReservation(true)}
                className="rounded-full border border-green-eco px-4 py-2.5 text-sm font-bold text-green-eco transition-colors hover:bg-green-eco/5"
              >
                Afhent
              </button>
            )}
          </div>
        </div>
      </div>

      {showReservation && (
        <ReservationModal
          productId={id}
          productName={name}
          onClose={() => setShowReservation(false)}
        />
      )}
    </>
  );
}
