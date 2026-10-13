"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import type { PublicAccessory } from "@/lib/product/public-accessory";
import styles from "./model-sections.module.css";

/**
 * Tilbehør der passer til modellen, vist som rækker under reparationerne.
 * Kun glas og covers med kompatibilitetsdata kommer med, så kunden aldrig
 * får tilbudt noget, der ikke passer til telefonen.
 */
export function RepairUpsell({
  modelName,
  items,
  allHref,
}: {
  modelName: string;
  items: PublicAccessory[];
  allHref: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className={styles.upsell} aria-labelledby="tilbehoer-til-model">
      <div>
        <h2 id="tilbehoer-til-model">Beskyt den, når den er som ny igen.</h2>
        <p>
          Covers og beskyttelsesglas, der passer til {modelName}. Et
          almindeligt beskyttelsesglas kan du også lægge på selve reparationen
          for 99 kr., så sætter vi det på med det samme.
        </p>
        <Link href={allHref} className={styles.textLink}>
          Se alt tilbehør til {modelName}
        </Link>
      </div>
      <ul className={styles.upsellRows}>
        {items.map((item) => (
          <UpsellRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function UpsellRow({ item }: { item: PublicAccessory }) {
  const { addSku, openCart } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  const isOnSale = item.sale_price != null && item.sale_price < item.price;
  const price = isOnSale ? item.sale_price! : item.price;
  const href = item.slug ? `/tilbehoer/${item.category}/${item.slug}` : null;
  const stock =
    (item.store_stock ?? 0) > 0
      ? "På lager i butik"
      : item.availability === "in_stock"
        ? "På lager"
        : "Kan bestilles";

  function add() {
    if (added) return;
    addSku({
      type: "sku_product",
      skuProductId: item.id,
      title: item.name,
      price,
      quantity: 1,
      image: item.image_url ?? null,
      ...(item.spotKind
        ? { spotKind: item.spotKind, ...(isOnSale ? { unitPrice: item.price } : {}) }
        : {}),
    });
    openCart();
    setAdded(true);
    timer.current = setTimeout(() => {
      setAdded(false);
      timer.current = null;
    }, 1800);
  }

  const kr = (oere: number) => (oere / 100).toLocaleString("da-DK") + " kr.";

  return (
    <li>
      <div className={styles.upsellPhoto}>
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="" loading="lazy" />
        ) : null}
      </div>
      <div className={styles.upsellText}>
        {href ? <Link href={href}>{item.name}</Link> : <span>{item.name}</span>}
        <small>{stock}</small>
      </div>
      <div className={styles.upsellBuy}>
        <strong>
          {kr(price)}
          {isOnSale && <s>{kr(item.price)}</s>}
        </strong>
        <button type="button" onClick={add} disabled={added} aria-label={"Læg " + item.name + " i kurven"}>
          {added ? "Lagt i kurven" : "Læg i kurv"}
        </button>
      </div>
    </li>
  );
}
