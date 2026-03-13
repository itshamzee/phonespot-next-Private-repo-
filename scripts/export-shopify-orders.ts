// scripts/export-shopify-orders.ts
// One-time script to export Shopify order history to Supabase.
// Run: npx tsx scripts/export-shopify-orders.ts

import { createAdminClient } from "../src/lib/supabase/admin";

/**
 * Shopify Admin REST API response shape (simplified).
 * Extend as needed when running against real credentials.
 */
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
}

interface ShopifyOrder {
  id: number;
  name: string; // e.g. "#1001"
  email: string | null;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  customer: ShopifyCustomer | null;
  line_items: ShopifyLineItem[];
  shipping_address: Record<string, string> | null;
  billing_address: Record<string, string> | null;
  note: string | null;
  tags: string;
}

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
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

  // TODO: Implement when ready to run with real credentials.
  // Set these env vars before running:
  //   SHOPIFY_ADMIN_DOMAIN=your-store.myshopify.com
  //   SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxx
  const domain = process.env.SHOPIFY_ADMIN_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!domain || !accessToken) {
    console.warn(
      "SHOPIFY_ADMIN_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN are not set.\n" +
        "This script is a skeleton — set credentials to run the actual export.",
    );
    console.log("Export complete (dry run — no credentials)");
    return;
  }

  let totalInserted = 0;
  let totalSkipped = 0;
  let sinceId: number | undefined;

  // Paginate through all orders (Shopify max 250 per page, use since_id cursor)
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
        // 1. Find or create customer
        let customerId: string | null = null;

        if (order.customer?.email) {
          const email = order.customer.email.toLowerCase();

          // Check if customer already exists
          const { data: existingCustomer } = await supabase
            .from("customers")
            .select("id")
            .eq("email", email)
            .single();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            // Create customer
            const { data: newCustomer, error: customerError } = await supabase
              .from("customers")
              .insert({
                email,
                name:
                  [
                    order.customer.first_name,
                    order.customer.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ") || email,
                phone: order.customer.phone ?? null,
              })
              .select("id")
              .single();

            if (customerError) {
              console.error(
                `Failed to create customer for order ${order.name}:`,
                customerError.message,
              );
            } else {
              customerId = newCustomer?.id ?? null;
            }
          }
        }

        // 2. Map order to orders table format
        const amountCents = Math.round(parseFloat(order.total_price) * 100);

        const orderRow = {
          type: "shopify" as const,
          shopify_order_id: String(order.id),
          customer_id: customerId,
          status: mapFinancialStatus(order.financial_status),
          amount_cents: amountCents,
          currency: order.currency,
          created_at: order.created_at,
          metadata: {
            shopify_order_name: order.name,
            fulfillment_status: order.fulfillment_status,
            line_items: order.line_items.map((li) => ({
              title: li.title,
              quantity: li.quantity,
              price_cents: Math.round(parseFloat(li.price) * 100),
            })),
            shipping_address: order.shipping_address,
            note: order.note,
            tags: order.tags,
          },
        };

        // 3. Insert order (skip if already exists)
        const { error: insertError } = await supabase
          .from("orders")
          .insert(orderRow)
          .select("id")
          .single();

        if (insertError) {
          if (insertError.code === "23505") {
            // Unique constraint violation — order already imported
            totalSkipped++;
          } else {
            console.error(
              `Failed to insert order ${order.name}:`,
              insertError.message,
            );
          }
        } else {
          totalInserted++;
          if (totalInserted % 50 === 0) {
            console.log(`  Inserted ${totalInserted} orders so far...`);
          }
        }
      } catch (err) {
        console.error(
          `Unexpected error processing order ${order.name}:`,
          err,
        );
      }
    }

    // Advance cursor to last order ID for next page
    sinceId = orders[orders.length - 1]!.id;

    // If we got fewer than 250, we're done
    if (orders.length < 250) break;
  }

  console.log(
    `Export complete: ${totalInserted} inserted, ${totalSkipped} skipped (already exists).`,
  );
}

/**
 * Map Shopify financial_status to our internal order status.
 */
function mapFinancialStatus(status: string): string {
  switch (status) {
    case "paid":
      return "paid";
    case "partially_paid":
      return "partial";
    case "refunded":
      return "refunded";
    case "partially_refunded":
      return "partially_refunded";
    case "pending":
      return "pending";
    case "voided":
      return "cancelled";
    default:
      return "unknown";
  }
}

main().catch(console.error);
