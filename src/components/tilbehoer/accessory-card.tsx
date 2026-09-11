"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import type { PublicAccessory } from "@/lib/product/public-accessory";
type AccessoryCardProps = Omit<PublicAccessory, "created_at">;
export function AccessoryCard({id,name,slug,category,price,sale_price,image_url,store_stock,availability,brand}: AccessoryCardProps) {
  const [added,setAdded]=useState(false);
  const confirmationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (confirmationTimer.current !== null) clearTimeout(confirmationTimer.current);
  }, []);
  const {addSku,openCart}=useCart();
  const isOnSale=sale_price != null && sale_price < price;
  const effectivePrice=isOnSale ? sale_price : price;
  const href=slug ? `/tilbehoer/${category}/${slug}` : null;
  const canBuy=availability === "in_stock" || availability === "orderable";
  const stockLabel=availability === "in_stock" ? (store_stock ?? 0)>0 ? "På lager i butik" : "På lager" : availability === "orderable" ? "Kan bestilles" : availability === "out_of_stock" ? "Udsolgt" : "Lagerstatus ukendt";
  function add() {
    if (!canBuy || added) return;
    addSku({type:"sku_product",skuProductId:id,title:name,price:effectivePrice,quantity:1,image:image_url ?? null});
    openCart();setAdded(true);
    confirmationTimer.current = setTimeout(() => {
      setAdded(false);
      confirmationTimer.current = null;
    }, 1800);
  }
  // eslint-disable-next-line @next/next/no-img-element
  const photo=image_url ? <img src={image_url} alt={name} className="h-full w-full object-contain p-7" loading="lazy"/> : <span className="text-sm text-charcoal/50">Billede mangler</span>;
  return <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-sand bg-white font-body">
    {/* Product photographs are shown whole, without substitute device artwork. */}
    {href ? <Link href={href} className="flex aspect-square items-center justify-center bg-[#f5f5f2]">{photo}</Link> : <div className="flex aspect-square items-center justify-center bg-[#f5f5f2]">{photo}</div>}
    <div className="flex flex-1 flex-col p-4 sm:p-5">
      <p className="mb-2 min-h-4 text-xs text-charcoal/60">{brand}</p>
      <h2 className="min-h-12 text-base font-semibold leading-6 text-charcoal">{href ? <Link href={href}>{name}</Link> : name}</h2>
      <div className="mt-auto pt-5">
        <div className="flex min-h-8 flex-wrap items-baseline gap-x-2">
          <p className="text-xl font-bold text-charcoal">{(effectivePrice/100).toLocaleString("da-DK")} kr.</p>
          {isOnSale && <s className="text-sm text-charcoal/50">{(price/100).toLocaleString("da-DK")} kr.</s>}
        </div>
        <p className="mt-2 min-h-5 text-xs text-charcoal/65">{stockLabel}</p>
        <button type="button" disabled={!canBuy || added} onClick={add} className="mt-4 min-h-11 w-full rounded-lg bg-[#1A3D2E] px-3 py-3 text-sm font-semibold text-white hover:bg-[#244f3c] disabled:cursor-not-allowed disabled:bg-sand disabled:text-charcoal/55">{added ? "Tilføjet til kurv" : canBuy ? "Tilføj til kurv" : stockLabel}</button>
        <div className="mt-3 min-h-5 text-center text-xs font-medium text-charcoal/70">{href && <Link href={href} className="underline underline-offset-4">Se detaljer og kompatibilitet</Link>}</div>
      </div>
    </div>
  </article>;
}
