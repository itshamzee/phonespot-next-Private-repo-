"use client";
import { useState } from "react";
import type { SpotSku, SpotVariantKind } from "@/lib/spot/types";
import { useCart } from "@/components/cart/cart-context";
import type { CartSkuItem } from "@/lib/cart/types";

/** Derive the bundle-pricing kind from a SpotSku's label or slug. */
function inferSpotKind(sku: SpotSku): SpotVariantKind {
  const label = (sku.variant_label ?? "").toLowerCase();
  const slug  = sku.slug.toLowerCase();
  if (label === "privacy" || slug.includes("-privacy")) return "privacy";
  if (label === "lens"    || slug.includes("-lens"))    return "lens";
  if (label === "plateau" || slug.includes("-plateau")) return "plateau";
  return "glass";
}

function skuToCartItem(sku: SpotSku): CartSkuItem {
  const spotKind = inferSpotKind(sku);
  const effectivePrice = sku.sale_price ?? sku.selling_price;
  return {
    type: "sku_product",
    skuProductId: sku.id,
    title: sku.title,
    image: sku.images[0] ?? null,
    price: effectivePrice,
    // Store the original selling_price so the bundle engine can tell if a sale is active
    ...(sku.sale_price != null ? { unitPrice: sku.selling_price } : {}),
    quantity: 1,
    variantLabel: sku.variant_label ?? undefined,
    spotKind,
  };
}

export function VariantToggle({ variants, lensSku }: { variants: SpotSku[]; lensSku: SpotSku | null }) {
  const { addSku, openCart } = useCart();
  const [selectedId, setSelectedId] = useState(variants[0].id);
  const [addLens, setAddLens] = useState(false);
  const [added, setAdded] = useState(false);

  const selected = variants.find(v => v.id === selectedId)!;
  const glassPriceKr = (selected.sale_price ?? selected.selling_price) / 100;

  const lensFullKr    = lensSku ? lensSku.selling_price / 100 : 0;
  const lensBundleKr  = Math.round(lensFullKr / 2);
  const totalKr       = glassPriceKr + (addLens && lensSku ? lensBundleKr : 0);

  function handleAddToCart() {
    addSku(skuToCartItem(selected));
    if (addLens && lensSku) {
      addSku(skuToCartItem(lensSku));
    }
    openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
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
        className={`w-full rounded-xl py-4 text-lg font-medium transition ${added ? "bg-[#1A3D2E] text-white" : "bg-black text-white hover:bg-black/90"}`}
      >
        {added ? "Lagt i kurv" : `Læg i kurv — ${totalKr.toFixed(0)} kr`}
      </button>
    </div>
  );
}
