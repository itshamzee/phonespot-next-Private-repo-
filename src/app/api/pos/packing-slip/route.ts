import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/pos/packing-slip?order_id=xxx
 * Returns an HTML packing slip optimized for Brother QL-1100 (103mm wide labels).
 * Open this URL in a browser and use window.print() to print.
 */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order_id");
  if (!orderId) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, total, subtotal, shipping_cost, discount_amount,
      shipping_method, shipping_address, notes, created_at, confirmed_at,
      customer:customers(name, email, phone),
      order_items(id, item_type, device_id, sku_product_id, quantity, unit_price)
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return new Response("Ordre ikke fundet", { status: 404 });
  }

  const customer = order.customer as any;
  const addr = (order.shipping_address || {}) as Record<string, any>;
  const items = (order.order_items || []) as any[];

  // Resolve item names
  const itemLines: string[] = [];
  for (const item of items) {
    if (item.item_type === "device" && item.device_id) {
      const { data: dev } = await supabase
        .from("devices")
        .select("template:product_templates(brand, model, storage), color, condition_grade, imei")
        .eq("id", item.device_id)
        .single();
      const t = (dev as any)?.template;
      const name = t ? `${t.brand} ${t.model}${t.storage ? ` ${t.storage}` : ""}` : "Enhed";
      const details = [dev?.color, dev?.condition_grade].filter(Boolean).join(" · ");
      const imei = dev?.imei ? `IMEI: ${dev.imei}` : "";
      itemLines.push(`<tr><td style="padding:2px 0"><b>${name}</b>${details ? `<br><span style="color:#666;font-size:10px">${details}</span>` : ""}${imei ? `<br><span style="color:#888;font-size:9px">${imei}</span>` : ""}</td><td style="text-align:right;padding:2px 0">1</td></tr>`);
    } else if (item.sku_product_id) {
      const { data: sku } = await supabase
        .from("sku_products")
        .select("title")
        .eq("id", item.sku_product_id)
        .single();
      itemLines.push(`<tr><td style="padding:2px 0">${sku?.title || "Tilbehør"}</td><td style="text-align:right;padding:2px 0">${item.quantity}</td></tr>`);
    }
  }

  const shippingLabel = getShippingLabel(order.shipping_method);
  const orderDate = order.confirmed_at || order.created_at;
  const fmtDate = new Date(orderDate).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="da">
<head>
<meta charset="utf-8">
<title>Packing Slip — ${order.order_number}</title>
<style>
  @page { size: 103mm auto; margin: 3mm; }
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; width: 97mm; margin: 0 auto; padding: 3mm; }
  h1 { font-size: 16px; margin: 0 0 2px 0; }
  h2 { font-size: 11px; margin: 8px 0 3px 0; text-transform: uppercase; letter-spacing: 0.5px; color: #333; border-bottom: 1px solid #000; padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; }
  .total { font-size: 14px; font-weight: bold; border-top: 2px solid #000; padding-top: 4px; margin-top: 4px; }
  .footer { margin-top: 8px; padding-top: 4px; border-top: 1px solid #ccc; font-size: 9px; color: #666; text-align: center; }
</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>PhoneSpot</h1>
      <div style="font-size:9px;color:#666">Packing Slip</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:14px;font-weight:bold">${order.order_number}</div>
      <div style="font-size:9px;color:#666">${fmtDate}</div>
    </div>
  </div>

  <h2>Kunde</h2>
  <div>
    <b>${customer?.name || "—"}</b><br>
    ${customer?.email || ""}${customer?.phone ? `<br>${customer.phone}` : ""}
    ${addr.line1 ? `<br>${addr.line1}` : ""}
    ${addr.postal_code && addr.city ? `<br>${addr.postal_code} ${addr.city}` : ""}
  </div>

  <h2>Forsendelse</h2>
  <div>${shippingLabel}</div>

  <h2>Varer</h2>
  <table>
    <thead><tr><th style="text-align:left;padding:2px 0;border-bottom:1px solid #ccc">Produkt</th><th style="text-align:right;padding:2px 0;border-bottom:1px solid #ccc">Antal</th></tr></thead>
    <tbody>${itemLines.join("")}</tbody>
  </table>

  <div class="total" style="display:flex;justify-content:space-between">
    <span>Total: ${items.length} ${items.length === 1 ? "vare" : "varer"}</span>
  </div>

  ${order.notes ? `<h2>Note</h2><div style="font-size:10px;color:#333">${order.notes}</div>` : ""}

  <div class="footer">
    PhoneSpot / PhoneGo ApS · CVR 38688766 · phonespot.dk
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function getShippingLabel(method: string | null): string {
  const labels: Record<string, string> = {
    postnord_myparcel: "PostNord MyPack Collect (pakkeshop)",
    postnord_home: "PostNord Hjem-levering",
    gls_parcelshop: "GLS PakkeShop",
    gls_home: "GLS Hjem-levering",
    dao_parcelshop: "DAO Pakkeshop",
    click_collect_cph: "Afhentning — København",
    click_collect_aarhus: "Afhentning — Aarhus",
    click_collect_vejle: "Afhentning — Vejle",
    click_collect_slagelse: "Afhentning — Slagelse",
  };
  return labels[method || ""] || method || "Ikke angivet";
}
