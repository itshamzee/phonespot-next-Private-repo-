import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/shopify/client";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json([]);
  }

  try {
    const products = await searchProducts(q);
    // Return a lightweight subset for the search dropdown
    const results = products.slice(0, 8).map((p) => ({
      handle: p.handle,
      title: p.title,
      image: p.images[0]?.url ?? null,
      price: p.priceRange.minVariantPrice.amount,
      compareAtPrice: p.priceRange.maxVariantPrice.amount,
      currency: p.priceRange.minVariantPrice.currencyCode,
      available: p.availableForSale,
      productType: p.productType,
    }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
