import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * GET /api/pos/lookup?q=<barcode|imei|search>&location_id=<id>
 * Look up a device by barcode/IMEI or search SKU products.
 * Returns matching devices (at this location, status=listed) and SKU products.
 * Staff only.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: staff } = await supabase
      .from("staff")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const locationId = searchParams.get("location_id");

    if (!query || query.length < 2) {
      return NextResponse.json({ devices: [], skuProducts: [] });
    }

    // Search devices by barcode or IMEI (exact match) at this location
    const deviceQuery = supabase
      .from("devices")
      .select(`
        id, barcode, imei, grade, storage, color, selling_price, vat_scheme,
        product_templates ( display_name, brand, model )
      `)
      .eq("status", "listed")
      .or(`barcode.eq.${query},imei.eq.${query}`);

    if (locationId) {
      deviceQuery.eq("location_id", locationId);
    }

    const { data: devices } = await deviceQuery.limit(10);

    // Search SKU products by title, EAN, or product number (partial match)
    const { data: skuProducts } = await supabase
      .from("sku_products")
      .select("id, title, ean, product_number, selling_price, sale_price, category, images")
      .eq("is_active", true)
      .or(`ean.eq.${query},product_number.eq.${query},title.ilike.%${query}%`)
      .limit(10);

    return NextResponse.json({
      devices: devices ?? [],
      skuProducts: skuProducts ?? [],
    });
  } catch (err) {
    console.error("POS lookup error:", err);
    return NextResponse.json(
      { error: "Fejl ved søgning" },
      { status: 500 }
    );
  }
}
