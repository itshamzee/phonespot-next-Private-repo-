import type { Metadata } from "next";
import { ShopTabs } from "@/components/home/shop-tabs";
import { StorefrontHero } from "@/components/home/storefront-hero";
import { StorefrontSections } from "@/components/home/storefront-sections";
import styles from "@/components/home/storefront.module.css";

export const metadata: Metadata = {
  title: "Refurbished iPhones, computere og reparation | PhoneSpot",
  description: "Køb kvalitetstestede iPhones, iPads og bærbare med 36 måneders garanti. Få din enhed repareret, eller sælg den til os. Online og i Vejle og Slagelse.",
  alternates: { canonical: "https://phonespot.dk" },
  openGraph: {
    title: "Refurbished elektronik og reparation | PhoneSpot",
    description: "Kvalitetstestede enheder med 36 måneders garanti. Find din næste enhed, få hjælp til reparation, eller sælg din brugte elektronik.",
    url: "https://phonespot.dk",
    type: "website",
    locale: "da_DK",
    siteName: "PhoneSpot",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "PhoneSpot – refurbished elektronik og reparation" }],
  },
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
