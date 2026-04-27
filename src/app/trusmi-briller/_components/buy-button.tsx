"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";

interface Props {
  productId: string;
  title: string;
  image: string;
  priceOere: number;
  variant?: "primary" | "ghost";
  fullWidth?: boolean;
}

export function BuyButton({
  productId,
  title,
  image,
  priceOere,
  variant = "primary",
  fullWidth = false,
}: Props) {
  const { addSku, openCart } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function add() {
    addSku({
      type: "sku_product",
      skuProductId: productId,
      title,
      image,
      price: priceOere,
      quantity: qty,
    });
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1800);
  }

  const primaryClasses =
    "bg-[#1A3D2E] text-white hover:bg-[#14301F] shadow-[0_8px_30px_-12px_rgba(26,61,46,0.6)]";
  const ghostClasses =
    "bg-white text-[#0F2A20] border border-[#0F2A20]/15 hover:border-[#0F2A20]/40";

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-stretch ${fullWidth ? "w-full" : ""}`}>
      <div className="inline-flex h-14 items-stretch overflow-hidden rounded-full border border-black/10 bg-white">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          aria-label="Færre"
          className="px-5 text-xl font-semibold text-[#6E6E73] transition-colors hover:text-[#111111]"
        >
          −
        </button>
        <span className="flex w-10 items-center justify-center text-base font-semibold text-[#111111] tabular-nums">
          {qty}
        </span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(10, q + 1))}
          aria-label="Flere"
          className="px-5 text-xl font-semibold text-[#6E6E73] transition-colors hover:text-[#111111]"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={add}
        className={`group relative flex h-14 ${fullWidth ? "flex-1" : "min-w-[280px]"} items-center justify-center gap-2 overflow-hidden rounded-full px-8 text-base font-semibold transition-all active:scale-[0.99] ${variant === "primary" ? primaryClasses : ghostClasses}`}
      >
        {added ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
            Lagt i kurv
          </>
        ) : (
          <>
            <span>Læg i kurv — {(priceOere / 100).toLocaleString("da-DK")} kr.</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
              <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
