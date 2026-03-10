import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/shopify/types";
import { Price } from "@/components/ui/price";
import { ConditionBadge } from "@/components/ui/condition-badge";

function getConditionGrade(tags: string[]): "A" | "B" | "C" | null {
  const lower = tags.map((t) => t.toLowerCase());
  if (lower.includes("grade-a")) return "A";
  if (lower.includes("grade-b")) return "B";
  if (lower.includes("grade-c")) return "C";
  return null;
}

type ProductCardProps = {
  product: Product;
  collectionHandle?: string;
};

function getSavingsPercent(price: string, compareAt: string | null): number | null {
  if (!compareAt) return null;
  const current = parseFloat(price);
  const original = parseFloat(compareAt);
  if (original <= current) return null;
  return Math.round(((original - current) / original) * 100);
}

export function ProductCard({
  product,
  collectionHandle = "iphones",
}: ProductCardProps) {
  const grade = getConditionGrade(product.tags);
  const image = product.images[0];
  const { minVariantPrice } = product.priceRange;
  const compareAt = product.variants[0]?.compareAtPrice;
  const savingsPercent = getSavingsPercent(minVariantPrice.amount, compareAt?.amount ?? null);

  return (
    <Link
      href={`/${collectionHandle}/${product.handle}`}
      className="group flex flex-col rounded-[16px] border border-sand bg-white transition-shadow hover:shadow-md"
    >
      {/* Image area */}
      <div className="relative aspect-square overflow-hidden rounded-t-[16px] bg-cream">
        {grade && (
          <div className="absolute top-3 left-3 z-10">
            <ConditionBadge grade={grade} />
          </div>
        )}
        {savingsPercent && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center rounded-full bg-green-eco px-2.5 py-1 text-xs font-bold text-white">
              -{savingsPercent}%
            </span>
          </div>
        )}
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.title}
            width={image.width}
            height={image.height}
            className="h-full w-full object-contain p-4 transition-transform group-hover:scale-105"
            sizes="(min-width: 768px) 25vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray">
            Intet billede
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-semibold text-charcoal">
          {product.title}
        </h3>
        <p className="mt-0.5 text-xs text-gray">{product.vendor}</p>
        <div className="mt-auto pt-3">
          <Price
            amount={minVariantPrice.amount}
            currencyCode={minVariantPrice.currencyCode}
            compareAt={compareAt?.amount ?? null}
          />
        </div>
      </div>
    </Link>
  );
}
