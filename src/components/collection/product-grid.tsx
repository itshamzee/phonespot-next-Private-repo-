import type { Product } from "@/lib/shopify/types";
import { ProductCard } from "@/components/product/product-card";
import { FadeIn } from "@/components/ui/fade-in";

type ProductGridProps = {
  products: Product[];
  collectionHandle: string;
};

export function ProductGrid({ products, collectionHandle }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray">Ingen produkter fundet i denne kategori.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-5">
      {products.map((product, index) => (
        <FadeIn key={product.id} delay={index * 0.05} className="h-full">
          <ProductCard
            product={product}
            collectionHandle={collectionHandle}
          />
        </FadeIn>
      ))}
    </div>
  );
}
