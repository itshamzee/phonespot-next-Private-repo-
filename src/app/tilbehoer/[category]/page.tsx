import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryConfig, getAllCategoryParams, SLUG_TO_ACCESSORY_CATEGORIES } from "@/lib/tilbehoer-config";
import { TilbehoerCategoryClient } from "@/components/tilbehoer/tilbehoer-category-client";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/tilbehoer/breadcrumb";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamicParams = true;
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getAllCategoryParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) return { title: "Ikke fundet" };

  const title = `${config.label} til iPhone & Samsung | PhoneSpot`;
  const description = config.description;

  return {
    title,
    description,
    alternates: { canonical: `https://phonespot.dk/tilbehoer/${category}` },
    openGraph: {
      title,
      description,
      url: `https://phonespot.dk/tilbehoer/${category}`,
    },
  };
}

async function getAccessoryCount(categorySlug: string): Promise<number> {
  try {
    const supabase = createAdminClient();
    const dbCategories = SLUG_TO_ACCESSORY_CATEGORIES[categorySlug] ?? [categorySlug];

    const { count, error } = await supabase
      .from("sku_products")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("is_active", true)
      .eq("category", "accessory")
      .in("subcategory", dbCategories);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function TilbehoerCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) notFound();

  const initialCount = await getAccessoryCount(category);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      { "@type": "ListItem", position: 2, name: "Tilbehør", item: "https://phonespot.dk/tilbehoer" },
      {
        "@type": "ListItem",
        position: 3,
        name: config.label,
        item: `https://phonespot.dk/tilbehoer/${category}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />

      <div className="mx-auto max-w-7xl px-4 pt-4">
        <Breadcrumb
          items={[
            { label: "Tilbehør", href: "/tilbehoer" },
            { label: config.label },
          ]}
        />
      </div>

      <TilbehoerCategoryClient category={config} initialCount={initialCount} />
    </>
  );
}
