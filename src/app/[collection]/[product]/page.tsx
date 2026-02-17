import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollectionConfig } from "@/lib/collections";
import { getProduct, searchProducts } from "@/lib/shopify/client";
import type { Product } from "@/lib/shopify/types";
import { sanitizeHtml } from "@/lib/sanitize";
import { ImageGallery } from "@/components/product/image-gallery";
import { ProductInfo } from "@/components/product/product-info";
import { UpsellWrapper } from "@/components/product/upsell-wrapper";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string; product: string }>;
}): Promise<Metadata> {
  const { product: productHandle } = await params;

  let productData;
  try {
    productData = await getProduct(productHandle);
  } catch {
    return { title: "Produkt ikke fundet - PhoneSpot" };
  }

  if (!productData) {
    return { title: "Produkt ikke fundet - PhoneSpot" };
  }

  return {
    title: productData.seo.title ?? `${productData.title} - PhoneSpot`,
    description:
      productData.seo.description ??
      productData.description.slice(0, 160),
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
  let product;
  try {
    product = await getProduct(productHandle);
  } catch {
    notFound();
  }
  if (!product) {
    notFound();
  }

  // Sanitize HTML description using DOMPurify via sanitizeHtml utility
  // Content is sanitized with DOMPurify before rendering
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

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      {/* Two-column layout */}
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* Left: Image gallery */}
        <ImageGallery images={product.images} title={product.title} />

        {/* Right: Product info */}
        <ProductInfo product={product} />
      </div>

      {/* Accessory upsell */}
      {accessories.length > 0 && (
        <div className="mt-8">
          <UpsellWrapper accessories={accessories} />
        </div>
      )}

      {/* Product description - sanitized with DOMPurify before rendering */}
      {cleanDescription && (
        <div className="mt-12 border-t border-sand pt-8">
          <h2 className="font-display text-xl font-bold text-charcoal mb-4">
            Beskrivelse
          </h2>
          <div
            className="prose prose-sm max-w-none font-body text-charcoal/80 prose-headings:font-display prose-headings:text-charcoal prose-a:text-green-eco"
            dangerouslySetInnerHTML={{ __html: cleanDescription }}
          />
        </div>
      )}
    </section>
  );
}
