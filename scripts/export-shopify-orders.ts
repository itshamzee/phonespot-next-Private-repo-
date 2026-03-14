// scripts/export-shopify-orders.ts
// One-time script to export Shopify order history to Supabase.
// Run: npx tsx scripts/export-shopify-orders.ts

import { createAdminClient } from "../src/lib/supabase/admin";

interface ShopifyCustomer {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  variant_id: number | null;
  product_id: number | null;
  sku: string;
}

interface ShopifyShippingLine {
  title: string;
  price: string;
  code: string;
}

interface ShopifyOrder {
  id: number;
  name: string; // e.g. "#1001"
  email: string | null;
  created_at: string;
  closed_at: string | null;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  subtotal_price: string;
  total_discounts: string;
  total_tax: string;
  currency: string;
  customer: ShopifyCustomer | null;
  line_items: ShopifyLineItem[];
  shipping_lines: ShopifyShippingLine[];
  shipping_address: Record<string, string> | null;
  billing_address: Record<string, string> | null;
  note: string | null;
  tags: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

function dkkToOere(dkkString: string): number {
  return Math.round(parseFloat(dkkString) * 100);
}

function mapOrderStatus(order: ShopifyOrder): string {
  if (order.cancelled_at) return "cancelled";
  if (order.financial_status === "refunded") return "refunded";
  if (order.fulfillment_status === "fulfilled") return "delivered";
  if (order.fulfillment_status === "partial") return "shipped";
  if (order.financial_status === "paid") return "confirmed";
  return "pending";
}

function mapPaymentStatus(financialStatus: string): string {
  switch (financialStatus) {
    case "paid":
      return "paid";
    case "refunded":
      return "refunded";
    case "partially_refunded":
      return "partially_refunded";
    default:
      return "pending";
  }
}

function mapFulfillmentStatus(status: string | null): string {
  switch (status) {
    case "fulfilled":
      return "delivered";
    case "partial":
      return "shipped";
    default:
      return "unfulfilled";
  }
}

async function fetchShopifyOrders(
  domain: string,
  accessToken: string,
  limit = 250,
  sinceId?: number,
): Promise<ShopifyOrder[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    status: "any",
  });
  if (sinceId) params.set("since_id", String(sinceId));

  const url = `https://${domain}/admin/api/2024-10/orders.json?${params}`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ShopifyOrdersResponse;
  return json.orders;
}

async function main() {
  const supabase = createAdminClient();
  console.log("Starting Shopify order export...");

  const domain = process.env.SHOPIFY_ADMIN_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

  if (!domain || !accessToken) {
    console.error("SHOPIFY_ADMIN_DOMAIN and SHOPIFY_ADMIN_API_TOKEN must be set.");
    process.exit(1);
  }

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let sinceId: number | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log(
      `Fetching orders${sinceId ? ` after ID ${sinceId}` : " (first page)"}...`,
    );
    const orders = await fetchShopifyOrders(domain, accessToken, 250, sinceId);

    if (orders.length === 0) {
      console.log("No more orders to fetch.");
      break;
    }

    for (const order of orders) {
      try {
        // Check if already imported
        const { data: existing } = await supabase
          .from("orders")
          .select("id")
          .eq("shopify_order_id", String(order.id))
          .maybeSingle();

        if (existing) {
          totalSkipped++;
          continue;
        }

        // Find or create customer
        let customerId: string | null = null;

        if (order.customer?.email) {
          const email = order.customer.email.toLowerCase();

          const { data: existingCustomer } = await supabase
            .from("customers")
            .select("id")
            .eq("email", email)
            .maybeSingle();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const { data: newCustomer, error: customerError } = await supabase
              .from("customers")
              .insert({
                email,
                name:
                  [order.customer.first_name, order.customer.last_name]
                    .filter(Boolean)
                    .join(" ") || email,
                phone: order.customer.phone || "",
              })
              .select("id")
              .single();

            if (customerError) {
              console.error(`  Customer create failed for ${order.name}: ${customerError.message}`);
            } else {
              customerId = newCustomer?.id ?? null;
            }
          }
        }

        // Calculate amounts in øre
        const subtotal = dkkToOere(order.subtotal_price);
        const discountAmount = dkkToOere(order.total_discounts);
        const shippingCost = order.shipping_lines.reduce(
          (sum, sl) => sum + dkkToOere(sl.price),
          0,
        );
        const total = dkkToOere(order.total_price);

        const shippingAddress = order.shipping_address
          ? {
              name: order.shipping_address.name,
              address1: order.shipping_address.address1,
              address2: order.shipping_address.address2,
              city: order.shipping_address.city,
              zip: order.shipping_address.zip,
              country: order.shipping_address.country,
              phone: order.shipping_address.phone,
            }
          : null;

        // Insert order
        const { data: insertedOrder, error: insertError } = await supabase
          .from("orders")
          .insert({
            order_number: order.name.replace("#", "S-"),
            type: "shopify",
            customer_id: customerId,
            status: mapOrderStatus(order),
            payment_status: mapPaymentStatus(order.financial_status),
            fulfillment_status: mapFulfillmentStatus(order.fulfillment_status),
            payment_method: "shopify",
            shipping_method: order.shipping_lines[0]?.title ?? null,
            shipping_address: shippingAddress,
            subtotal,
            discount_amount: discountAmount,
            shipping_cost: shippingCost,
            total,
            shopify_order_id: String(order.id),
            notes: order.note,
            internal_notes: `Imported from Shopify. Tags: ${order.tags}`,
            created_at: order.created_at,
            confirmed_at: order.financial_status === "paid" ? order.created_at : null,
            delivered_at: order.fulfillment_status === "fulfilled" ? (order.closed_at ?? order.created_at) : null,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error(`  Order ${order.name}: ${insertError.message}`);
          totalErrors++;
          continue;
        }

        // Store line items in internal_notes (order_items requires FK refs we don't have)
        if (insertedOrder && order.line_items.length > 0) {
          const lineItemsSummary = order.line_items
            .map((li) => `${li.quantity}x ${li.title} @ ${li.price} DKK`)
            .join("\n");
          await supabase
            .from("orders")
            .update({
              internal_notes: `Imported from Shopify. Tags: ${order.tags}\n\nLine items:\n${lineItemsSummary}`,
            })
            .eq("id", insertedOrder.id);
        }

        totalInserted++;
        if (totalInserted % 25 === 0) {
          console.log(`  Inserted ${totalInserted} orders so far...`);
        }
      } catch (err) {
        console.error(`  Unexpected error for ${order.name}:`, err);
        totalErrors++;
      }
    }

    sinceId = orders[orders.length - 1]!.id;
    if (orders.length < 250) break;
  }

  console.log(
    `\nExport complete: ${totalInserted} inserted, ${totalSkipped} skipped, ${totalErrors} errors.`,
  );
}

main().catch(console.error);
