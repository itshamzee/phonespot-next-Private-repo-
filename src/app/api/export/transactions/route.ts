import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * GET /api/export/transactions?from=2026-01-01&to=2026-03-31
 * Export transactions as CSV for the accountant.
 *
 * Includes: order number, date, customer, items, prices, VAT scheme,
 * purchase price (for brugtmoms), margin, VAT amount.
 *
 * Access: Owner role only (validated via auth header).
 */
export async function GET(request: NextRequest) {
  const supabase = createServerClient();

  // Validate staff auth
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check owner role
  const { data: staff } = await supabase
    .from("staff")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (!staff || staff.role !== "owner") {
    return NextResponse.json({ error: "Kun ejere kan eksportere transaktioner" }, { status: 403 });
  }

  // Parse date range
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Angiv 'from' og 'to' datoer (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  // Fetch orders with items in date range
  const { data: orders, error: queryError } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      type,
      is_b2b,
      status,
      subtotal,
      discount_amount,
      shipping_cost,
      total,
      brugtmoms_total,
      created_at,
      customers (
        name,
        email
      ),
      order_items (
        item_type,
        quantity,
        unit_price,
        total_price,
        purchase_price,
        vat_scheme,
        devices (
          serial_number,
          imei
        ),
        sku_products (
          title,
          ean
        )
      )
    `)
    .gte("created_at", `${from}T00:00:00`)
    .lte("created_at", `${to}T23:59:59`)
    .in("status", ["confirmed", "shipped", "picked_up", "delivered"])
    .order("created_at", { ascending: true });

  if (queryError) {
    console.error("Transaction export error:", queryError);
    return NextResponse.json({ error: "Eksportfejl" }, { status: 500 });
  }

  // Build CSV
  const headers = [
    "Ordrenummer",
    "Dato",
    "Type",
    "B2B",
    "Kunde",
    "Kunde email",
    "Produkt",
    "Serienummer/IMEI",
    "EAN",
    "Antal",
    "Enhedspris (DKK)",
    "Linjepris (DKK)",
    "Indkøbspris (DKK)",
    "Momsordning",
    "Avance (DKK)",
    "Moms (DKK)",
    "Rabat (DKK)",
    "Fragt (DKK)",
    "Ordretotal (DKK)",
  ];

  const rows: string[][] = [];

  for (const order of orders || []) {
    const customer = order.customers as { name: string; email: string } | null;
    const items = (order.order_items || []) as Array<{
      item_type: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      purchase_price: number | null;
      vat_scheme: string | null;
      devices: { serial_number: string | null; imei: string | null } | null;
      sku_products: { title: string | null; ean: string | null } | null;
    }>;

    for (const item of items) {
      const productName =
        item.item_type === "device"
          ? `Enhed (${item.devices?.serial_number || item.devices?.imei || "N/A"})`
          : item.sku_products?.title || "Ukendt produkt";

      const serialImei =
        item.item_type === "device"
          ? (item.devices?.serial_number || item.devices?.imei || "")
          : "";

      const ean = item.item_type === "sku_product" ? (item.sku_products?.ean || "") : "";

      const purchasePrice = item.purchase_price || 0;
      const margin = item.total_price - purchasePrice;

      // Calculate VAT based on scheme
      let vatAmount: number;
      if (item.vat_scheme === "brugtmoms") {
        vatAmount = Math.max(0, Math.round((margin * 25) / 125));
      } else {
        vatAmount = Math.round((item.total_price * 25) / 125);
      }

      rows.push([
        order.order_number,
        new Date(order.created_at).toLocaleDateString("da-DK"),
        order.type === "pos" ? "Butik" : "Online",
        order.is_b2b ? "Ja" : "Nej",
        customer?.name || "",
        customer?.email || "",
        productName,
        serialImei,
        ean,
        String(item.quantity),
        (item.unit_price / 100).toFixed(2),
        (item.total_price / 100).toFixed(2),
        (purchasePrice / 100).toFixed(2),
        item.vat_scheme === "brugtmoms" ? "Brugtmoms" : "Normal moms",
        (margin / 100).toFixed(2),
        (vatAmount / 100).toFixed(2),
        (order.discount_amount / 100).toFixed(2),
        (order.shipping_cost / 100).toFixed(2),
        (order.total / 100).toFixed(2),
      ]);
    }
  }

  // CSV with BOM for Excel compatibility
  const BOM = "\uFEFF";
  const csvContent =
    BOM +
    headers.join(";") +
    "\n" +
    rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="phonespot-transaktioner-${from}-til-${to}.csv"`,
    },
  });
}
