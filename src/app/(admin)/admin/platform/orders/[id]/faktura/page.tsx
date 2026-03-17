"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  brugtmoms_total: number;
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
    unit_price: number;
    purchase_price: number | null;
    vat_scheme: string | null;
  }>;
}

function formatDKK(ore: number): string {
  return new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" }).format(ore / 100);
}

export default function FakturaPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createBrowserClient();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [items, setItems] = useState<Array<{ name: string; qty: number; price: number; vat: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function loadOrder() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, order_number, status, total, subtotal, discount_amount, shipping_cost,
        brugtmoms_total, created_at, confirmed_at, shipping_address, shipping_method, notes,
        customer:customers(name, email, phone),
        order_items(id, item_type, device_id, sku_product_id, quantity, unit_price, purchase_price, vat_scheme)
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }

    setOrder(data as any);

    // Resolve item names
    const resolvedItems: Array<{ name: string; qty: number; price: number; vat: string }> = [];
    const orderItems = (data as any).order_items || [];

    for (const item of orderItems) {
      if (item.item_type === "device" && item.device_id) {
        const { data: dev } = await supabase
          .from("devices")
          .select("template:product_templates(brand, model, storage), color, condition_grade")
          .eq("id", item.device_id)
          .single();
        const t = (dev as any)?.template;
        const name = t
          ? `${t.brand} ${t.model}${t.storage ? ` ${t.storage}` : ""}${dev?.color ? ` (${dev.color})` : ""}${dev?.condition_grade ? ` — ${dev.condition_grade}` : ""}`
          : "Enhed";
        resolvedItems.push({
          name,
          qty: item.quantity,
          price: item.unit_price,
          vat: item.vat_scheme === "brugtmoms" ? "Brugtmoms" : "Momsfri",
        });
      } else if (item.sku_product_id) {
        const { data: sku } = await supabase
          .from("sku_products")
          .select("title")
          .eq("id", item.sku_product_id)
          .single();
        resolvedItems.push({
          name: sku?.title || "Tilbehor",
          qty: item.quantity,
          price: item.unit_price * item.quantity,
          vat: "25% moms",
        });
      }
    }

    setItems(resolvedItems);
    setLoading(false);

    // Auto-print after load
    setTimeout(() => window.print(), 500);
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Indlaeser faktura...</div>;
  }

  if (!order) {
    return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Ordre ikke fundet</div>;
  }

  const customer = order.customer as any;
  const addr = order.shipping_address || {};
  const orderDate = order.confirmed_at || order.created_at;

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        @page { margin: 20mm; }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: 40, fontFamily: "Arial, sans-serif", fontSize: 14, color: "#333" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "#1a1a2e", letterSpacing: 0.5 }}>PhoneSpot</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>Refurbished Electronics</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#1a1a2e" }}>FAKTURA</div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{order.order_number}</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
              {new Date(orderDate).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div style={{ display: "flex", gap: 40, marginBottom: 32 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase" as const, color: "#999", marginBottom: 6 }}>Fra</div>
            <div style={{ fontWeight: "bold" }}>PhoneSpot / PhoneGo ApS</div>
            <div>CVR: 44780018</div>
            <div>support@phonespot.dk</div>
            <div>phonespot.dk</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase" as const, color: "#999", marginBottom: 6 }}>Til</div>
            <div style={{ fontWeight: "bold" }}>{customer?.name || "—"}</div>
            <div>{customer?.email || "—"}</div>
            {customer?.phone && <div>{customer.phone}</div>}
            {addr.line1 && <div>{addr.line1}</div>}
            {addr.postal_code && addr.city && <div>{addr.postal_code} {addr.city}</div>}
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #1a1a2e" }}>
              <th style={{ textAlign: "left", padding: "8px 0", fontSize: 12, fontWeight: "bold", color: "#1a1a2e" }}>Beskrivelse</th>
              <th style={{ textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: "bold", color: "#1a1a2e", width: 60 }}>Antal</th>
              <th style={{ textAlign: "right", padding: "8px 0", fontSize: 12, fontWeight: "bold", color: "#1a1a2e", width: 100 }}>Moms</th>
              <th style={{ textAlign: "right", padding: "8px 0", fontSize: 12, fontWeight: "bold", color: "#1a1a2e", width: 120 }}>Pris</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px 0" }}>{item.name}</td>
                <td style={{ textAlign: "center", padding: "10px 0" }}>{item.qty}</td>
                <td style={{ textAlign: "right", padding: "10px 0", fontSize: 12, color: "#999" }}>{item.vat}</td>
                <td style={{ textAlign: "right", padding: "10px 0", fontWeight: "bold" }}>{formatDKK(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 250 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
              <span>Subtotal</span>
              <span>{formatDKK(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: "#5A8C6F" }}>
                <span>Rabat</span>
                <span>-{formatDKK(order.discount_amount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
              <span>Fragt</span>
              <span>{order.shipping_cost > 0 ? formatDKK(order.shipping_cost) : "Gratis"}</span>
            </div>
            {order.brugtmoms_total > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, color: "#999" }}>
                <span>Heraf brugtmoms (25%)</span>
                <span>{formatDKK(order.brugtmoms_total)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 16, fontWeight: "bold", borderTop: "2px solid #1a1a2e", marginTop: 4 }}>
              <span>Total</span>
              <span>{formatDKK(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid #eee", fontSize: 11, color: "#999", textAlign: "center" }}>
          PhoneSpot / PhoneGo ApS | CVR: 44780018 | support@phonespot.dk | phonespot.dk
        </div>

        {/* Print button */}
        <div className="no-print" style={{ marginTop: 24, textAlign: "center" }}>
          <button
            onClick={() => window.print()}
            style={{ padding: "10px 24px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}
          >
            Print faktura
          </button>
        </div>
      </div>
    </>
  );
}
