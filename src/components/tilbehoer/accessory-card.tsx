"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import type { PublicAccessory } from "@/lib/product/public-accessory";
import { listPriceSaving } from "@/lib/product/list-price";
type AccessoryCardProps = Omit<PublicAccessory, "created_at"> & {
  /** Dokumenteret vejledende pris i kr. (kun ægte mærkevarer på lagersalg). */
  listPriceKr?: number | null;
};
export function AccessoryCard({id,name,slug,category,price,sale_price,image_url,store_stock,availability,brand,compatible_models,spotKind,lagersalg,listPriceKr,black_november}: AccessoryCardProps) {
  const [added,setAdded]=useState(false);
  const confirmationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (confirmationTimer.current !== null) clearTimeout(confirmationTimer.current);
  }, []);
  const {addSku,openCart}=useCart();
  const isOnSale=sale_price != null && sale_price < price;
  const effectivePrice=isOnSale ? sale_price : price;
  const saving=listPriceSaving(listPriceKr ?? null, effectivePrice);
  const href=slug ? `/tilbehoer/${category}/${slug}` : null;
  const canBuy=availability === "in_stock" || availability === "orderable";
  const stockLabel=availability === "in_stock" ? (store_stock ?? 0)>0 ? "På lager i butik" : "På lager" : availability === "orderable" ? "Sendes 1–3 hverdage" : availability === "out_of_stock" ? "Udsolgt" : "Lagerstatus ukendt";
  function add() {
    if (!canBuy || added) return;
    addSku({type:"sku_product",skuProductId:id,title:name,price:effectivePrice,quantity:1,image:image_url ?? null,...(spotKind ? {spotKind,...(isOnSale ? {unitPrice:price} : {})} : {}),...(lagersalg ? {lagersalg:true as const} : {})});
    openCart();setAdded(true);
    confirmationTimer.current = setTimeout(() => {
      setAdded(false);
      confirmationTimer.current = null;
    }, 1800);
  }
  // eslint-disable-next-line @next/next/no-img-element
  const photo=image_url ? <img src={image_url} alt={name} className="h-full w-full object-contain p-4 sm:p-7" loading="lazy"/> : <span className="text-sm text-charcoal/50">Billede mangler</span>;
  const tile="relative flex aspect-square items-center justify-center rounded-2xl bg-[#f5f5f2]";
  // Tilføjet-tilstanden må ikke ligne "udsolgt": den beholder farven og er kun låst for dobbeltklik.
  const buttonClass = added
    ? "bg-[#1A3D2E] text-white"
    : canBuy
      ? "bg-[#EDF2EE] text-[#1A3D2E] hover:bg-[#1A3D2E] hover:text-white"
      : "cursor-not-allowed bg-sand text-charcoal/55";
  return <article className="flex h-full flex-col font-body">
    {/* Product photographs are shown whole, without substitute device artwork. */}
    {href ? <Link href={href} className={tile}>{photo}</Link> : <div className={tile}>{photo}</div>}
    <div className="flex flex-1 flex-col px-1 pt-3 sm:pt-4">
      <p className="mb-1.5 min-h-4 text-xs text-charcoal/60">{brand}</p>
      <h2 className="min-h-12 text-sm sm:text-base font-semibold leading-5 sm:leading-6 text-charcoal">{href ? <Link href={href}>{name}</Link> : name}</h2>
      {compatible_models && compatible_models.length > 0 && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-charcoal/65">Passer til {compatible_models.join(", ")}</p>}
      <div className="mt-auto pt-4">
        <div className="flex min-h-8 flex-wrap items-baseline gap-x-2">
          <p className="text-xl font-bold tabular-nums text-charcoal">{(effectivePrice/100).toLocaleString("da-DK")} kr.</p>
          {isOnSale && <s className="text-sm tabular-nums text-charcoal/50">{(price/100).toLocaleString("da-DK")} kr.</s>}
        </div>
        {black_november && <p className="mt-1 text-xs font-semibold text-charcoal">Black November-pris</p>}
        {saving != null && <p className="mt-1 text-xs text-charcoal/55">Vejl. pris {listPriceKr} kr.</p>}
        <p className="mt-1.5 min-h-5 text-xs text-charcoal/65">{stockLabel}</p>
        <button type="button" disabled={!canBuy} aria-disabled={added || undefined} onClick={add} className={`mt-3 min-h-11 w-full rounded-lg px-3 py-3 text-sm font-semibold transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${buttonClass}`}>{added ? "Tilføjet til kurv" : canBuy ? "Tilføj til kurv" : stockLabel}</button>
      </div>
    </div>
  </article>;
}
