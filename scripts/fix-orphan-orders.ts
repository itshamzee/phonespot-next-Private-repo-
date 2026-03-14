// scripts/fix-orphan-orders.ts
// Fix orders imported without customer links due to phone NOT NULL constraint.
// Run: npx tsx scripts/fix-orphan-orders.ts

import { createAdminClient } from "../src/lib/supabase/admin";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_ADMIN_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN!;

async function main() {
  const supabase = createAdminClient();

  // Find Shopify orders without customer links
  const { data: orphanOrders, error } = await supabase
    .from("orders")
    .select("id, order_number, shopify_order_id")
    .eq("type", "shopify")
    .is("customer_id", null);

  if (error) {
    console.error("Failed to fetch orphan orders:", error.message);
    return;
  }

  console.log(`Found ${orphanOrders?.length ?? 0} Shopify orders without customer links`);
  if (!orphanOrders || orphanOrders.length === 0) return;

  let fixed = 0;

  for (const order of orphanOrders) {
    // Rate limit: 2 req/sec to stay under Shopify's limit
    await new Promise((r) => setTimeout(r, 600));

    // Fetch order from Shopify to get customer info
    const url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/orders/${order.shopify_order_id}.json?fields=id,customer`;
    let res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN },
    });

    // Retry once on 429
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN },
      });
    }

    if (!res.ok) {
      console.error(`  API error for ${order.order_number}: ${res.status}`);
      continue;
    }

    const json = await res.json();
    const customer = json.order?.customer;
    if (!customer?.email) {
      console.log(`  ${order.order_number}: no customer email, skipping`);
      continue;
    }

    const email = customer.email.toLowerCase();
    const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || email;
    const phone = customer.phone || "";

    // Find or create customer (use empty string for phone if null)
    let customerId: string | null = null;
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from("customers")
        .insert({ email, name, phone })
        .select("id")
        .single();

      if (createErr) {
        console.error(`  Customer create failed for ${email}: ${createErr.message}`);
        continue;
      }
      customerId = created?.id ?? null;
    }

    if (customerId) {
      await supabase.from("orders").update({ customer_id: customerId }).eq("id", order.id);
      fixed++;
    }
  }

  console.log(`Fixed ${fixed} orders`);
}

main().catch(console.error);
