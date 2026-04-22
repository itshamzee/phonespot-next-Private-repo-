import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { TILBEHOER_DEVICES, SPOT_HUB_TILES } from "@/lib/tilbehoer-config";
import { fetchActiveSpotSkus, groupByVariantGroup, findVariantGroupForModel } from "@/lib/spot/queries";
import { JsonLd } from "@/components/seo/json-ld";
import { VariantToggle } from "./_components/VariantToggle";

export async function generateMetadata({ params }: { params: Promise<{ brand: string; model: string }> }): Promise<Metadata> {
  const { brand, model } = await params;
  const device = TILBEHOER_DEVICES.find(d => d.slug === model);
  if (!device) return {};
  return {
    title: `${device.label} beskyttelsesglas · 9H hærdet · PhoneSpot`,
    description: `Beskyttelsesglas til ${device.label}. Hærdet 9H, perfekt pasform, gratis montering i Vejle og Slagelse. Fra 199 kr — bestil i dag.`,
    alternates: { canonical: `/beskyttelsesglas/${brand}/${model}` },
    openGraph: { images: ["/spot/hero.png"] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ brand: string; model: string }> }) {
  const { brand, model } = await params;
  const device = TILBEHOER_DEVICES.find(d => d.slug === model);
  if (!device) notFound();

  const allSkus = await fetchActiveSpotSkus();
  const variantGroup = findVariantGroupForModel(allSkus, model);
  if (!variantGroup) notFound();

  const variants = groupByVariantGroup(allSkus).get(variantGroup)!;
  const primary = variants[0];
  const siblings = primary.compatible_models.filter(m => m !== model);

  const lowPrice  = Math.min(...variants.map(v => v.sale_price ?? v.selling_price));
  const highPrice = Math.max(...variants.map(v => v.sale_price ?? v.selling_price));

  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: `${device.label} beskyttelsesglas`,
    image: primary.images.length > 0 ? primary.images : ["/spot/hero.png"],
    brand: { "@type": "Brand", name: "Spot" },
    sku: primary.slug,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "DKK",
      lowPrice: (lowPrice / 100).toFixed(0),
      highPrice: (highPrice / 100).toFixed(0),
      offerCount: variants.length,
      availability: "https://schema.org/InStock",
    },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.7", reviewCount: "450" },
  };

  const brandTile = SPOT_HUB_TILES.find(t => t.id === brand);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <JsonLd data={productSchema} />

      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/beskyttelsesglas" className="hover:underline">Beskyttelsesglas</Link>
        <span className="mx-2">→</span>
        <Link href={`/beskyttelsesglas/${brand}`} className="hover:underline">{brandTile?.label ?? brand}</Link>
        <span className="mx-2">→</span>
        <span>{device.label}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="aspect-square bg-gray-50 rounded-2xl relative overflow-hidden">
          <Image
            src={primary.images[0] ?? "/spot/hero.png"}
            alt={`${device.label} beskyttelsesglas med 9H hærdet glas`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>

        <div>
          <h1 className="text-4xl font-semibold">{device.label} beskyttelsesglas</h1>

          <div className="mt-6"><VariantToggle variants={variants} /></div>

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-900 text-sm">
            Gratis montering ved afhentning i Vejle eller Slagelse
          </div>

          {siblings.length > 0 && (
            <p className="mt-6 text-sm text-gray-600">
              Passer også til{" "}
              {siblings.map((s, i) => {
                const sib = TILBEHOER_DEVICES.find(d => d.slug === s);
                return (
                  <span key={s}>
                    <Link href={`/beskyttelsesglas/${brand}/${s}`} className="underline">{sib?.label ?? s}</Link>
                    {i < siblings.length - 1 ? ", " : ""}
                  </span>
                );
              })}
              .
            </p>
          )}

          <section className="mt-10 space-y-4 text-sm text-gray-700">
            <p>Vi har udviklet Spot Glass specielt til {device.label}. Glasset er skåret præcist til modellens display — ingen løse kanter, ingen luftbobler, ingen kompromiser med touch-følsomhed.</p>
            <p>Du kan montere det selv på 2 minutter med den medfølgende applikator, eller komme forbi PhoneSpot i Vejle eller Slagelse — så gør vi det gratis.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
