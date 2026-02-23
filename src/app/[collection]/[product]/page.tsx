import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCollectionConfig } from "@/lib/collections";
import { getProduct, searchProducts, getCollectionProducts } from "@/lib/shopify/client";
import type { Product } from "@/lib/shopify/types";
import { sanitizeHtml } from "@/lib/sanitize";
import { ImageGallery } from "@/components/product/image-gallery";
import { ProductInfo } from "@/components/product/product-info";
import { UpsellWrapper } from "@/components/product/upsell-wrapper";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ProductCard } from "@/components/product/product-card";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse "spec:Key:Value" tags into a key-value map. */
function parseSpecTags(tags: string[]): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const tag of tags) {
    if (tag.startsWith("spec:")) {
      const parts = tag.split(":");
      if (parts.length >= 3) {
        specs[parts[1]] = parts.slice(2).join(":");
      }
    }
  }
  return specs;
}

/** Return generic specs based on productType when tags don't provide data. */
function getGenericSpecs(productType: string): { label: string; value: string }[] {
  const lower = productType.toLowerCase();

  if (lower.includes("iphone")) {
    return [
      { label: "Display", value: "Super Retina XDR OLED" },
      { label: "Processor", value: "Apple A-serie chip" },
      { label: "Kamera", value: "Dual/Triple kamera-system" },
      { label: "Batteri", value: "Li-Ion, hurtigopladning" },
      { label: "Lagerplads", value: "Se variantvælger" },
      { label: "Forbindelse", value: "5G, Wi-Fi 6, Bluetooth 5.3, NFC" },
      { label: "Operativsystem", value: "iOS (seneste understøttede version)" },
    ];
  }

  if (lower.includes("ipad")) {
    return [
      { label: "Display", value: "Liquid Retina / Retina" },
      { label: "Processor", value: "Apple M-serie / A-serie chip" },
      { label: "Kamera", value: "Vidvinkel + ultravid" },
      { label: "Batteri", value: "Li-Ion, op til 10 timers brug" },
      { label: "Lagerplads", value: "Se variantvælger" },
      { label: "Forbindelse", value: "Wi-Fi 6, Bluetooth 5.x" },
      { label: "Operativsystem", value: "iPadOS (seneste understøttede)" },
    ];
  }

  if (lower.includes("samsung") || lower.includes("galaxy") || lower.includes("smartphone")) {
    return [
      { label: "Display", value: "Dynamic AMOLED 2X" },
      { label: "Processor", value: "Qualcomm / Exynos" },
      { label: "Kamera", value: "Multi-kamera system" },
      { label: "Batteri", value: "Li-Ion, hurtigopladning" },
      { label: "Lagerplads", value: "Se variantvælger" },
      { label: "Forbindelse", value: "5G, Wi-Fi, Bluetooth, NFC" },
      { label: "Operativsystem", value: "Android (seneste understøttede)" },
    ];
  }

  if (lower.includes("macbook") || lower.includes("mac")) {
    return [
      { label: "Processortype", value: "Apple M-serie / Intel Core" },
      { label: "Display", value: "Retina / Liquid Retina, True Tone" },
      { label: "Displaystørrelse", value: "13,3\" / 14\" / 15\" / 16\"" },
      { label: "Grafik", value: "Integreret Apple GPU / Intel Iris Plus" },
      { label: "RAM", value: "Se variantvælger" },
      { label: "Lagerplads", value: "SSD — se variantvælger" },
      { label: "Porte", value: "USB-C / Thunderbolt, MagSafe, HDMI (udvalgte)" },
      { label: "Trådløs", value: "Wi-Fi 6, Bluetooth 5.0+" },
      { label: "Batteri", value: "Li-Po, op til 18 timers brug" },
      { label: "Tastatur", value: "Baggrundsbelyst, dansk layout" },
      { label: "Trackpad", value: "Force Touch trackpad" },
      { label: "Operativsystem", value: "macOS (seneste understøttede version)" },
      { label: "Vægt", value: "Ca. 1,24 - 2,14 kg (modelafhængig)" },
    ];
  }

  if (lower.includes("thinkpad") || lower.includes("lenovo")) {
    return [
      { label: "Processortype", value: "Intel Core i5 / i7" },
      { label: "Display", value: "IPS Full HD (1920×1080)" },
      { label: "Displaystørrelse", value: "14\" / 15,6\"" },
      { label: "Grafik", value: "Intel UHD / Iris Xe Graphics" },
      { label: "RAM", value: "Se variantvælger" },
      { label: "Lagerplads", value: "SSD — se variantvælger" },
      { label: "Porte", value: "USB-A, USB-C, HDMI, Ethernet (udvalgte)" },
      { label: "Trådløs", value: "Wi-Fi 5/6, Bluetooth 5.x" },
      { label: "Batteri", value: "Li-Ion, op til 10 timers brug" },
      { label: "Tastatur", value: "ThinkPad-tastatur, baggrundsbelyst" },
      { label: "Sikkerhed", value: "Fingeraftrykslæser, TPM 2.0" },
      { label: "Operativsystem", value: "Windows 11 (ren installation)" },
      { label: "Holdbarhed", value: "MIL-STD-810G testet" },
      { label: "Vægt", value: "Ca. 1,4 - 1,9 kg (modelafhængig)" },
    ];
  }

  if (lower.includes("elitebook") || lower.includes("hp") || lower.includes("probook")) {
    return [
      { label: "Processortype", value: "Intel Core i5 / i7" },
      { label: "Display", value: "IPS Full HD (1920×1080)" },
      { label: "Displaystørrelse", value: "14\" / 15,6\"" },
      { label: "Grafik", value: "Intel UHD / Iris Xe Graphics" },
      { label: "RAM", value: "Se variantvælger" },
      { label: "Lagerplads", value: "SSD — se variantvælger" },
      { label: "Porte", value: "USB-A, USB-C, HDMI, DisplayPort" },
      { label: "Trådløs", value: "Wi-Fi 6, Bluetooth 5.x" },
      { label: "Batteri", value: "Li-Ion, op til 8 timers brug" },
      { label: "Lyd", value: "Bang & Olufsen højttalere" },
      { label: "Sikkerhed", value: "Fingeraftrykslæser, IR-kamera" },
      { label: "Operativsystem", value: "Windows 11 (ren installation)" },
      { label: "Vægt", value: "Ca. 1,3 - 1,8 kg (modelafhængig)" },
    ];
  }

  if (lower.includes("computer") || lower.includes("laptop") || lower.includes("notebook")) {
    return [
      { label: "Processortype", value: "Intel Core / AMD Ryzen" },
      { label: "Display", value: "Full HD IPS" },
      { label: "Grafik", value: "Integreret" },
      { label: "RAM", value: "Se variantvælger" },
      { label: "Lagerplads", value: "SSD — se variantvælger" },
      { label: "Porte", value: "USB-A, USB-C, HDMI" },
      { label: "Trådløs", value: "Wi-Fi, Bluetooth" },
      { label: "Batteri", value: "Li-Ion, min. 4 timers brug" },
      { label: "Operativsystem", value: "Windows 11 / macOS (ren installation)" },
    ];
  }

  return [
    { label: "Type", value: productType || "Elektronik" },
    { label: "Stand", value: "Testet & kvalitetssikret" },
    { label: "Garanti", value: "36 måneders garanti" },
  ];
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string; product: string }>;
}): Promise<Metadata> {
  const { collection: collectionSlug, product: productHandle } = await params;

  const config = getCollectionConfig(collectionSlug);

  let productData: Product | null = null;
  try {
    productData = await getProduct(productHandle);
  } catch {
    return { title: "Produkt ikke fundet - PhoneSpot" };
  }

  if (!productData) {
    return { title: "Produkt ikke fundet - PhoneSpot" };
  }

  const title =
    productData.seo.title ?? `${productData.title} - Refurbished | PhoneSpot`;
  const description =
    productData.seo.description ??
    `Køb ${productData.title} refurbished med 36 mdr. garanti hos PhoneSpot. ${productData.description.slice(0, 120)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: productData.images[0]
        ? [{ url: productData.images[0].url }]
        : undefined,
      siteName: "PhoneSpot",
      locale: "da_DK",
      type: "website",
    },
    alternates: {
      canonical: `/${collectionSlug}/${productHandle}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProductPage({
  params,
}: {
  params: Promise<{ collection: string; product: string }>;
}) {
  const { collection: collectionSlug, product: productHandle } = await params;

  // Validate collection slug
  const config = getCollectionConfig(collectionSlug);
  if (!config) {
    notFound();
  }

  // Fetch product
  let product: Product | null = null;
  try {
    product = await getProduct(productHandle);
  } catch {
    notFound();
  }
  if (!product) {
    notFound();
  }

  // Sanitize HTML description using DOMPurify via sanitizeHtml utility
  const cleanDescription = product.descriptionHtml
    ? sanitizeHtml(product.descriptionHtml)
    : "";

  // Find compatible accessories via product tags
  const compatibleTag = product.tags.find((t) => t.startsWith("compatible:"));
  let accessories: Product[] = [];
  if (compatibleTag) {
    try {
      accessories = await searchProducts(
        compatibleTag.replace("compatible:", ""),
      );
    } catch {
      // Silently fail — upsell is optional
    }
  }

  // Fetch related products from same collection
  let relatedProducts: Product[] = [];
  try {
    const related = await getCollectionProducts(config.shopifyHandle);
    relatedProducts = (related?.products ?? [])
      .filter((p) => p.handle !== productHandle)
      .slice(0, 4);
  } catch {
    relatedProducts = [];
  }

  // Parse specs from tags or fall back to generic
  const parsedSpecs = parseSpecTags(product.tags);
  const specs =
    Object.keys(parsedSpecs).length > 0
      ? Object.entries(parsedSpecs).map(([label, value]) => ({ label, value }))
      : getGenericSpecs(product.productType);

  return (
    <>
      {/* ----------------------------------------------------------------- */}
      {/* 1. Breadcrumbs                                                     */}
      {/* ----------------------------------------------------------------- */}
      <nav
        aria-label="Brødkrumme"
        className="mx-auto max-w-7xl px-4 pt-4 pb-2"
      >
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray">
          <li>
            <Link href="/" className="transition-colors hover:text-charcoal">
              Hjem
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/${collectionSlug}`}
              className="transition-colors hover:text-charcoal"
            >
              {config.title}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-charcoal font-medium truncate max-w-[200px] md:max-w-none">
            {product.title}
          </li>
        </ol>
      </nav>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Product hero (two-column)                                       */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          {/* Left: Image gallery */}
          <ImageGallery images={product.images} title={product.title} />

          {/* Right: Product info */}
          <ProductInfo product={product} collectionSlug={collectionSlug} />
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 3. Inkluderet i boksen                                             */}
      {/* ----------------------------------------------------------------- */}
      <SectionWrapper background="sand">
        <Heading as="h2" size="md" className="mb-10 text-center">
          Inkluderet i boksen
        </Heading>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {/* Enhed */}
          <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mb-3 h-10 w-10 text-green-eco"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
              />
            </svg>
            <span className="text-sm font-semibold text-charcoal">Enhed</span>
            <span className="mt-1 text-xs text-gray">
              Testet &amp; kvalitetssikret
            </span>
          </div>

          {/* USB-C ladekabel */}
          <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mb-3 h-10 w-10 text-green-eco"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.25 19.5h13.5"
              />
            </svg>
            <span className="text-sm font-semibold text-charcoal">
              USB-C ladekabel
            </span>
            <span className="mt-1 text-xs text-gray">Kompatibelt kabel</span>
          </div>

          {/* Oplader */}
          <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mb-3 h-10 w-10 text-green-eco"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
              />
            </svg>
            <span className="text-sm font-semibold text-charcoal">
              Oplader
            </span>
            <span className="mt-1 text-xs text-gray">Hurtig opladning</span>
          </div>

          {/* Hurtigstart-guide */}
          <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mb-3 h-10 w-10 text-green-eco"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
            <span className="text-sm font-semibold text-charcoal">
              Hurtigstart-guide
            </span>
            <span className="mt-1 text-xs text-gray">Kom nemt i gang</span>
          </div>
        </div>
      </SectionWrapper>

      {/* ----------------------------------------------------------------- */}
      {/* 4. Stand & kvalitet                                                */}
      {/* ----------------------------------------------------------------- */}
      <SectionWrapper background="default">
        <Heading as="h2" size="md" className="mb-4 text-center">
          Hvad betyder standen?
        </Heading>
        <p className="mx-auto mb-10 max-w-2xl text-center font-body text-charcoal/70">
          Alle vores enheder er 100&nbsp;% funktionelle og gennemgår en
          grundig kvalitetstest med mindst 30 kontrolpunkter. Standen
          beskriver udelukkende det kosmetiske udseende.
        </p>
        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          {/* Grade A */}
          <div className="rounded-2xl border border-sand bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-eco/10 text-lg font-bold text-green-eco">
                A
              </span>
              <span className="font-display text-lg font-bold text-charcoal">
                Som ny
              </span>
            </div>
            <p className="text-sm leading-relaxed text-charcoal/70">
              Enheden fremstår næsten som ny. Ingen synlige ridser eller
              brugstegn. Skærmen er perfekt og batteriet er i top tilstand.
            </p>
          </div>

          {/* Grade B */}
          <div className="rounded-2xl border border-sand bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">
                B
              </span>
              <span className="font-display text-lg font-bold text-charcoal">
                Meget god
              </span>
            </div>
            <p className="text-sm leading-relaxed text-charcoal/70">
              Enheden kan have lette brugsspor som små ridser på bagsiden
              eller rammen. Skærmen er fri for ridser. Fuldt funktionel.
            </p>
          </div>

          {/* Grade C */}
          <div className="rounded-2xl border border-sand bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-orange-600">
                C
              </span>
              <span className="font-display text-lg font-bold text-charcoal">
                God
              </span>
            </div>
            <p className="text-sm leading-relaxed text-charcoal/70">
              Enheden har tydelige brugsspor såsom ridser eller små mærker.
              Alle funktioner virker perfekt. Bedste pris.
            </p>
          </div>
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/kvalitet"
            className="inline-flex items-center gap-2 text-sm font-semibold text-green-eco transition-colors hover:text-charcoal"
          >
            Læs mere om vores kvalitetsgaranti
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </SectionWrapper>

      {/* ----------------------------------------------------------------- */}
      {/* 5. Product description (sanitized with DOMPurify)                  */}
      {/* ----------------------------------------------------------------- */}
      {cleanDescription && (
        <SectionWrapper background="default">
          <Heading as="h2" size="md" className="mb-6">
            Produktbeskrivelse
          </Heading>
          <div
            className="prose prose-sm md:prose-base max-w-none font-body text-charcoal/80 prose-headings:font-display prose-headings:text-charcoal prose-a:text-green-eco prose-strong:text-charcoal"
            dangerouslySetInnerHTML={{ __html: cleanDescription }}
          />
        </SectionWrapper>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 6. Specifikationer                                                 */}
      {/* ----------------------------------------------------------------- */}
      {specs.length > 0 && (
        <SectionWrapper background="cream">
          <Heading as="h2" size="md" className="mb-8 text-center">
            Specifikationer
          </Heading>
          <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-sand bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <tbody>
                {specs.map((spec, idx) => (
                  <tr
                    key={spec.label}
                    className={
                      idx % 2 === 0 ? "bg-white" : "bg-sand/40"
                    }
                  >
                    <td className="px-5 py-3.5 font-semibold text-charcoal w-2/5">
                      {spec.label}
                    </td>
                    <td className="px-5 py-3.5 text-charcoal/70">
                      {spec.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionWrapper>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 7. Accessory upsell                                                */}
      {/* ----------------------------------------------------------------- */}
      {accessories.length > 0 && (
        <SectionWrapper background="default">
          <Heading as="h2" size="md" className="mb-8 text-center">
            Beskyt din enhed
          </Heading>
          <UpsellWrapper accessories={accessories} />
        </SectionWrapper>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 8. Relaterede produkter                                            */}
      {/* ----------------------------------------------------------------- */}
      {relatedProducts.length > 0 && (
        <SectionWrapper background="sand">
          <Heading as="h2" size="md" className="mb-10 text-center">
            Andre kunder kiggede også på
          </Heading>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                collectionHandle={collectionSlug}
              />
            ))}
          </div>
        </SectionWrapper>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 9. Produktspecifik FAQ                                              */}
      {/* ----------------------------------------------------------------- */}
      <SectionWrapper background="default">
        <Heading as="h2" size="md" className="mb-8 text-center">
          Spørgsmål om dette produkt
        </Heading>
        <div className="mx-auto max-w-2xl divide-y divide-sand rounded-2xl border border-sand bg-white shadow-sm">
          {/* Q1 */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-semibold text-charcoal transition-colors hover:text-green-eco">
              <span>Hvad er standen på denne enhed?</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </summary>
            <div className="px-6 pb-5 text-sm leading-relaxed text-charcoal/70">
              Vi vurderer alle enheder efter et A/B/C-system. Stand A er
              næsten som ny uden synlige ridser. Stand B har lette
              brugsspor, men skærmen er perfekt. Stand C kan have tydelige
              kosmetiske mærker, men er fuldt funktionel. Alle enheder
              gennemgår minimum 30 kontrolpunkter uanset stand.
            </div>
          </details>

          {/* Q2 */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-semibold text-charcoal transition-colors hover:text-green-eco">
              <span>Hvad gør jeg hvis enheden har en fejl?</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </summary>
            <div className="px-6 pb-5 text-sm leading-relaxed text-charcoal/70">
              Alle vores produkter leveres med 36 måneders garanti. Hvis du
              oplever en fejl, kontakt vores kundeservice, og vi finder en
              løsning hurtigst muligt — enten reparation, ombytning eller
              refundering. Du er altid dækket.
            </div>
          </details>

          {/* Q3 */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-semibold text-charcoal transition-colors hover:text-green-eco">
              <span>Hvor hurtigt leverer I?</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </summary>
            <div className="px-6 pb-5 text-sm leading-relaxed text-charcoal/70">
              Vi sender din ordre inden for 1-2 hverdage. Du modtager en
              sporings-mail så snart pakken er afsendt, så du altid ved
              hvor den er. Vi leverer med GLS eller PostNord direkte til
              din dør eller nærmeste pakkeshop.
            </div>
          </details>

          {/* Q4 */}
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-semibold text-charcoal transition-colors hover:text-green-eco">
              <span>Kan jeg returnere enheden?</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </summary>
            <div className="px-6 pb-5 text-sm leading-relaxed text-charcoal/70">
              Ja, du har altid 14 dages fuld returret fra den dag du
              modtager din ordre. Enheden skal returneres i samme stand som
              du modtog den. Kontakt os, og vi sender dig en returetiket.
              Pengene refunderes inden for 3-5 hverdage efter vi har
              modtaget enheden.
            </div>
          </details>
        </div>
      </SectionWrapper>

      {/* ----------------------------------------------------------------- */}
      {/* 10. Trust bar                                                      */}
      {/* ----------------------------------------------------------------- */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
