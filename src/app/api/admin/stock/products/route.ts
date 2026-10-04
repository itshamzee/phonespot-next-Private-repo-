import { NextResponse } from "next/server";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { createServerClient } from "@/lib/supabase/client";
import { canReceiveGoods, searchTokens } from "@/lib/stock/overview";

/**
 * GET /api/admin/stock/products?q= — søg i tilbehør/reservedele (navn, EAN, varenr.) til varemodtagelsen.
 * Manager/ejer, fordi svaret indeholder nuværende kostpris.
 */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  if (!canReceiveGoods(ctx.staff)) return NextResponse.json({ error: "Kun managere og ejere" }, { status: 403 });

  const tokens = searchTokens(new URL(request.url).searchParams.get("q"));
  if (tokens.length === 0) return NextResponse.json({ products: [] });

  let query = createServerClient()
    .from("sku_products")
    .select("id, title, ean, product_number, cost_price")
    .eq("is_active", true)
    .order("title", { ascending: true })
    .limit(15);
  for (const t of tokens) query = query.or(`title.ilike.%${t}%,ean.ilike.%${t}%,product_number.ilike.%${t}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Søgningen mislykkedes" }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}
