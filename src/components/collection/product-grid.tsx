import type { Product } from "@/lib/medusa/types";
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product, index) => (
        <FadeIn key={product.id} delay={index * 0.05}>
          <ProductCard
            product={product}
            collectionHandle={collectionHandle}
          />
        </FadeIn>
      ))}
    </div>
  );
}
