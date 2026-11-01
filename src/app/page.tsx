import type { Metadata } from "next";
import { ShopTabs } from "@/components/home/shop-tabs";
import { StorefrontHero } from "@/components/home/storefront-hero";
import { StorefrontSections } from "@/components/home/storefront-sections";
import styles from "@/components/home/storefront.module.css";
import { getHomepageProducts } from "@/lib/home/homepage-products";
import { LagersalgHomeStrip } from "@/components/lagersalg/lagersalg-links";

// The first product tab is rendered on the server; refresh it every 5 minutes.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Brugte iPhones med garanti og reparation | PhoneSpot",
  description: "Køb en brugt iPhone, iPad eller bærbar med 36 måneders garanti, batteri min. 90 % og 30 dages returret. Reparation og opkøb i Vejle og Slagelse.",
  alternates: { canonical: "https://phonespot.dk" },
  openGraph: {
    title: "Brugte iPhones med garanti og reparation | PhoneSpot",
    description: "Brugte og refurbished enheder med 36 måneders garanti. Find din næste enhed, få hjælp til reparation, eller sælg din brugte elektronik.",
    url: "https://phonespot.dk",
    type: "website",
    locale: "da_DK",
    siteName: "PhoneSpot",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "PhoneSpot – refurbished elektronik og reparation" }],
  },
};

export default async function HomePage() {
  const initialProducts = await getHomepageProducts("iphones", 8).catch(() => []);
  return <div className={styles.surface}>
    <div className={`${styles.wrap} ${styles.intro}`}>
      <StorefrontHero />
      <ShopTabs initialProducts={initialProducts} />
      <LagersalgHomeStrip />
      <StorefrontSections />
    </div>
  </div>;
}
