"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";

interface Props {
  productId: string;
  title: string;
  image: string;
  priceOere: number; // 79900
}

export function BuyButton({ productId, title, image, priceOere }: Props) {
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

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
      <div className="inline-flex h-14 items-stretch overflow-hidden rounded-full border border-[#E5E5EA] bg-white">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          aria-label="Færre"
          className="px-5 text-xl font-semibold text-[#6E6E73] transition-colors hover:text-[#111111]"
        >
          −
        </button>
        <span className="flex w-10 items-center justify-center text-base font-semibold text-[#111111]">
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
        className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-[#1A3D2E] px-8 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#14301F] active:scale-[0.99]"
      >
        {added ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
            Lagt i kurv
          </>
        ) : (
          <>Læg i kurv — {(priceOere / 100).toLocaleString("da-DK")} kr.</>
        )}
      </button>
    </div>
  );
}
