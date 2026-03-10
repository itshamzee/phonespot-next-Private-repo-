import { getCollections, getCollectionProducts } from "@/lib/shopify/client";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getEan(tags: string[]): string | null {
  const eanTag = tags.find((t) => t.startsWith("ean:"));
  return eanTag ? eanTag.slice(4) : null;
}

function getMpn(tags: string[]): string | null {
  const mpnTag = tags.find((t) => t.startsWith("mpn:"));
  return mpnTag ? mpnTag.slice(4) : null;
}

export async function GET() {
  const collections = await getCollections();
  const allProducts: Array<{
    product: {
      title: string;
      handle: string;
      description: string;
      vendor: string;
      images: { url: string }[];
      tags: string[];
      variants: Array<{
        id: string;
        title: string;
        price: { amount: string; currencyCode: string };
        availableForSale: boolean;
      }>;
    };
    collectionHandle: string;
    collectionTitle: string;
  }> = [];

  // Fetch all products from all collections
  for (const collection of collections) {
    const col = await getCollectionProducts(collection.handle);
    if (col?.products) {
      for (const product of col.products) {
        allProducts.push({
          product,
          collectionHandle: collection.handle,
          collectionTitle: collection.title,
        });
      }
    }
  }

  // Generate XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<products>\n`;

  for (const { product, collectionHandle, collectionTitle } of allProducts) {
    for (const variant of product.variants) {
      if (!variant.availableForSale) continue;

      const url = `https://phonespot.dk/${collectionHandle}/${product.handle}`;
      const imageUrl = product.images[0]?.url ?? "";
      const ean = getEan(product.tags);
      const mpn = getMpn(product.tags);
      const price = parseFloat(variant.price.amount);
      const shippingCost = price >= 500 ? 0 : 49; // Free shipping over 500 DKK
      const manufacturer = product.vendor || "PhoneSpot";

      xml += `  <product>\n`;
      xml += `    <ProductName>${escapeXml(product.title + (variant.title !== "Default Title" ? " - " + variant.title : ""))}</ProductName>\n`;
      xml += `    <Price>${price.toFixed(2)}</Price>\n`;
      xml += `    <Currency>DKK</Currency>\n`;
      xml += `    <ProductUrl>${escapeXml(url)}</ProductUrl>\n`;
      xml += `    <ImageUrl>${escapeXml(imageUrl)}</ImageUrl>\n`;
      xml += `    <Category>${escapeXml(collectionTitle)}</Category>\n`;
      xml += `    <Manufacturer>${escapeXml(manufacturer)}</Manufacturer>\n`;
      xml += `    <ShippingCost>${shippingCost.toFixed(2)}</ShippingCost>\n`;
      xml += `    <StockStatus>in stock</StockStatus>\n`;
      xml += `    <Condition>refurbished</Condition>\n`;
      xml += `    <SKU>${escapeXml(variant.id)}</SKU>\n`;
      if (ean) {
        xml += `    <Ean>${escapeXml(ean)}</Ean>\n`;
      }
      if (mpn) {
        xml += `    <MPN>${escapeXml(mpn)}</MPN>\n`;
      }
      xml += `  </product>\n`;
    }
  }

  xml += `</products>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
