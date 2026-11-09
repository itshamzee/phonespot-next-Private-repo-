import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { assertLocationAccess } from "@/lib/pos/pos-context";
import { UNAUTHORIZED, posErrorResponse, requirePosStaff } from "@/lib/pos/route-helpers";
import { isLagersalg } from "@/lib/lagersalg/is-lagersalg";

/**
 * GET /api/pos/lookup?q=<barcode|imei|search>&location_id=<id>
 * Look up a device by barcode/IMEI or search SKU products.
 * Returns matching devices (at this location, status=listed) and SKU products.
 * Devices carry imei, serial_number, blocked and has_purchase_document.
 * Staff only.
 */
export async function GET(request: NextRequest) {
  try {
    const pos = await requirePosStaff(request);
    if (!pos) return UNAUTHORIZED();
    const supabase = createServerClient();

    const { searchParams } = new URL(request.url);
    // Strip characters that would change the meaning of the PostgREST .or() filter below.
    const query = searchParams.get("q")?.replace(/[,()*%\\]/g, " ").trim();
    const locationId = searchParams.get("location_id");

    // Stock in the other stores may be looked up (no location_id), but a named location must be the actor's own.
    if (locationId) await assertLocationAccess(pos.actor, locationId);

    if (!query || query.length < 2) {
      return NextResponse.json({ devices: [], skuProducts: [] });
    }

    // Search devices by barcode or IMEI (exact match) at this location. The purchase
    // document is embedded (same round trip) so the Kasse can warn when it is missing.
    const deviceQuery = supabase
      .from("devices")
      .select(`
        id, barcode, imei, serial_number, grade, storage, color, selling_price, vat_scheme, blocked_at,
        product_templates ( display_name, brand, model ),
        purchase_documents ( id )
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
      .select("id, title, ean, product_number, selling_price, sale_price, category, images, subcategory, attributes")
      .eq("is_active", true)
      .eq("repair_only", false) // reservedele til reparationer vises ikke i kassens søgning
      .or(`ean.eq.${query},product_number.eq.${query},title.ilike.%${query}%`)
      .limit(10);

    return NextResponse.json({
      // blocked_at and the document rows are internal: the Kasse gets two flags.
      devices: ((devices ?? []) as Array<Record<string, unknown>>).map(
        ({ blocked_at, purchase_documents, ...d }) => ({
          ...d,
          blocked: blocked_at != null,
          has_purchase_document: Array.isArray(purchase_documents) ? purchase_documents.length > 0 : purchase_documents != null,
        }),
      ),
      // attributes is internal: only the derived lagersalg flag (3 for 2) goes to the Kasse.
      skuProducts: (skuProducts ?? []).map(({ attributes, ...p }) => ({
        ...p,
        lagersalg: isLagersalg({ subcategory: p.subcategory, attributes: attributes as Record<string, string> | null }),
      })),
    });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved søgning");
  }
}
