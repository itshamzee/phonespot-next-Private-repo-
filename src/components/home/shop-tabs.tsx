"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { StorefrontIcon, type StorefrontIconKind } from "@/components/ui/storefront-icon";
import styles from "./storefront.module.css";

import type { HomepageProduct } from "@/lib/home/homepage-products";

const categories: { label: string; name: string; key: string; href: string; icon: StorefrontIconKind }[] = [
  { label: "iPhones", name: "iPhones", key: "iphones", href: "/iphones", icon: "phone" },
  { label: "Bærbare", name: "bærbare", key: "laptops", href: "/baerbare", icon: "laptop" },
  { label: "iPads", name: "iPads", key: "ipads", href: "/ipads", icon: "tablet" },
  { label: "Smartwatches", name: "smartwatches", key: "smartwatches", href: "/smartwatches", icon: "watch" },
];
const links: { label: string; href: string; icon: StorefrontIconKind }[] = [
  { label: "Smartphones", href: "/smartphones", icon: "phone" },
  { label: "Tilbehør", href: "/tilbehoer", icon: "cable" },
];

function ProductCard({ product }: { product: HomepageProduct }) {
  const [failedImage, setFailedImage] = useState(false);
  const isAccessory = product.category === "accessory";
  const specs = product.specifications ?? {};
  const descriptor = product.category === "laptop" || product.category === "macbook"
    ? [specs.ram && `${specs.ram} RAM`, specs.storage].filter(Boolean).join(" · ")
    : product.category === "smartwatch"
      ? [specs["størrelse"], specs.connectivity].filter(Boolean).join(" · ")
      : isAccessory ? "Se produktets detaljer" : "Vælg lagerplads og stand";

  return <article className={styles.product}>
    <Link href={product.href}>
      <div className={styles["product-photo"]}>
        <span className={styles["product-tag"]}>{isAccessory ? "Tilbehør" : "Refurbished"}</span>
        {product.image && !failedImage
          // API images can originate from several verified product storage hosts.
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={product.image} alt={product.title} loading="lazy" onError={() => setFailedImage(true)} />
          : <span className={styles["image-fallback"]}>Billede ikke tilgængeligt</span>}
      </div>
      <div className={styles["product-body"]}>
        <h3>{product.title.replace(/^Apple /, "")}</h3>
        <p className={styles.descriptor}>{descriptor || "Se specifikationer og stand"}</p>
        <div className={styles.price}>{product.minPrice != null
          ? <><small>Fra</small>{new Intl.NumberFormat("da-DK", { maximumFractionDigits: 2 }).format(product.minPrice / 100)} kr.</>
          : "Se pris"}</div>
        {!product.inStock && <p className={styles["stock-status"]}>Ikke på lager</p>}
        <div className={styles["product-assurance"]}><StorefrontIcon kind="check" />{isAccessory ? "2 års reklamationsret" : "36 måneders garanti"}</div>
        <span className={styles.button}>{isAccessory ? "Se produktet" : "Se modellen"}<StorefrontIcon kind="arrow" /></span>
      </div>
    </Link>
  </article>;
}

const INITIAL_TAB = "iphones";

function usableProducts(data: HomepageProduct[]): HomepageProduct[] {
  return data.filter(item => item.slug?.trim() && item.href?.startsWith("/") && !item.href.startsWith("//")).slice(0, 3);
}

/** `initialProducts` is the first tab, rendered on the server by the homepage. */
export function ShopTabs({ initialProducts }: { initialProducts?: HomepageProduct[] } = {}) {
  const [activeKey, setActiveKey] = useState(INITIAL_TAB);
  const [products, setProducts] = useState<HomepageProduct[]>(() => usableProducts(initialProducts ?? []));
  const [loading, setLoading] = useState(!initialProducts?.length);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Skip only the very first fetch when the server already sent the first tab;
  // coming back to that tab later must load it again.
  const skipFirstFetch = useRef(Boolean(initialProducts?.length));
  const category = categories.find(item => item.key === activeKey)!;

  useEffect(() => {
    // The server already rendered the first tab; only fetch on a tab switch or retry.
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    const controller = new AbortController();
    let current = true;
    async function load() {
      setLoading(true);
      setError(false);
      setProducts([]);
      try {
        const response = await fetch(`/api/homepage-products?tab=${activeKey}&limit=8`, { signal: controller.signal });
        if (!response.ok) throw new Error("Catalog request failed");
        const data: HomepageProduct[] = await response.json();
        if (!Array.isArray(data)) throw new Error("Invalid catalog response");
        if (current) setProducts(usableProducts(data));
      } catch {
        if (current) setError(true);
      } finally {
        if (current) setLoading(false);
      }
    }
    void load();
    // Also guard state after cancellation: some fetch adapters still resolve aborted requests.
    return () => { current = false; controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, attempt]);

  return <section className={styles.shop} id="udvalg">
    <div className={styles["section-head"]}>
      <div><span className={styles.eyebrow}>Find det, der passer til dig</span><h2>Din næste enhed</h2></div>
      <Link className={styles.textlink} href={category.href}>Se alle {category.name}<StorefrontIcon kind="arrow" /></Link>
    </div>
    <div className={styles["shop-layout"]}>
      <nav className={styles.departments} aria-label="Vælg produkttype">
        {categories.map(item => <button key={item.key} type="button" onClick={() => setActiveKey(item.key)} aria-pressed={activeKey === item.key} aria-controls="homepage-products"><StorefrontIcon kind={item.icon} /><span>{item.label}</span><StorefrontIcon kind="arrow" /></button>)}
        {links.map(item => <Link key={item.href} href={item.href}><StorefrontIcon kind={item.icon} /><span>{item.label}</span><StorefrontIcon kind="arrow" /></Link>)}
      </nav>
      <div id="homepage-products" role="region" aria-label={`Udvalg af ${category.name}`} aria-busy={loading} className={styles.products} style={{ "--product-count": Math.max(products.length, 1) } as CSSProperties}>
        {loading ? <div className={styles["catalog-state"]} role="status">Henter udvalget…</div>
          : error ? <div className={styles["catalog-state"]}><p role="alert">Vi kunne ikke hente udvalget. Prøv igen, eller gå til kategorien.</p><button className={styles.button} type="button" onClick={() => setAttempt(value => value + 1)}>Prøv igen</button></div>
          : products.length === 0 ? <div className={styles["catalog-state"]}><p>Der er ingen produkter at vise lige nu.</p><p>Se kategorien for mere information.</p></div>
          : products.map(product => <ProductCard key={`${activeKey}-${product.id}`} product={product} />)}
      </div>
    </div>
    <p className={styles["sr-only"]} role="status">{!loading && !error ? `${products.length} produkter i ${category.name} vises.` : ""}</p>
  </section>;
}
