import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getTemplateBySlug,
  getAvailableDevices,
  getPublishedSkuProducts,
} from "@/lib/supabase/product-queries";
import { DeviceDetail } from "@/components/product/device-detail";
import { JsonLd } from "@/components/seo/json-ld";
import { TrustBar } from "@/components/ui/trust-bar";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const template = await getTemplateBySlug(slug);
  if (!template) return { title: "Produkt ikke fundet" };

  const title = template.meta_title ?? `${template.display_name} - Refurbished | PhoneSpot`;
  const description =
    template.meta_description ??
    `Køb refurbished ${template.display_name} med 36 måneders garanti. Testet med 30+ kontroller og klar til brug fra dag et.`;

  return {
    title,
    description,
    alternates: { canonical: `https://phonespot.dk/refurbished/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://phonespot.dk/refurbished/${slug}`,
      images: template.images[0] ? [{ url: template.images[0] }] : [],
    },
  };
}

export default async function RefurbishedProductPage({ params }: Props) {
  const { slug } = await params;

  const template = await getTemplateBySlug(slug);

  if (!template) notFound();

  const [availableDevices, accessories] = await Promise.all([
    getAvailableDevices(template.id),
    getPublishedSkuProducts(undefined, template.id),
  ]);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      {
        "@type": "ListItem",
        position: 2,
        name: template.category === "iphone"
          ? "Refurbished iPhones"
          : template.category === "ipad"
          ? "Refurbished iPads"
          : template.category === "laptop"
          ? "Refurbished Bærbare"
          : "Refurbished Smartphones",
        item: `https://phonespot.dk/${
          template.category === "iphone"
            ? "iphones"
            : template.category === "ipad"
            ? "ipads"
            : template.category === "laptop"
            ? "baerbare"
            : "smartphones"
        }`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: template.display_name,
        item: `https://phonespot.dk/refurbished/${slug}`,
      },
    ],
  };

  // Build product schema for SEO
  const minPrice = availableDevices.length > 0
    ? Math.min(...availableDevices.map((d) => d.selling_price ?? 0).filter(Boolean))
    : template.base_price_a;

  const productJsonLd = minPrice
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: template.display_name,
        description: template.description ?? undefined,
        image: template.images,
        brand: {
          "@type": "Brand",
          name: template.brand,
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "DKK",
          price: (minPrice / 100).toFixed(0),
          availability:
            availableDevices.length > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          seller: { "@type": "Organization", name: "PhoneSpot" },
        },
      }
    : null;

  const categoryHref =
    template.category === "iphone"
      ? "/iphones"
      : template.category === "ipad"
      ? "/ipads"
      : template.category === "laptop"
      ? "/baerbare"
      : template.category === "smartwatch"
      ? "/smartwatches"
      : "/smartphones";

  const categoryLabel =
    template.category === "iphone"
      ? "iPhones"
      : template.category === "ipad"
      ? "iPads"
      : template.category === "laptop"
      ? "Bærbare"
      : template.category === "smartwatch"
      ? "Apple Watch"
      : "Smartphones";

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {productJsonLd && <JsonLd data={productJsonLd} />}

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-charcoal/50">
          <Link href="/" className="hover:text-charcoal">
            Forside
          </Link>
          <span>/</span>
          <Link href={categoryHref} className="hover:text-charcoal">
            {categoryLabel}
          </Link>
          <span>/</span>
          <span className="text-charcoal">{template.display_name}</span>
        </nav>

        <DeviceDetail
          template={template}
          devices={availableDevices}
          accessories={accessories}
        />

        {/* Trust bar */}
        <div className="mt-16">
          <TrustBar />
        </div>
      </div>
    </>
  );
}
