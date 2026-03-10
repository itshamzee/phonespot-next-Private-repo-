import Link from "next/link";
import { getCollectionProducts } from "@/lib/shopify/client";
import { ProductCard } from "@/components/product/product-card";

export async function FeaturedProducts() {
  let products;

  try {
    const collection = await getCollectionProducts("iphones");
    products = collection?.products.slice(0, 8) ?? [];
  } catch {
    // Shopify API not configured or unreachable — fail gracefully
    return null;
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
      <div className="mb-8 flex items-baseline justify-between">
        <h2 className="font-display text-3xl font-bold italic text-charcoal">
          Popul&aelig;re produkter
        </h2>
        <Link
          href="/iphones"
          className="font-semibold text-green-eco transition-opacity hover:opacity-80"
        >
          Se alle &rarr;
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            collectionHandle="iphones"
          />
        ))}
      </div>
    </section>
  );
}
