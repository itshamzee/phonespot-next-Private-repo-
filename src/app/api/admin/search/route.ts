import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// GET /api/admin/search?q=iPhone+14
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json(
      { templates: [], products: [], devices: [], orders: [] },
    );
  }

  const supabase = createServerClient();
  const pattern = `%${q}%`;

  // Run all queries in parallel
  const [templatesRes, productsRes, devicesRes, ordersRes] = await Promise.all([
    // Product templates
    supabase
      .from("product_templates")
      .select("id, display_name, brand")
      .ilike("display_name", pattern)
      .limit(5),

    // SKU products (tilbehoer etc.)
    supabase
      .from("sku_products")
      .select("id, title, sku")
      .ilike("title", pattern)
      .limit(5),

    // Devices — exact match on barcode/imei, OR fuzzy via template name
    (async () => {
      // Try exact barcode/imei match first
      const { data: exactDevices } = await supabase
        .from("devices")
        .select("id, barcode, imei, product_template_id, product_templates(display_name)")
        .or(`barcode.eq.${q},imei.eq.${q}`)
        .limit(5);

      if (exactDevices && exactDevices.length > 0) return { data: exactDevices, error: null };

      // Fall back to searching by template display_name
      const { data: templateIds } = await supabase
        .from("product_templates")
        .select("id")
        .ilike("display_name", pattern)
        .limit(10);

      if (!templateIds || templateIds.length === 0) return { data: [], error: null };

      const ids = templateIds.map((t: { id: string }) => t.id);
      return supabase
        .from("devices")
        .select("id, barcode, imei, product_template_id, product_templates(display_name)")
        .in("product_template_id", ids)
        .limit(5);
    })(),

    // Orders
    supabase
      .from("orders")
      .select("id, order_number, status, total")
      .ilike("order_number", pattern)
      .limit(5),
  ]);

  // Format results with links
  const templates = (templatesRes.data ?? []).map((t: Record<string, unknown>) => ({
    id: t.id,
    label: t.display_name as string,
    sublabel: t.brand as string | undefined,
    link: `/admin/platform/products?edit=${t.id}`,
  }));

  const products = (productsRes.data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id,
    label: p.title as string,
    sublabel: p.sku as string | undefined,
    link: `/admin/platform/products?tab=sku&edit=${p.id}`,
  }));

  const devices = (devicesRes.data ?? []).map((d: Record<string, unknown>) => {
    const tmpl = d.product_templates as { display_name?: string } | null;
    return {
      id: d.id,
      label: tmpl?.display_name ?? (d.barcode as string) ?? "Enhed",
      sublabel: d.barcode ? `${d.barcode}${d.imei ? ` / ${d.imei}` : ""}` : (d.imei as string | undefined),
      link: `/admin/platform/stock/${d.id}`,
    };
  });

  const orders = (ordersRes.data ?? []).map((o: Record<string, unknown>) => ({
    id: o.id,
    label: `Ordre ${o.order_number}`,
    sublabel: o.status as string | undefined,
    link: `/admin/platform/orders/${o.id}`,
  }));

  return NextResponse.json({ templates, products, devices, orders });
}
