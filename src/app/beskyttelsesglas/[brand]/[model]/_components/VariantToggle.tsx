"use client";
import { useState } from "react";
import type { SpotSku } from "@/lib/spot/types";

export function VariantToggle({ variants, lensSku }: { variants: SpotSku[]; lensSku: SpotSku | null }) {
  const [selectedId, setSelectedId] = useState(variants[0].id);
  const [addLens, setAddLens] = useState(false);

  const selected = variants.find(v => v.id === selectedId)!;
  const glassPriceKr = (selected.sale_price ?? selected.selling_price) / 100;

  const lensFullKr    = lensSku ? lensSku.selling_price / 100 : 0;
  const lensBundleKr  = Math.round(lensFullKr / 2);
  const totalKr       = glassPriceKr + (addLens && lensSku ? lensBundleKr : 0);

  function handleAddToCart() {
    // TODO (Task 2.8) — wire to actual cart. Add `selected` plus (if addLens && lensSku) the lens SKU.
    // The cart-side bundle engine will apply the 50% off to the lens line automatically.
    console.log("Add to cart:", {
      glass: { sku: selected.slug, priceOere: selected.sale_price ?? selected.selling_price },
      lens: addLens && lensSku ? { sku: lensSku.slug, priceOere: lensSku.selling_price } : null,
    });
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

      {lensSku && (
        <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-gray-400 transition">
          <input type="checkbox" className="mt-1" checked={addLens} onChange={e => setAddLens(e.target.checked)} />
          <div className="flex-1">
            <div className="font-medium">+ Spot Lens kamerabeskyttelse</div>
            <div className="text-sm mt-0.5">
              <span className="line-through text-gray-400">{lensFullKr.toFixed(0)} kr</span>{" "}
              <span className="font-semibold text-green-700">{lensBundleKr.toFixed(0)} kr</span>
              <span className="text-gray-500"> — 50% rabat med dit glas</span>
            </div>
          </div>
        </label>
      )}

      <button
        onClick={handleAddToCart}
        className="w-full rounded-xl bg-black text-white py-4 text-lg font-medium hover:bg-black/90 transition">
        Læg i kurv — {totalKr.toFixed(0)} kr
      </button>
    </div>
  );
}
