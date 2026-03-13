import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSkuProductBySlug } from "@/lib/supabase/product-queries";
import { getCategoryConfig } from "@/lib/tilbehoer-config";
import { AccessoryDetail } from "@/components/product/accessory-detail";
import { JsonLd } from "@/components/seo/json-ld";
import { TrustBar } from "@/components/ui/trust-bar";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, category } = await params;
  const product = await getSkuProductBySlug(slug);
  if (!product) return { title: "Produkt ikke fundet" };

  const catConfig = getCategoryConfig(category);
  const title = `${product.title} | PhoneSpot`;
  const description =
    product.short_description ??
    `Køb ${product.title} hos PhoneSpot. ${catConfig?.description ?? "Hurtig levering og skarpe priser."}`;

  return {
    title,
    description,
    alternates: { canonical: `https://phonespot.dk/tilbehoer/${category}/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://phonespot.dk/tilbehoer/${category}/${slug}`,
      images: product.images[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

export default async function AccessoryDetailPage({ params }: Props) {
  const { category, slug } = await params;

  const product = await getSkuProductBySlug(slug);
  if (!product) notFound();

  const catConfig = getCategoryConfig(category);

  // No compatible_devices field on SkuProduct yet — use empty list for now
  const compatibleDevices: string[] = [];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      { "@type": "ListItem", position: 2, name: "Tilbehør", item: "https://phonespot.dk/tilbehoer" },
      {
        "@type": "ListItem",
        position: 3,
        name: catConfig?.label ?? category,
        item: `https://phonespot.dk/tilbehoer/${category}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.title,
        item: `https://phonespot.dk/tilbehoer/${category}/${slug}`,
      },
    ],
  };

  const price = product.sale_price ?? product.selling_price;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? product.short_description ?? undefined,
    image: product.images,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "DKK",
      price: (price / 100).toFixed(0),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "PhoneSpot" },
    },
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={productJsonLd} />

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-charcoal/50">
          <Link href="/" className="hover:text-charcoal">
            Forside
          </Link>
          <span>/</span>
          <Link href="/tilbehoer" className="hover:text-charcoal">
            Tilbehør
          </Link>
          <span>/</span>
          <Link href={`/tilbehoer/${category}`} className="hover:text-charcoal">
            {catConfig?.label ?? category}
          </Link>
          <span>/</span>
          <span className="text-charcoal">{product.title}</span>
        </nav>

        <AccessoryDetail product={product} compatibleDevices={compatibleDevices} />

        {/* Trust bar */}
        <div className="mt-16">
          <TrustBar />
        </div>
      </div>
    </>
  );
}
