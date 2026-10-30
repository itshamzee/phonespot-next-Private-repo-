"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { listPriceSaving } from "@/lib/product/list-price";
import type { OutletItem } from "./outlet-filter";
import { ColorDot } from "./color-dot";

const kr = (ore: number) => `${(ore / 100).toLocaleString("da-DK")} kr.`;

/** Produktkort til lagersalget: model (eller bærbar-størrelse for tasker) først, så kunden ser at varen passer, og læg i kurv direkte fra listen. */
export function OutletCard({ item, eager = false }: { item: OutletItem; eager?: boolean }) {
  const { addSku, openCart } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const href = item.slug ? `/tilbehoer/${item.category}/${item.slug}` : null;
  const canBuy = item.stock > 0 || item.orderable;
  const saving = listPriceSaving(item.listPriceKr, item.priceOre);
  // Tasker passer til en bærbar af en given størrelse, ikke til en telefonmodel.
  const fitsLabel =
    item.kind === "bag"
      ? item.laptopSize
        ? `bærbar op til ${item.laptopSize}`
        : ""
      : item.models.map((m) => m.label).join(", ");
  const typeText = item.kind === "bag" ? item.bagType ?? item.type : item.type;
  const stockLabel =
    item.stock > 0 ? (item.stock === 1 ? "1 stk. på lager" : "På lager") : item.orderable ? "Sendes 1-3 hverdage" : "Udsolgt";

  function add() {
    if (!canBuy || added) return;
    addSku({
      type: "sku_product",
      skuProductId: item.id,
      title: item.name,
      price: item.priceOre,
      quantity: 1,
      image: item.imageUrl,
      lagersalg: true,
    });
    openCart();
    setAdded(true);
    timer.current = setTimeout(() => {
      setAdded(false);
      timer.current = null;
    }, 2000);
  }

  const photo = item.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      alt={item.name}
      width={600}
      height={600}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      className="h-full w-full object-cover mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03]"
    />
  ) : (
    <span className="text-xs text-charcoal/50">Billede kommer</span>
  );

  return (
    <article className="group flex h-full flex-col">
      <div className="relative aspect-square overflow-hidden rounded-[8px] border border-[#d1ded4] bg-[#f2f6f3]">
        {href ? (
          <Link href={href} className="flex h-full w-full items-center justify-center" tabIndex={-1} aria-hidden>
            {photo}
          </Link>
        ) : (
          <div className="flex h-full w-full items-center justify-center">{photo}</div>
        )}
        {saving != null && item.brand && (
          <span className="absolute left-2 top-2 rounded-[6px] bg-white px-2 py-1 text-[11px] font-semibold text-[#1A3D2E] sm:left-3 sm:top-3">
            Ægte {item.brand}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3">
        {fitsLabel && <p className="flex items-start gap-1.5 text-[12px] font-semibold leading-4 text-[#1A3D2E] sm:text-[13px]">
          <svg aria-hidden viewBox="0 0 16 16" className="mt-px h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Passer til {fitsLabel}</span>
        </p>}
        <h3 className="mt-1.5 line-clamp-2 text-[14px] font-medium leading-5 text-charcoal sm:text-[15px]">
          {href ? (
            <Link href={href} className="hover:underline hover:underline-offset-4">
              {item.name}
            </Link>
          ) : (
            item.name
          )}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-[12px] text-charcoal/60 sm:text-[13px]">
          {item.color && <ColorDot color={item.color} />}
          <span>{item.color ? `${typeText}, ${item.color.toLowerCase()}` : typeText}</span>
        </p>

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[19px] font-bold tracking-tight text-charcoal sm:text-[21px]">{kr(item.priceOre)}</span>
            <span className="text-[12px] font-semibold text-[#1A3D2E]">3 for 2</span>
            {saving != null && <span className="text-[12px] text-charcoal/55">Vejl. pris {item.listPriceKr} kr.</span>}
          </div>
          <p className={`mt-1 flex items-center gap-1.5 text-[12px] ${canBuy ? "text-charcoal/70" : "text-charcoal/50"}`}>
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${item.stock > 0 ? "bg-[#2F8A57]" : canBuy ? "bg-[#C9A227]" : "bg-charcoal/30"}`} />
            {stockLabel}
          </p>
          <button
            type="button"
            onClick={add}
            disabled={!canBuy}
            aria-live="polite"
            className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[5px] text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3D2E] ${
              added
                ? "bg-[#EAF2ED] text-[#1A3D2E]"
                : canBuy
                  ? "bg-[#1A3D2E] text-white hover:bg-[#244f3c]"
                  : "cursor-not-allowed bg-sand text-charcoal/55"
            }`}
          >
            {added ? (
              <>
                <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Lagt i kurv
              </>
            ) : canBuy ? (
              "Læg i kurv"
            ) : (
              "Udsolgt"
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
