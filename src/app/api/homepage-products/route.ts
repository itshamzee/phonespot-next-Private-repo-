import { NextRequest, NextResponse } from "next/server";
import { getHomepageProducts } from "@/lib/home/homepage-products";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "laptops";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "8"), 16);

  const products = await getHomepageProducts(tab, limit);
  return NextResponse.json(products, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
