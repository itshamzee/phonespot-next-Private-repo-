"use client";
import { useState } from "react";
import type { SpotSku } from "@/lib/spot/types";

export function VariantToggle({ variants }: { variants: SpotSku[] }) {
  const [selectedId, setSelectedId] = useState(variants[0].id);
  const selected = variants.find(v => v.id === selectedId)!;
  const priceKr = (selected.sale_price ?? selected.selling_price) / 100;

  function handleAddToCart() {
    // TODO: wire to actual cart — see existing product pages (e.g. /covers/[product])
    // for the cart-add pattern this project uses. For now logs intent.
    console.log("Add to cart:", { sku: selected.slug, priceOere: selected.sale_price ?? selected.selling_price });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {variants.map(v => {
          const active = v.id === selectedId;
          return (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={`px-4 py-2 rounded-lg border ${active ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-400"}`}
            >
              <div className="font-medium">{v.variant_label ?? "Standard"}</div>
              <div className={`text-xs ${active ? "text-white/70" : "text-gray-500"}`}>{(v.selling_price/100).toFixed(0)} kr</div>
            </button>
          );
        })}
      </div>
      <button
        onClick={handleAddToCart}
        className="w-full rounded-xl bg-black text-white py-4 text-lg font-medium hover:bg-black/90 transition">
        Læg i kurv — {priceKr.toFixed(0)} kr
      </button>
    </div>
  );
}
