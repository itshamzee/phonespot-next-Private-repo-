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
  sale_price: number | null; // øre — if set, price is the original
  image_url: string | null;
  store_stock: number;
  online_stock: number;
}

export function AccessoryCard({
  id,
  name,
  slug,
  category,
  price,
  sale_price,
  image_url,
  store_stock,
  online_stock,
  brand,
}: AccessoryCardProps) {
  const [added, setAdded] = useState(false);
  const { addSku, openCart } = useCart();

  const isOnSale = sale_price != null && sale_price < price;
  const displayPrice = isOnSale ? sale_price : price;

  const priceFormatted = (displayPrice / 100).toLocaleString("da-DK", {
    minimumFractionDigits: 0,
  });
  const originalPriceFormatted = isOnSale
    ? (price / 100).toLocaleString("da-DK", { minimumFractionDigits: 0 })
    : null;

  const href = `/tilbehoer/${category}/${slug}`;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addSku({
      type: "sku_product",
      skuProductId: id,
      title: name,
      price: displayPrice,
      quantity: 1,
      image: image_url ?? null,
    });
    openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-[16px] border border-sand bg-white transition-all duration-200 hover:shadow-md">
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
          <StoreBadge storeStock={store_stock} onlineStock={online_stock} />
        </div>
        {brand && (
          <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-charcoal/70 shadow-sm backdrop-blur-sm">
            {brand}
          </span>
        )}
        {isOnSale && (
          <span className="absolute bottom-2 left-2 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            Tilbud
          </span>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <Link href={href}>
          <h3 className="line-clamp-2 text-sm font-semibold text-charcoal transition-colors hover:text-green-eco">
            {name}
          </h3>
        </Link>
        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <p className={`text-lg font-bold ${isOnSale ? "text-red-600" : "text-green-eco"}`}>
              {priceFormatted} kr.
            </p>
            {originalPriceFormatted && (
              <p className="text-sm text-charcoal/40 line-through">
                {originalPriceFormatted} kr.
              </p>
            )}
          </div>

          {/* Stock indicator — combined across all locations */}
          {(() => {
            const total = store_stock + online_stock;
            if (total > 0 && total <= 5) {
              return (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Kun {total} på lager
                </p>
              );
            }
            if (total > 5) {
              return (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-charcoal/50">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                  På lager
                </p>
              );
            }
            return null;
          })()}
        </div>

        {/* Add to cart — subtle style */}
        <div className="mt-3">
          <button
            onClick={handleAddToCart}
            className={`w-full rounded-full py-3 text-sm font-bold transition-all ${
              added
                ? "bg-green-eco text-white"
                : "bg-green-eco/10 text-green-eco hover:bg-green-eco hover:text-white"
            }`}
          >
            {added ? "Tilføjet!" : "Tilføj til kurv"}
          </button>
        </div>
      </div>
    </div>
  );
}
