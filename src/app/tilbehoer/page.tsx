import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { HubPageClient } from "@/components/tilbehoer/hub-page-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCESSORY_CATEGORY_TO_SLUG } from "@/lib/tilbehoer-config";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tilbehør til iPhone, iPad & Samsung | PhoneSpot",
  description:
    "Covers, beskyttelsesglas, opladere og kabler til telefon, tablet og computer. Se modeller, priser og lagerstatus hos PhoneSpot.",
  alternates: { canonical: "https://phonespot.dk/tilbehoer" },
  openGraph: {
    title: "Tilbehør til iPhone, iPad & Samsung | PhoneSpot",
    description:
      "Covers, beskyttelsesglas, opladere, kabler og tilbehør til din telefon og tablet.",
    url: "https://phonespot.dk/tilbehoer",
  },
};

export default async function TilbehoerPage() {
  const { data } = await createAdminClient().from("sku_products")
    .select("subcategory, images").eq("category", "accessory")
    .eq("status", "published").eq("is_active", true)
    .order("created_at", { ascending: false }).limit(200);
  const categoryImages: Record<string, string> = {};
  for (const product of data ?? []) {
    const category = ACCESSORY_CATEGORY_TO_SLUG[product.subcategory ?? ""];
    const photo = Array.isArray(product.images) ? product.images.find((image: unknown) => typeof image === "string" && image.length > 0) : undefined;
    if (category && photo && !categoryImages[category]) categoryImages[category] = photo;
  }
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      { "@type": "ListItem", position: 2, name: "Tilbehør", item: "https://phonespot.dk/tilbehoer" },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <HubPageClient categoryImages={categoryImages} />
    </>
  );
}
