import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/search?q= — den globale søgning i admin-topbjælken.
 * Søger på det personalet faktisk har i hånden: ordrenummer, kundens navn,
 * mail eller telefon, IMEI/stregkode/serienummer, produktnavn, EAN og
 * sagsnummer. Bag middleware (cookie-session), derfor service-klient.
 */

export interface SearchHit {
  id: string;
  label: string;
  sublabel?: string;
  link: string;
}

export type SearchGroup = "orders" | "customers" | "repairs" | "devices" | "products" | "templates";
export type SearchResponse = Record<SearchGroup, SearchHit[]>;

const EMPTY: SearchResponse = { orders: [], customers: [], repairs: [], devices: [], products: [], templates: [] };
const LIMIT = 5;

const ORDER_STATUS: Record<string, string> = {
  pending: "Afventer",
  confirmed: "Bekræftet",
  shipped: "Afsendt",
  delivered: "Leveret",
  cancelled: "Annulleret",
  refunded: "Refunderet",
  abandoned: "Forladt kurv",
};

function kr(oere: unknown): string {
  return typeof oere === "number" ? `${Math.round(oere / 100).toLocaleString("da-DK")} kr.` : "";
}

export async function GET(req: Request) {
  const raw = (new URL(req.url).searchParams.get("q") ?? "").trim();
  // Tegn med betydning i PostgREST-filtre fjernes, så søgeteksten ikke kan ændre forespørgslen
  const q = raw.replace(/[,()%*\\"]/g, " ").replace(/\s+/g, " ").trim();
  if (q.length < 2) return NextResponse.json(EMPTY);

  const supabase = createAdminClient();
  const like = `%${q}%`;
  const digits = q.replace(/\D/g, "");

  const [orders, customers, repairs, devices, products, templates] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, total, customer:customers(name)")
      .ilike("order_number", like)
      .order("created_at", { ascending: false })
      .limit(LIMIT),

    supabase
      .from("customers")
      .select("id, name, email, phone, company_name")
      .or(`name.ilike.${like},email.ilike.${like},company_name.ilike.${like}${digits.length >= 4 ? `,phone.ilike.%${digits}%` : ""}`)
      .limit(LIMIT),

    supabase
      .from("repair_tickets")
      .select("id, ticket_number, customer_name, device_model, status")
      .or(`customer_name.ilike.${like},device_model.ilike.${like},customer_email.ilike.${like}${/^\d+$/.test(q) ? `,ticket_number.eq.${q}` : ""}`)
      .order("created_at", { ascending: false })
      .limit(LIMIT),

    supabase
      .from("devices")
      .select("id, barcode, imei, serial_number, grade, status, template:product_templates(display_name)")
      .or(`barcode.ilike.${like},imei.ilike.${like},serial_number.ilike.${like}`)
      .limit(LIMIT),

    supabase
      .from("sku_products")
      .select("id, title, category, status, ean, selling_price, sale_price")
      .or(`title.ilike.${like},ean.ilike.${like},barcode.ilike.${like}`)
      .order("status", { ascending: false })
      .limit(LIMIT),

    supabase.from("product_templates").select("id, display_name, brand, status").ilike("display_name", like).limit(LIMIT),
  ]);

  // Kundens ordrer: et navn skal også finde ordren, ikke kun kunden
  let customerOrders: Record<string, unknown>[] = [];
  const customerIds = (customers.data ?? []).map((c) => c.id);
  if ((orders.data ?? []).length < LIMIT && customerIds.length) {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, status, total, customer:customers(name)")
      .in("customer_id", customerIds)
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    customerOrders = (data ?? []) as Record<string, unknown>[];
  }
  const orderRows = [...((orders.data ?? []) as Record<string, unknown>[]), ...customerOrders]
    .filter((o, i, all) => all.findIndex((x) => x.id === o.id) === i)
    .slice(0, LIMIT);

  const response: SearchResponse = {
    orders: orderRows.map((o) => ({
      id: String(o.id),
      label: `Ordre ${o.order_number}`,
      sublabel: [(o.customer as { name?: string } | null)?.name, ORDER_STATUS[String(o.status)] ?? String(o.status), kr(o.total)].filter(Boolean).join(", "),
      link: `/admin/platform/orders/${o.id}`,
    })),
    customers: (customers.data ?? []).map((c) => ({
      id: c.id,
      label: c.name || c.company_name || c.email || "Kunde",
      sublabel: [c.email, c.phone].filter(Boolean).join(", "),
      link: `/admin/kunder/${c.id}`,
    })),
    repairs: (repairs.data ?? []).map((r) => ({
      id: r.id,
      label: `Sag ${r.ticket_number ?? ""} ${r.device_model ?? ""}`.replace(/\s+/g, " ").trim(),
      sublabel: [r.customer_name, r.status].filter(Boolean).join(", "),
      link: `/admin/reparationer/${r.id}`,
    })),
    devices: ((devices.data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
      id: String(d.id),
      label: (d.template as { display_name?: string } | null)?.display_name ?? "Enhed",
      sublabel: [d.barcode, d.imei ? `IMEI ${d.imei}` : null, d.grade ? `Stand ${d.grade}` : null].filter(Boolean).join(", "),
      link: `/admin/platform/stock/${d.id}`,
    })),
    products: (products.data ?? []).map((p) => ({
      id: p.id,
      label: p.title,
      sublabel: [p.status === "published" ? "På webshoppen" : "Kladde", kr(p.sale_price ?? p.selling_price), p.ean].filter(Boolean).join(", "),
      link: p.category === "spare-part" ? `/admin/reservedele/${p.id}` : `/admin/produkter/${p.id}`,
    })),
    templates: (templates.data ?? []).map((t) => ({
      id: t.id,
      label: t.display_name,
      sublabel: [t.brand, t.status === "published" ? "På webshoppen" : "Kladde"].filter(Boolean).join(", "),
      link: `/admin/platform/products?edit=${t.id}`,
    })),
  };

  return NextResponse.json(response);
}
