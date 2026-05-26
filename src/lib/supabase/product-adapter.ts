// Adapter: Convert Supabase product types → Shopify Product shape
// This lets existing ProductCard/ProductGrid components work with Supabase data.

import type { Product, ShopifyImage, ProductVariant } from "@/lib/shopify/types";
import type { ProductTemplate, SkuProduct } from "./platform-types";

/** Minimal device shape needed for battery health aggregation. */
interface DeviceWithBatteryHealth {
  battery_health: number | null;
  storage?: string | null;
  grade?: string | null;
}

export function templateToProduct(
  t: ProductTemplate & { min_price?: number | null; device_count?: number },
  devices?: DeviceWithBatteryHealth[],
): Product {
  const price = t.min_price ?? t.base_price_a ?? t.base_price_c ?? 0;
  const priceStr = (price / 100).toFixed(2);

  const images: ShopifyImage[] = (t.images || []).map((url, i) => ({
    url,
    altText: i === 0 ? t.display_name : `${t.display_name} - ${i + 1}`,
    width: 800,
    height: 800,
  }));

  const variants: ProductVariant[] = [];
  // Create variants from storage options and grade pricing
  const storages = t.storage_options || ["Standard"];
  const grades: { label: string; price: number | null }[] = [
    { label: "Som ny Stand", price: t.base_price_a },
    { label: "God Stand", price: t.base_price_b },
    { label: "Okay Stand", price: t.base_price_c },
  ].filter((g) => g.price != null);

  for (const storage of storages) {
    for (const grade of grades) {
      // Collect battery_health values from devices matching this storage+grade bucket.
      // Use Math.min for the most conservative claim (worst battery in the batch).
      let batteryHealth: number | undefined = undefined;
      if (devices && devices.length > 0) {
        const gradeKey = grade.label === "Som ny Stand" ? "A" : grade.label === "God Stand" ? "B" : "C";
        const values = devices
          .filter(
            (d) =>
              d.battery_health != null &&
              (storage === "Standard" || d.storage == null || d.storage === storage) &&
              (d.grade == null || d.grade === gradeKey),
          )
          .map((d) => d.battery_health as number);
        if (values.length > 0) {
          batteryHealth = Math.min(...values);
        }
      }

      variants.push({
        id: `${t.id}-${storage}-${grade.label}`,
        title: `${storage} / ${grade.label}`,
        availableForSale: true,
        selectedOptions: [
          { name: "Lagerplads", value: storage },
          { name: "Stand", value: grade.label },
        ],
        price: { amount: ((grade.price ?? 0) / 100).toFixed(2), currencyCode: "DKK" },
        compareAtPrice: null,
        ...(batteryHealth !== undefined && { batteryHealth }),
      });
    }
  }

  // If no variants were generated, add a default
  if (variants.length === 0) {
    variants.push({
      id: t.id,
      title: "Default",
      availableForSale: true,
      selectedOptions: [],
      price: { amount: priceStr, currencyCode: "DKK" },
      compareAtPrice: null,
    });
  }

  return {
    id: t.id,
    templateId: t.id,
    handle: t.slug,
    title: t.display_name,
    description: t.description ?? "",
    descriptionHtml: t.description ?? "",
    vendor: t.brand,
    productType: t.category,
    tags: [t.category, t.brand.toLowerCase(), "refurbished"],
    availableForSale: (t.device_count ?? 0) > 0 || true, // Show as available even without individual devices listed
    priceRange: {
      minVariantPrice: { amount: priceStr, currencyCode: "DKK" },
      maxVariantPrice: {
        amount: ((t.base_price_a ?? price) / 100).toFixed(2),
        currencyCode: "DKK",
      },
    },
    images,
    variants,
    seo: {
      title: t.meta_title ?? null,
      description: t.meta_description ?? null,
    },
  };
}

export function skuProductToProduct(p: SkuProduct): Product {
  const price = p.sale_price ?? p.selling_price;
  const priceStr = (price / 100).toFixed(2);
  const comparePrice = p.sale_price != null ? (p.selling_price / 100).toFixed(2) : null;

  const images: ShopifyImage[] = (p.images || []).map((url, i) => ({
    url,
    altText: i === 0 ? p.title : `${p.title} - ${i + 1}`,
    width: 800,
    height: 800,
  }));

  const variant: ProductVariant = {
    id: p.id,
    title: "Default Title",
    availableForSale: p.status === "published",
    selectedOptions: [],
    price: { amount: priceStr, currencyCode: "DKK" },
    compareAtPrice: comparePrice
      ? { amount: comparePrice, currencyCode: "DKK" }
      : null,
  };

  return {
    id: p.id,
    handle: p.slug ?? p.id,
    title: p.title,
    description: p.description ?? "",
    descriptionHtml: p.description ?? "",
    vendor: p.brand ?? "PhoneSpot",
    productType: p.category ?? "accessory",
    tags: [p.category ?? "accessory", p.brand?.toLowerCase() ?? ""].filter(Boolean),
    availableForSale: p.status === "published",
    priceRange: {
      minVariantPrice: { amount: priceStr, currencyCode: "DKK" },
      maxVariantPrice: { amount: priceStr, currencyCode: "DKK" },
    },
    images,
    variants: [variant],
    seo: {
      title: p.meta_title ?? null,
      description: p.meta_description ?? null,
    },
  };
}
