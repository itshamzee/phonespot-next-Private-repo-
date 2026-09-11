import type { Metadata } from "next";
import { ShopTabs } from "@/components/home/shop-tabs";
import { StorefrontHero } from "@/components/home/storefront-hero";
import { StorefrontSections } from "@/components/home/storefront-sections";
import styles from "@/components/home/storefront.module.css";

export const metadata: Metadata = {
  alternates: { canonical: "https://phonespot.dk" },
};

export default function HomePage() {
  return <div className={styles.surface}>
    <div className={`${styles.wrap} ${styles.intro}`}>
      <StorefrontHero />
      <ShopTabs />
      <StorefrontSections />
    </div>
  </div>;
}
