import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  getTemplateBySlug,
  getAvailableDevices,
  getPublishedSkuProducts,
  getPublishedTemplates,
  getUpgradeOptionsForTemplate,
} from "@/lib/supabase/product-queries";
import { toPublicSkuProduct } from "@/lib/product/public-sku";
import { DeviceDetail } from "@/components/product/device-detail";
import type { UpgradeOption } from "@/components/product/upgrade-selector";
import { JsonLd } from "@/components/seo/json-ld";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { TrustpilotReviews } from "@/components/trustpilot/trustpilot-reviews";
import { ProductGridCard } from "@/components/product/product-grid-card";
import { devicesToItemCondition } from "@/lib/seo/item-condition";
import { getDeviceFaq } from "@/lib/product/device-faq";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const template = await getTemplateBySlug(slug);
  if (!template) return { title: "Produkt ikke fundet" };

  // `??` only catches null/undefined — meta_title/meta_description come
  // back as "" (empty string, not null) for some published templates (e.g.
  // samsung-galaxy-watch-4, samsung-galaxy-z-fold-3), which `??` happily
  // passes through, leaving the page with NO <title> and NO meta
  // description in production. `||` treats "" the same as missing and
  // falls through to the generated fallback.
  const title =
    template.meta_title || `${template.display_name} - Refurbished | PhoneSpot`;
  const description =
    template.meta_description ||
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

/* ------------------------------------------------------------------ */
/*  Device type helper                                                 */
/* ------------------------------------------------------------------ */

type DeviceType = "phone" | "watch" | "ipad" | "laptop";

function getDeviceType(category: string): DeviceType {
  if (category === "smartwatch") return "watch";
  if (category === "ipad") return "ipad";
  if (category === "laptop") return "laptop";
  return "phone";
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function RefurbishedProductPage({ params }: Props) {
  const { slug } = await params;

  const template = await getTemplateBySlug(slug);
  if (!template) notFound();

  const [availableDevices, accessories, upgradeOptions] = await Promise.all([
    getAvailableDevices(template.id),
    getPublishedSkuProducts(undefined, template.id),
    template.category === "laptop"
      ? getUpgradeOptionsForTemplate(template.id)
      : Promise.resolve<UpgradeOption[]>([]),
  ]);

  // When this model is fully sold out, fetch similar in-stock models (same
  // category, nearest price) so the buy box isn't a dead end. Skipped for
  // in-stock pages to avoid the extra query.
  const relatedInStock =
    availableDevices.length === 0
      ? (await getPublishedTemplates(template.category, { inStock: true }))
          .filter((t) => t.id !== template.id)
          .sort(
            (a, b) =>
              Math.abs((a.min_price ?? 0) - (template.base_price_a ?? 0)) -
              Math.abs((b.min_price ?? 0) - (template.base_price_a ?? 0)),
          )
          .slice(0, 4)
          .map((t) => ({
            id: t.id,
            slug: t.slug,
            display_name: t.display_name,
            image: t.images[0] ?? null,
            min_price: t.min_price,
            brand: t.brand,
          }))
      : [];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Forside",
        item: "https://phonespot.dk",
      },
      {
        "@type": "ListItem",
        position: 2,
        name:
          template.category === "iphone"
            ? "Refurbished iPhones"
            : template.category === "ipad"
              ? "Refurbished iPads"
              : template.category === "laptop"
                ? "Refurbished bærbare"
                : template.category === "smartwatch"
                  ? "Refurbished smartwatches"
                  : "Refurbished smartphones",
        item: `https://phonespot.dk/${
          template.category === "iphone"
            ? "iphones"
            : template.category === "ipad"
              ? "ipads"
              : template.category === "laptop"
                ? "baerbare"
                : template.category === "smartwatch"
                  ? "smartwatches"
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

  const minPrice =
    availableDevices.length > 0
      ? Math.min(
          ...availableDevices.map((d) => d.selling_price ?? 0).filter(Boolean),
        )
      : template.base_price_a;

  // itemCondition: NewCondition only if every currently listed device is
  // grade N (fabriksny), else RefurbishedCondition — see
  // lib/seo/item-condition.ts for the full mixed-grade rule.
  const itemCondition = devicesToItemCondition(availableDevices);

  const productJsonLd = minPrice
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: template.display_name,
        description: template.description ?? undefined,
        image: template.images,
        brand: { "@type": "Brand", name: template.brand },
        offers: {
          "@type": "Offer",
          priceCurrency: "DKK",
          price: (minPrice / 100).toFixed(0),
          availability:
            availableDevices.length > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition,
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
            ? "Smartwatches"
            : "Smartphones";

  const deviceType = getDeviceType(template.category);

  const faqs = getDeviceFaq(template.display_name, template.category);
  return (
    <div className="font-body text-[#202421]">
      <JsonLd data={breadcrumbJsonLd} />
      {productJsonLd && <JsonLd data={productJsonLd} />}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        }}
      />
      <nav className="mx-auto max-w-7xl px-4 pt-6" aria-label="Brødkrumme">
        <ol className="flex min-w-0 items-center gap-2 text-xs text-[#687069]">
          <li className="shrink-0">
            <Link href="/" className="hover:text-[#1A3D2E]">
              Forside
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="shrink-0">
            <Link href={categoryHref} className="hover:text-[#1A3D2E]">
              {categoryLabel}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="min-w-0 truncate text-[#202421]" aria-current="page">
            {template.display_name}
          </li>
        </ol>
      </nav>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:pb-16 sm:pt-8">
        <DeviceDetail
          template={template}
          devices={availableDevices}
          accessories={accessories.map(toPublicSkuProduct)}
          relatedInStock={relatedInStock}
          upgradeOptions={upgradeOptions}
        />
      </section>

      <section
        className="border-y border-[#DDE2DD] bg-[#F4F5F2] py-12 sm:py-16"
        id="hvad-betyder-standen"
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.5fr)]">
          <div>
            <p className="text-xs font-semibold text-[#1A3D2E]">Fysisk stand</p>
            <h2 className="mt-2 font-body text-3xl font-semibold tracking-[-0.035em]">
              Hvad betyder standen?
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#566159]">
              Standen beskriver de kosmetiske brugsspor. Se batterimålingen og
              beskrivelsen af den konkrete enhed, når du vælger ovenfor.
            </p>
            <Link
              href="/kvalitet"
              className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[#1A3D2E]"
            >
              Læs om vores kvalitet &rarr;
            </Link>
          </div>
          <ConditionExplainer deviceType={deviceType} />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <p className="text-xs font-semibold text-[#1A3D2E]">Godt at vide</p>
          <h2 className="mt-2 font-body text-3xl font-semibold tracking-[-0.035em]">
            Spørgsmål om dette produkt
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#566159]">
            Få et overblik over stand, garanti og dit køb. Du er velkommen til at
            kontakte os, hvis du er i tvivl.
          </p>
        </div>
        <div className="min-w-0 divide-y divide-[#DDE2DD] border-y border-[#DDE2DD]">
          {faqs.map((faq) => (
            <details key={faq.q} className="group">
              <summary className="cursor-pointer py-5 pr-4 font-body text-sm font-semibold leading-6 text-[#202421] focus-visible:outline-2 focus-visible:outline-[#1A3D2E]">
                {faq.q}
              </summary>
              <p className="pb-5 text-sm leading-6 text-[#566159]">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-y border-[#DDE2DD] bg-[#F4F5F2] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-6 font-body text-3xl font-semibold tracking-[-0.035em]">
            Anmeldelser på Trustpilot
          </h2>
          <Suspense
            fallback={
              <p className="text-sm text-[#566159]">Henter anmeldelser…</p>
            }
          >
            <TrustpilotReviews />
          </Suspense>
        </div>
      </section>
      <Suspense fallback={null}>
        <RelatedProducts category={template.category} excludeId={template.id} />
      </Suspense>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Async server component — loads related products without blocking   */
/* ------------------------------------------------------------------ */

async function RelatedProducts({
  category,
  excludeId,
}: {
  category: string;
  excludeId: string;
}) {
  const relatedTemplates = await getPublishedTemplates(category);
  const related = relatedTemplates
    .filter((t) => t.id !== excludeId)
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
      <h2 className="mb-8 font-body text-3xl font-semibold tracking-[-0.035em]">
        Flere modeller
      </h2>
      <div className="grid grid-flow-col auto-cols-[minmax(230px,78%)] gap-5 overflow-x-auto pb-3 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-3 sm:overflow-visible">
        {related.map((t) => (
          <ProductGridCard
            key={t.id}
            slug={t.slug}
            image={t.images[0]}
            title={t.display_name}
            minPrice={t.min_price}
            deviceCount={t.device_count}
            locations={t.locations}
            brand={t.brand}
            category={t.category}
            compareAtPrice={t.new_price}
          />
        ))}
      </div>
    </section>
  );
}
