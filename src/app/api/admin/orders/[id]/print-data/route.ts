import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  canSee,
  requireStaffScope,
  resolveLocationSlug,
  unauthorizedResponse,
} from "@/lib/auth/store-scope-server";
import { boxesForOrderSkus } from "@/lib/lagersalg/order-boxes";

/**
 * GET /api/admin/orders/[id]/print-data — ordren med linjer og kunde samt de enheder og
 * tilbehørsprodukter linjerne peger på. Bruges af faktura- og pakkeliste-siderne, som før
 * læste orders/devices/sku_products direkte fra browseren (RLS uden policies = tomt svar).
 * Ordrer i andre butikker svarer 404.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const { id } = await params;

  const supabase = createServerClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, total, subtotal, discount_amount, bundle_discount_amount, shipping_cost,
       brugtmoms_total, created_at, confirmed_at, shipping_address, shipping_method, notes, location_id,
       customer:customers(name, email, phone),
       order_items(id, item_type, device_id, sku_product_id, quantity, unit_price, total_price, discount_amount, purchase_price, vat_scheme, upgrade_details, battery_upgrade)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Ordre ikke fundet" }, { status: 404 });

  const { location_id, ...publicOrder } = order as unknown as {
    location_id: string | null;
    order_items: Array<{ device_id: string | null; sku_product_id: string | null }> | null;
  } & Record<string, unknown>;

  const slug = await resolveLocationSlug(location_id);
  if (!canSee(ctx.staff, slug)) return NextResponse.json({ error: "Ordre ikke fundet" }, { status: 404 });

  const items = publicOrder.order_items ?? [];
  const deviceIds = [...new Set(items.map((i) => i.device_id).filter((v): v is string => !!v))];
  const skuIds = [...new Set(items.map((i) => i.sku_product_id).filter((v): v is string => !!v))];

  const [devices, skus] = await Promise.all([
    deviceIds.length
      ? supabase
          .from("devices")
          .select("id, barcode, color, grade, storage, template:product_templates(brand, model, storage)")
          .in("id", deviceIds)
      : Promise.resolve({ data: [] as unknown[] }),
    skuIds.length
      ? supabase.from("sku_products").select("id, title, sku, subcategory, attributes").in("id", skuIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  // attributes forlader aldrig serveren; kun de afledte lagersalg-flag og kassenumre.
  const skuRows = (skus.data ?? []) as Array<{
    id: string;
    subcategory: string | null;
    attributes: Record<string, string> | null;
  }>;
  const { boxes, lagersalg } = await boxesForOrderSkus(supabase as never, {
    orderLocationId: location_id,
    skus: skuRows,
  });
  const publicSkus = skuRows.map(({ attributes: _attributes, ...rest }) => ({
    ...rest,
    lagersalg: lagersalg[rest.id] ?? false,
  }));

  return NextResponse.json(
    { order: publicOrder, devices: devices.data ?? [], skus: publicSkus, boxes },
    { headers: { "Cache-Control": "no-store" } },
  );
}
