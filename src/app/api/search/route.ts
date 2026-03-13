import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/supabase/product-queries";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json([]);
  }

  try {
    const { templates, skuProducts } = await searchProducts(q);

    // Combine templates (devices) and SKU products into a unified result format
    const templateResults = templates.slice(0, 6).map((t) => ({
      handle: t.slug,
      title: t.display_name,
      image: t.images[0] ?? null,
      price: t.base_price_a != null ? (t.base_price_a / 100).toFixed(2) : null,
      compareAtPrice: null,
      currency: "DKK",
      available: true,
      productType: t.category,
      url: `/refurbished/${t.slug}`,
    }));

    const skuResults = skuProducts.slice(0, 4).map((p) => ({
      handle: p.slug,
      title: p.title,
      image: p.images[0] ?? null,
      price: ((p.sale_price ?? p.selling_price) / 100).toFixed(2),
      compareAtPrice:
        p.sale_price != null ? (p.selling_price / 100).toFixed(2) : null,
      currency: "DKK",
      available: p.status === "published",
      productType: p.category ?? "accessory",
      url: p.slug ? `/tilbehoer/${p.category ?? "covers"}/${p.slug}` : null,
    }));

    // Merge and limit to 8 total results
    const results = [...templateResults, ...skuResults].slice(0, 8);

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
