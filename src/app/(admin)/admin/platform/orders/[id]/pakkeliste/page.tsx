"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  confirmed_at: string | null;
  shipping_address: Record<string, any> | null;
  shipping_method: string | null;
  notes: string | null;
  customer: { name: string; email: string; phone: string | null } | null;
  order_items: Array<{
    id: string;
    item_type: string;
    device_id: string | null;
    sku_product_id: string | null;
    quantity: number;
    battery_upgrade: boolean | null;
  }>;
}

interface PackingItem {
  name: string;
  qty: number;
  barcode: string | null;
  batteryUpgrade: boolean;
}

export default function PakkelistePage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createBrowserClient();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [items, setItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function loadOrder() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, order_number, status, total, created_at, confirmed_at,
        shipping_address, shipping_method, notes,
        customer:customers(name, email, phone),
        order_items(id, item_type, device_id, sku_product_id, quantity, battery_upgrade)
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }

    setOrder(data as any);

    // Resolve item names and barcodes
    const resolvedItems: PackingItem[] = [];
    const orderItems = (data as any).order_items || [];

    for (const item of orderItems) {
      if (item.item_type === "device" && item.device_id) {
        const { data: dev } = await supabase
          .from("devices")
          .select("barcode, color, condition_grade, storage, template:product_templates(brand, model, storage)")
          .eq("id", item.device_id)
          .single();
        const t = (dev as any)?.template;
        const storage = dev?.storage || t?.storage;
        const name = t
          ? `${t.brand} ${t.model}${storage ? ` ${storage}` : ""}${dev?.color ? ` (${dev.color})` : ""}${dev?.condition_grade ? ` — ${dev.condition_grade}` : ""}`
          : "Enhed";
        resolvedItems.push({
          name,
          qty: item.quantity,
          barcode: dev?.barcode || null,
          batteryUpgrade: !!item.battery_upgrade,
        });
      } else if (item.sku_product_id) {
        const { data: sku } = await supabase
          .from("sku_products")
          .select("title, sku")
          .eq("id", item.sku_product_id)
          .single();
        resolvedItems.push({
          name: sku?.title || "Tilbehoer",
          qty: item.quantity,
          barcode: sku?.sku || null,
          batteryUpgrade: !!item.battery_upgrade,
        });
      }
    }

    setItems(resolvedItems);
    setLoading(false);

    // Auto-print after load
    setTimeout(() => window.print(), 500);
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Indlaeser pakkeliste...</div>;
  }

  if (!order) {
    return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Ordre ikke fundet</div>;
  }

  const customer = order.customer as any;
  const addr = order.shipping_address || {};
  const orderDate = order.confirmed_at || order.created_at;

  const shippingLabel: Record<string, string> = {
    gls_home: "GLS — Hjemmelevering",
    gls_shop: "GLS — Pakkeshop",
    dao_home: "DAO — Hjemmelevering",
    dao_shop: "DAO — Pakkeshop",
    postnord_home: "PostNord — Hjemmelevering",
    postnord_shop: "PostNord — Pakkeshop",
    pickup: "Afhentning i butik",
  };

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        @page { margin: 15mm; }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: 40, fontFamily: "Arial, sans-serif", fontSize: 14, color: "#333" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "#1a1a2e", letterSpacing: 0.5 }}>PhoneSpot</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>Refurbished Electronics</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#1a1a2e" }}>PAKKELISTE</div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{order.order_number}</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
              {new Date(orderDate).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Customer & Shipping */}
        <div style={{ display: "flex", gap: 40, marginBottom: 28 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase" as const, color: "#999", marginBottom: 6 }}>Kunde</div>
            <div style={{ fontWeight: "bold" }}>{customer?.name || "—"}</div>
            {customer?.email && <div>{customer.email}</div>}
            {customer?.phone && <div>{customer.phone}</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase" as const, color: "#999", marginBottom: 6 }}>Leveringsadresse</div>
            <div style={{ fontWeight: "bold" }}>{addr.name || customer?.name || "—"}</div>
            {addr.line1 && <div>{addr.line1}</div>}
            {addr.line2 && <div>{addr.line2}</div>}
            {(addr.postal_code || addr.city) && <div>{addr.postal_code} {addr.city}</div>}
          </div>
        </div>

        {/* Shipping method */}
        {order.shipping_method && (
          <div style={{ marginBottom: 24, padding: "10px 14px", background: "#f8f8f8", borderRadius: 6, fontSize: 13 }}>
            <span style={{ fontWeight: "bold", color: "#666" }}>Forsendelse: </span>
            {shippingLabel[order.shipping_method] || order.shipping_method}
          </div>
        )}

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #1a1a2e" }}>
              <th style={{ textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: "bold", color: "#1a1a2e", width: 40 }}>&#10003;</th>
              <th style={{ textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: "bold", color: "#1a1a2e", width: 50 }}>Antal</th>
              <th style={{ textAlign: "left", padding: "8px 0", fontSize: 12, fontWeight: "bold", color: "#1a1a2e" }}>Produkt</th>
              <th style={{ textAlign: "left", padding: "8px 0", fontSize: 12, fontWeight: "bold", color: "#1a1a2e", width: 150 }}>Stregkode / SKU</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ textAlign: "center", padding: "12px 0", verticalAlign: "middle" }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    border: "2px solid #666",
                    borderRadius: 3,
                    margin: "0 auto",
                  }} />
                </td>
                <td style={{ textAlign: "center", padding: "12px 0", fontWeight: "bold", fontSize: 15 }}>{item.qty}</td>
                <td style={{ padding: "12px 0" }}>
                  {item.name}
                  {item.batteryUpgrade && (
                    <div className="mt-2 inline-block border-2 border-red-600 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-red-700">
                      &#9889; Skift batteri til 100% f&oslash;r forsendelse
                    </div>
                  )}
                </td>
                <td style={{ padding: "12px 0", fontSize: 12, color: "#666", fontFamily: "monospace" }}>{item.barcode || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Notes */}
        {order.notes && (
          <div style={{ marginBottom: 24, padding: "10px 14px", background: "#fffbe6", border: "1px solid #f0e6b0", borderRadius: 6, fontSize: 13 }}>
            <span style={{ fontWeight: "bold" }}>Bemærkninger: </span>
            {order.notes}
          </div>
        )}

        {/* Summary line */}
        <div style={{ fontSize: 13, color: "#666", marginBottom: 32 }}>
          Antal varer i alt: <strong>{items.reduce((sum, item) => sum + item.qty, 0)}</strong>
        </div>

        {/* Thank you */}
        <div style={{ textAlign: "center", marginTop: 40, paddingTop: 20, borderTop: "1px solid #eee" }}>
          <div style={{ fontSize: 16, fontWeight: "bold", color: "#1a1a2e", marginBottom: 4 }}>Tak for din ordre!</div>
          <div style={{ fontSize: 12, color: "#999" }}>PhoneSpot / PhoneGo ApS | CVR: 38688766 | info@phonespot.dk | phonespot.dk</div>
        </div>

        {/* Print button */}
        <div className="no-print" style={{ marginTop: 24, textAlign: "center" }}>
          <button
            onClick={() => window.print()}
            style={{ padding: "10px 24px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}
          >
            Print pakkeliste
          </button>
        </div>
      </div>
    </>
  );
}
