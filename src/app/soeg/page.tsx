import type { Metadata } from "next";
import { searchProducts } from "@/lib/supabase/product-queries";
import { templateToProduct, skuProductToProduct } from "@/lib/supabase/product-adapter";
import { ProductGrid } from "@/components/collection/product-grid";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return {
      title: "Søg - PhoneSpot",
      description:
        "Søg efter brugte iPhones, iPads og tilbehør hos PhoneSpot.",
    };
  }

  return {
    title: `Søg efter ${query} - PhoneSpot`,
    description: `Søgeresultater for "${query}" hos PhoneSpot.`,
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let products: import("@/lib/shopify/types").Product[] = [];
  try {
    if (query) {
      const { templates, skuProducts } = await searchProducts(query);
      products = [
        ...templates.map(templateToProduct),
        ...skuProducts.map(skuProductToProduct),
      ];
    }
  } catch {
    products = [];
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      {/* Search form */}
      <div className="mx-auto mb-10 max-w-2xl">
        <form action="/soeg" method="get">
          <label htmlFor="search-input" className="sr-only">
            Søg
          </label>
          <input
            id="search-input"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Søg efter produkter..."
            autoFocus
            className="w-full rounded-full border border-sand bg-white px-6 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:ring-2 focus:ring-green-eco/20 focus:outline-none"
          />
        </form>
      </div>

      {/* Results heading + grid */}
      {query ? (
        <>
          <h1 className="mb-8 font-display text-3xl md:text-4xl font-extrabold italic text-charcoal">
            Søgeresultater for &lsquo;{query}&rsquo;
          </h1>
          {products.length > 0 ? (
            <ProductGrid products={products} collectionHandle="soeg" />
          ) : (
            <div className="py-16 text-center">
              <p className="text-lg text-gray">
                Ingen produkter fundet for &lsquo;{query}&rsquo;.
              </p>
              <p className="mt-2 text-gray">
                Prøv at søge efter noget andet.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="py-16 text-center">
          <h1 className="mb-4 font-display text-3xl md:text-4xl font-extrabold italic text-charcoal">
            Søg
          </h1>
          <p className="text-lg text-gray">
            Indtast et søgeord ovenfor for at finde produkter.
          </p>
        </div>
      )}
    </section>
  );
}
