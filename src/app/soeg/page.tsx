import type { Metadata } from "next";
import Link from "next/link";
import { searchProducts } from "@/lib/supabase/product-queries";
import { templateToProduct, skuProductToProduct } from "@/lib/supabase/product-adapter";
import type { SkuProduct } from "@/lib/supabase/platform-types";
import type { Product } from "@/lib/shopify/types";
import { ProductCard } from "@/components/product/product-card";
import { ACCESSORY_CATEGORY_TO_SLUG } from "@/lib/tilbehoer-config";
import styles from "@/components/ui/information.module.css";

type SearchProps = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: SearchProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  return {
    title: query ? `Søg efter ${query} – PhoneSpot` : "Søg efter produkter | PhoneSpot",
    description: query ? `Søgeresultater for "${query}" hos PhoneSpot.` : "Søg efter iPhones, iPads, bærbare og tilbehør hos PhoneSpot.",
    alternates: { canonical: "https://phonespot.dk/soeg" },
    robots: { index: false, follow: true },
  };
}

// Device SKUs use the existing collection/product route, which resolves SKU
// products as well as templates. Accessory URLs use the shared DB mapping.
const deviceCollections: Record<string, string> = {
  iphone: "iphones", ipad: "ipads", tablet: "ipads", smartphone: "smartphones", laptop: "baerbare", smartwatch: "smartwatches",
};
function skuHref(sku: SkuProduct): string | null {
  if (!sku.slug) return null;
  const deviceCollection = deviceCollections[sku.category ?? ""];
  if (deviceCollection) return `/${deviceCollection}/${sku.slug}`;
  const category = ACCESSORY_CATEGORY_TO_SLUG[sku.subcategory ?? sku.category ?? "other"];
  return category ? `/tilbehoer/${category}/${sku.slug}` : `/tilbehor/${sku.slug}`;
}

export default async function SearchPage({ searchParams }: SearchProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  let results: { key: string; product: Product; href: string | null }[] = [];
  let failed = false;
  if (query) {
    try {
      const { templates, skuProducts } = await searchProducts(query);
      results = [
        ...templates.map((template) => ({ key: `template-${template.id}`, product: templateToProduct(template), href: `/refurbished/${template.slug}` })),
        ...skuProducts.map((sku) => ({ key: `sku-${sku.id}`, product: skuProductToProduct(sku), href: skuHref(sku) })),
      ];
    } catch {
      failed = true;
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <nav aria-label="Brødkrumme" className={styles.breadcrumb}><Link href="/">Forside</Link> / Søg</nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Find dit næste produkt</span>
          <h1>{query ? "Søgeresultater." : "Hvad leder du efter?"}</h1>
          <p className={styles.intro}>Søg i vores produkter. Leder du efter en reparation, kan du <Link href="/reparation" className={styles.textLink}>finde model og pris her</Link>.</p>
          <form action="/soeg" method="get" role="search" className={styles.searchForm}>
            <label htmlFor="search-input">Søg efter produkter</label>
            <div><input id="search-input" type="search" name="q" defaultValue={query} placeholder="Fx iPhone 13 eller oplader" /><button className={styles.button} type="submit">Søg</button></div>
          </form>
        </header>
        <section className={styles.section} aria-label="Søgeresultater">
          {failed ? (
            <div className={styles.notice}><div role="alert"><h2>Søgningen kunne ikke gennemføres</h2><p>Vi kunne ikke hente resultater for “{query}”. Prøv søgningen igen.</p></div><Link href={`/soeg?q=${encodeURIComponent(query)}`} className={styles.button}>Prøv igen</Link></div>
          ) : query ? (
            <>
              <p className="mb-6 text-sm text-[#626a65]">{results.length} {results.length === 1 ? "resultat" : "resultater"} for “{query}”</p>
              {results.length ? (
                <div className={styles.results}>{results.map(({ key, product, href }) => href ? <ProductCard key={key} product={product} href={href} /> : <article className={styles.panel} key={key}><h3>{product.title}</h3><p>Kontakt os for mere information om dette produkt.</p><Link href="/kontakt" className={styles.textLink}>Spørg til produktet →</Link></article>)}</div>
              ) : <div className={styles.notice}><h2>Ingen resultater for “{query}”</h2><p>Prøv et andet modelnavn eller et kortere søgeord. Du kan også se vores kategorier nedenfor.</p></div>}
            </>
          ) : <p className={styles.intro}>Skriv et modelnavn eller et produkt i feltet ovenfor, eller gå direkte til en kategori.</p>}
        </section>
        <nav className={styles.jumpLinks} aria-label="Produktkategorier"><Link href="/iphones" className={styles.textLink}>iPhones</Link><Link href="/ipads" className={styles.textLink}>iPads</Link><Link href="/baerbare" className={styles.textLink}>Bærbare</Link><Link href="/tilbehoer" className={styles.textLink}>Tilbehør</Link></nav>
      </div>
    </div>
  );
}
