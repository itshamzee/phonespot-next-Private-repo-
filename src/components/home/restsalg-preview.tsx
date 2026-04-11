"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Product = {
  id: string;
  image: string | null;
  minPrice: number | null;
};

function formatPrice(oere: number | null): string | null {
  if (oere == null) return null;
  return new Intl.NumberFormat("da-DK", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(oere / 100);
}

/**
 * Restsalg category card — fetches 4 real in-stock products and renders
 * them as a 2x2 collage inside the homepage category card. Replaces a
 * static product image with live inventory.
 */
export function RestsalgCard() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Fetch one product from each device category — guarantees variety and
    // never includes spare parts (which live in their own tables/categories).
    const tabs = ["laptops", "iphones", "ipads", "smartwatches"];
    Promise.all(
      tabs.map((tab) =>
        fetch(`/api/homepage-products?tab=${tab}&limit=1`)
          .then((res) => res.json())
          .catch(() => [])
      )
    ).then((results) => {
      const picked: Product[] = results
        .flatMap((arr: any) => (Array.isArray(arr) ? arr : []))
        .filter((p: any) => p.image)
        .slice(0, 4)
        .map((p: any) => ({
          id: p.id,
          image: p.image,
          minPrice: p.minPrice,
        }));
      setProducts(picked);
    });
  }, []);

  const cheapest =
    products.length > 0
      ? Math.min(...products.map((p) => p.minPrice ?? Infinity))
      : null;

  const priceLabel =
    cheapest && cheapest !== Infinity
      ? `Fra ${formatPrice(cheapest)} kr`
      : "Ekstra tilbud";

  return (
    <Link
      href="/restsalg"
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#1A3D2E]/8 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-[#1A3D2E]/15 hover:shadow-[0_12px_32px_-12px_rgba(26,61,46,0.18)]"
    >
      {/* Image area — 2x2 product collage */}
      <div className="relative h-36 bg-white p-3 sm:h-40">
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => {
            const product = products[i];
            return (
              <div
                key={i}
                className="relative flex items-center justify-center overflow-hidden rounded-md bg-[#fafaf8]"
              >
                {product?.image ? (
                  <Image
                    src={product.image}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-contain p-1 transition-transform duration-300 group-hover:scale-[1.04]"
                    unoptimized
                  />
                ) : (
                  <div className="h-full w-full animate-pulse bg-[#1A3D2E]/[0.04]" />
                )}
              </div>
            );
          })}
        </div>
        {/* Tilbud badge */}
        <span className="absolute top-2 left-2 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
          Tilbud
        </span>
      </div>
      {/* Body */}
      <div className="border-t border-[#1A3D2E]/8 px-4 py-3">
        <h3 className="font-display text-sm font-bold text-[#1A3D2E] sm:text-base">
          Restsalg
        </h3>
        <p className="mt-1 text-base font-bold text-red-500">{priceLabel}</p>
      </div>
    </Link>
  );
}
