import { Suspense } from "react";
import { PromoStrip } from "@/components/home/promo-strip";
import { HeroBento } from "@/components/home/hero-bento";
import { CategoriesBento } from "@/components/home/categories-bento";
import { StoresBand } from "@/components/home/stores-band";
import { RefurbishProcess } from "@/components/home/refurbish-process";
import { ShopTabs } from "@/components/home/shop-tabs";
import { Bestsellers } from "@/components/home/bestsellers";
import { TrustpilotReviews } from "@/components/trustpilot/trustpilot-reviews";
import { HomepageFAQ } from "@/components/home/homepage-faq";

export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<div className="h-9 bg-charcoal" />}>
        <PromoStrip />
      </Suspense>

      <Suspense fallback={<div className="min-h-[500px] bg-warm-white" />}>
        <HeroBento />
      </Suspense>

      <CategoriesBento />

      <Suspense fallback={<div className="min-h-[400px] bg-charcoal" />}>
        <StoresBand />
      </Suspense>

      <RefurbishProcess />

      <ShopTabs />

      <Bestsellers />

      <Suspense fallback={null}>
        <TrustpilotReviews />
      </Suspense>

      <HomepageFAQ />
    </>
  );
}
