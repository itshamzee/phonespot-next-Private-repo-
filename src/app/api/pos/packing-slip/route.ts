import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BRAND } from "@/lib/email/brand";

export const dynamic = "force-dynamic";

/**
 * GET /api/pos/packing-slip?order_id=xxx
 * Returns a professional branded HTML packing slip optimized for A4 printing.
 * Open this URL in a browser and use window.print() to print.
 */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order_id");
  if (!orderId) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ── Fetch order with items ────────────────────────────────────────────────
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, total, subtotal, shipping_cost, discount_amount,
      shipping_method, shipping_address, tracking_number, tracking_url,
      notes, created_at, confirmed_at,
      customer:customers(name, email, phone),
      order_items(id, item_type, device_id, sku_product_id, quantity, unit_price, total_price, battery_upgrade)
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return new Response(`Ordre ikke fundet (${error?.message || "unknown"})`, { status: 404 });
  }

  const customer = order.customer as any;
  const addr = (order.shipping_address || {}) as Record<string, any>;
  const items = (order.order_items || []) as any[];

  // ── Resolve item details ──────────────────────────────────────────────────
  interface ResolvedItem {
    name: string;
    details: string;
    imageUrl: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    batteryUpgrade: boolean;
  }

  const resolvedItems: ResolvedItem[] = [];

  for (const item of items) {
    if (item.item_type === "device" && item.device_id) {
      const { data: dev } = await supabase
        .from("devices")
        .select("storage, color, grade, photos, template:product_templates(brand, model, display_name, slug, images)")
        .eq("id", item.device_id)
        .single();

      const t = (dev as any)?.template;
      const name = t
        ? `${t.brand} ${t.model}${dev?.storage ? ` ${dev.storage}` : ""}`
        : "Enhed";
      const gradeLabel = dev?.grade ? `Stand ${dev.grade}` : null;
      const details = [gradeLabel, dev?.color].filter(Boolean).join(" · ");

      // Try device photos first, then template images
      let imageUrl: string | null = null;
      if (dev?.photos?.length) {
        imageUrl = dev.photos[0];
      } else if (t?.images?.length) {
        imageUrl = t.images[0];
      }

      resolvedItems.push({
        name,
        details,
        imageUrl,
        quantity: 1,
        unitPrice: item.unit_price,
        totalPrice: item.total_price || item.unit_price,
        batteryUpgrade: !!item.battery_upgrade,
      });
    } else if (item.item_type === "sku_product" && item.sku_product_id) {
      const { data: sku } = await supabase
        .from("sku_products")
        .select("title, images")
        .eq("id", item.sku_product_id)
        .single();

      resolvedItems.push({
        name: sku?.title || "Tilbehør",
        details: "",
        imageUrl: sku?.images?.length ? sku.images[0] : null,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price || item.unit_price * item.quantity,
        batteryUpgrade: !!item.battery_upgrade,
      });
    }
  }

  // ── Format helpers ────────────────────────────────────────────────────────
  const formatKr = (oere: number): string => {
    const kr = oere / 100;
    return new Intl.NumberFormat("da-DK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(kr) + " kr.";
  };

  const shippingLabel = getShippingLabel(order.shipping_method);
  const orderDate = order.confirmed_at || order.created_at;
  const fmtDate = new Date(orderDate).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Product rows ──────────────────────────────────────────────────────────
  const productRows = resolvedItems
    .map((item, i) => {
      const bgColor = i % 2 === 0 ? "#ffffff" : "#f9fafb";
      const imgCell = item.imageUrl
        ? `<img src="${item.imageUrl}" alt="${item.name}" style="width:48px;height:48px;object-fit:contain;border-radius:6px;border:1px solid #e5e7eb;" />`
        : `<div style="width:48px;height:48px;border-radius:6px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="18" r="1"/></svg>
           </div>`;

      const batteryStamp = item.batteryUpgrade
        ? `<div style="margin-top:8px;display:inline-block;border:2px solid #dc2626;padding:4px 12px;font-family:monospace;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#b91c1c;">&#9889; Skift batteri til 100% f&oslash;r forsendelse</div>`
        : "";

      return `
        <tr style="background:${bgColor};">
          <td style="padding:12px 16px;vertical-align:middle;width:64px;">
            ${imgCell}
          </td>
          <td style="padding:12px 8px;vertical-align:middle;">
            <div style="font-weight:600;color:#111;font-size:14px;">${item.name}</div>
            ${item.details ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${item.details}</div>` : ""}
            ${batteryStamp}
          </td>
          <td style="padding:12px 8px;text-align:center;vertical-align:middle;color:#374151;font-size:14px;">
            ${item.quantity}
          </td>
          <td style="padding:12px 8px;text-align:right;vertical-align:middle;color:#374151;font-size:14px;white-space:nowrap;">
            ${formatKr(item.unitPrice)}
          </td>
          <td style="padding:12px 16px;text-align:right;vertical-align:middle;color:#111;font-weight:600;font-size:14px;white-space:nowrap;">
            ${formatKr(item.totalPrice)}
          </td>
        </tr>`;
    })
    .join("");

  // ── Summary rows ──────────────────────────────────────────────────────────
  const summaryRows: string[] = [];

  summaryRows.push(`
    <tr>
      <td style="padding:6px 16px;color:#6b7280;font-size:13px;">Subtotal</td>
      <td style="padding:6px 16px;text-align:right;color:#374151;font-size:13px;">${formatKr(order.subtotal)}</td>
    </tr>`);

  if (order.shipping_cost > 0) {
    summaryRows.push(`
      <tr>
        <td style="padding:6px 16px;color:#6b7280;font-size:13px;">Fragt</td>
        <td style="padding:6px 16px;text-align:right;color:#374151;font-size:13px;">${formatKr(order.shipping_cost)}</td>
      </tr>`);
  } else {
    summaryRows.push(`
      <tr>
        <td style="padding:6px 16px;color:#6b7280;font-size:13px;">Fragt</td>
        <td style="padding:6px 16px;text-align:right;color:#16a34a;font-size:13px;font-weight:500;">Gratis</td>
      </tr>`);
  }

  if (order.discount_amount > 0) {
    summaryRows.push(`
      <tr>
        <td style="padding:6px 16px;color:#6b7280;font-size:13px;">Rabat</td>
        <td style="padding:6px 16px;text-align:right;color:#dc2626;font-size:13px;font-weight:500;">-${formatKr(order.discount_amount)}</td>
      </tr>`);
  }

  // ── Trustpilot QR code ────────────────────────────────────────────────────
  const trustpilotUrl = "https://dk.trustpilot.com/review/phonespot.dk";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(trustpilotUrl)}&color=1A3D2E&bgcolor=ffffff`;

  // ── Build HTML ────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Følgeseddel — ${order.order_number}</title>
<style>
  @page {
    size: A4;
    margin: 20mm 18mm;
  }
  @media print {
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page-break-avoid { break-inside: avoid; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #111;
    background: #fff;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 32px;
    line-height: 1.5;
  }
  table { border-collapse: collapse; }
</style>
</head>
<body>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- PRINT BUTTON -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div class="no-print" style="position:fixed;top:20px;right:20px;z-index:100;">
    <button onclick="window.print()" style="
      background:#1A3D2E;color:#fff;border:none;padding:12px 28px;border-radius:8px;
      font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);
      display:flex;align-items:center;gap:8px;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Udskriv
    </button>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- HEADER -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
    <div>
      <img src="/brand/logos/phonespot-wordmark-dark.png" alt="PhoneSpot" style="height:36px;" />
      <div style="color:#6b7280;font-size:12px;margin-top:6px;letter-spacing:0.5px;text-transform:uppercase;">Følgeseddel</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:22px;font-weight:700;color:#1A3D2E;letter-spacing:-0.5px;">${order.order_number}</div>
      <div style="color:#6b7280;font-size:13px;margin-top:2px;">${fmtDate}</div>
    </div>
  </div>
  <div style="border-bottom:3px solid #1A3D2E;margin-bottom:28px;"></div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- CUSTOMER INFO (2 columns) -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div style="display:flex;gap:40px;margin-bottom:32px;" class="page-break-avoid">
    <div style="flex:1;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1A3D2E;margin-bottom:8px;">Leveres til</div>
      <div style="font-size:14px;line-height:1.6;">
        <div style="font-weight:600;">${customer?.name || "—"}</div>
        ${addr.line1 ? `<div>${addr.line1}</div>` : ""}
        ${addr.line2 ? `<div>${addr.line2}</div>` : ""}
        ${addr.postal_code || addr.city ? `<div>${[addr.postal_code, addr.city].filter(Boolean).join(" ")}</div>` : ""}
        ${addr.country && addr.country !== "Danmark" && addr.country !== "DK" ? `<div>${addr.country}</div>` : ""}
      </div>
    </div>
    <div style="flex:1;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1A3D2E;margin-bottom:8px;">Bestilt af</div>
      <div style="font-size:14px;line-height:1.6;">
        <div style="font-weight:600;">${customer?.name || "—"}</div>
        ${customer?.email ? `<div style="color:#6b7280;">${customer.email}</div>` : ""}
        ${customer?.phone ? `<div style="color:#6b7280;">${customer.phone}</div>` : ""}
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- PRODUCTS TABLE -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div class="page-break-avoid">
    <table style="width:100%;margin-bottom:0;">
      <thead>
        <tr style="border-bottom:2px solid #1A3D2E;">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1A3D2E;" colspan="2">Produkt</th>
          <th style="padding:10px 8px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1A3D2E;">Antal</th>
          <th style="padding:10px 8px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1A3D2E;">Enhedspris</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1A3D2E;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${productRows || `<tr><td colspan="5" style="padding:24px 16px;text-align:center;color:#9ca3af;font-style:italic;">Ingen varer fundet</td></tr>`}
      </tbody>
    </table>

    <!-- Summary -->
    <div style="border-top:2px solid #e5e7eb;margin-top:0;">
      <table style="width:100%;max-width:320px;margin-left:auto;">
        ${summaryRows.join("")}
        <tr style="border-top:2px solid #1A3D2E;">
          <td style="padding:12px 16px;font-size:16px;font-weight:700;color:#1A3D2E;">Total</td>
          <td style="padding:12px 16px;text-align:right;font-size:16px;font-weight:700;color:#1A3D2E;">${formatKr(order.total)}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- SHIPPING -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div style="margin-top:28px;padding:16px 20px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;" class="page-break-avoid">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1A3D2E;margin-bottom:4px;">Forsendelse</div>
        <div style="font-size:14px;color:#374151;">${shippingLabel}</div>
      </div>
      ${order.tracking_number ? `
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1A3D2E;margin-bottom:4px;">Tracking</div>
        <div style="font-size:14px;color:#374151;font-family:monospace;">${order.tracking_number}</div>
      </div>` : ""}
    </div>
  </div>

  ${order.notes ? `
  <!-- Notes -->
  <div style="margin-top:16px;padding:16px 20px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;" class="page-break-avoid">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;margin-bottom:4px;">Note</div>
    <div style="font-size:13px;color:#78350f;">${order.notes}</div>
  </div>` : ""}

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- TRUSTPILOT / THANK YOU BOX -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div style="margin-top:32px;padding:28px 32px;background:#1A3D2E;border-radius:12px;color:#fff;text-align:center;" class="page-break-avoid">
    <div style="font-size:22px;font-weight:700;margin-bottom:6px;">Tak for din ordre!</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-bottom:20px;max-width:420px;margin-left:auto;margin-right:auto;">
      Vi håber du er tilfreds med dit køb. Del gerne din oplevelse på Trustpilot — det betyder meget for os.
    </div>
    <div style="display:inline-block;background:#fff;border-radius:10px;padding:14px;margin-bottom:12px;">
      <img src="${qrUrl}" alt="Trustpilot QR" style="width:100px;height:100px;display:block;" />
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:0.3px;">
      Scan koden for at anmelde os på Trustpilot
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- LEGAL FOOTER -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;" class="page-break-avoid">
    <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">
      PhoneSpot / PhoneGo ApS &middot; CVR ${BRAND.cvr} &middot; phonespot.dk
    </div>
    <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">
      36 måneders garanti &middot; 14 dages fortrydelsesret
    </div>
    <div style="font-size:12px;color:#9ca3af;">
      ${BRAND.phone} &middot; ${BRAND.email}
    </div>
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
    // Current checkout method IDs
    postnord: "PostNord Levering",
    dao: "DAO Pakke",
    pickup_slagelse: "Afhentning — Slagelse",
    pickup_vejle: "Afhentning — Vejle",
    // Legacy method IDs
    postnord_home: "PostNord Hjem-levering",
    postnord_pickup: "PostNord Pakkeshop",
    postnord_myparcel: "PostNord MyPack Collect",
    gls_home: "GLS Hjem-levering",
    gls_pickup: "GLS PakkeShop",
    gls_parcelshop: "GLS PakkeShop",
    dao_pickup: "DAO Pakkeshop",
    dao_parcelshop: "DAO Pakkeshop",
    click_collect_slagelse: "Afhentning — Slagelse",
    click_collect_vejle: "Afhentning — Vejle",
  };
  return labels[method || ""] || method || "Ikke angivet";
}
