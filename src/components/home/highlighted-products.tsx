import Link from "next/link";
import Image from "next/image";
import { getProduct } from "@/lib/shopify/client";
import { Price } from "@/components/ui/price";
import type { Product } from "@/lib/shopify/types";

type HighlightedItem = {
  handle: string;
  collection: string;
  badge?: string;
};

const HIGHLIGHTED: HighlightedItem[] = [
  {
    handle: "apple-watch-se-40-mm-2022",
    collection: "smartwatches",
    badge: "Spar 600 kr.",
  },
  {
    handle: "apple-watch-se-44-mm-2022",
    collection: "smartwatches",
    badge: "Spar 740 kr.",
  },
  {
    handle: "lenovo-thinkpad-t14-g4-i7-1365u-14",
    collection: "baerbare",
    badge: "Fabriksny",
  },
];

function HighlightedCard({
  product,
  collection,
  badge,
}: {
  product: Product;
  collection: string;
  badge?: string;
}) {
  const image = product.images[0];
  const { minVariantPrice } = product.priceRange;
  const compareAt = product.variants[0]?.compareAtPrice;

  return (
    <Link
      href={`/${collection}/${product.handle}`}
      className="group relative flex flex-col overflow-hidden rounded-[16px] border border-sand bg-white transition-shadow hover:shadow-lg"
    >
      {/* Badge */}
      {badge && (
        <div className="absolute left-3 top-3 z-10">
          <span className="inline-flex items-center bg-green-eco px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
            {badge}
          </span>
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-cream">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.title}
            width={image.width}
            height={image.height}
            className="h-full w-full object-contain p-6 transition-transform group-hover:scale-105"
            sizes="(min-width: 768px) 33vw, 100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray">
            Intet billede
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-display text-base font-bold text-charcoal sm:text-lg">
          {product.title}
        </h3>
        <p className="mt-0.5 text-xs text-gray">{product.vendor}</p>
        <div className="mt-auto pt-3">
          <Price
            amount={minVariantPrice.amount}
            currencyCode={minVariantPrice.currencyCode}
            compareAt={compareAt?.amount ?? null}
            className="text-lg"
          />
        </div>
      </div>
    </Link>
  );
}

export async function HighlightedProducts() {
  let products: { product: Product; collection: string; badge?: string }[];

  try {
    const results = await Promise.all(
      HIGHLIGHTED.map(async (item) => {
        const product = await getProduct(item.handle);
        return product
          ? { product, collection: item.collection, badge: item.badge }
          : null;
      }),
    );
    products = results.filter(Boolean) as {
      product: Product;
      collection: string;
      badge?: string;
    }[];
  } catch {
    return null;
  }

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
      <div className="mb-8 flex items-baseline justify-between">
        <h2 className="font-display text-3xl font-bold italic text-charcoal">
          Udvalgte tilbud
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
        {products.map(({ product, collection, badge }) => (
          <HighlightedCard
            key={product.id}
            product={product}
            collection={collection}
            badge={badge}
          />
        ))}
      </div>
    </section>
  );
}
