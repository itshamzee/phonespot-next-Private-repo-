import { Suspense } from "react";
import { Hero } from "@/components/home/hero";
import { CategoryBlocks } from "@/components/home/category-blocks";
import { FeaturedProducts } from "@/components/home/featured-products";
import { TrustSection } from "@/components/home/trust-section";
import { OutletTeaser } from "@/components/home/outlet-teaser";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryBlocks />
      <Suspense
        fallback={
          <div className="px-4 py-16 text-center text-gray">
            Indl&aelig;ser produkter...
          </div>
        }
      >
        <FeaturedProducts />
      </Suspense>
      <TrustSection />
      <OutletTeaser />
    </>
  );
}
