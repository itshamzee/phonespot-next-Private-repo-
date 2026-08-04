import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envContent = readFileSync(resolve(__dirname, ".env.local"), "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const orderIds = [
    "738c679f-3a55-41c2-8136-84a1548c62dc", // S-1258
    "276b1da2-d5c4-4556-aa21-1f6087050231", // S-1260
    "bc44026f-b788-4862-aa17-6e9a5f6a4700", // S-1261
  ];
  
  for (const orderId of orderIds) {
    console.log(`\n${'='.repeat(70)}`);
    
    // Get order
    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, customer:customers(id, name, email)")
      .eq("id", orderId)
      .maybeSingle();
    
    if (!order) {
      console.log(`Order not found: ${orderId}`);
      continue;
    }
    
    console.log(`ORDER: ${order.order_number}`);
    console.log(`Customer: ${order.customer?.name} (${order.customer?.email})`);
    console.log(`Status: ${order.status}`);
    console.log(`Total: ${(order.total / 100).toFixed(2)} DKK`);
    
    // Get items
    const { data: items } = await supabase
      .from("order_items")
      .select(`
        id,
        item_type,
        device_id,
        sku_product_id,
        quantity,
        unit_price,
        device:devices(
          id,
          grade,
          color,
          storage,
          selling_price,
          template:product_templates(id, display_name, brand, model, slug, category)
        ),
        sku_product:sku_products(id, title, slug, brand, category, subcategory)
      `)
      .eq("order_id", orderId);
    
    console.log(`\nItems (${items?.length ?? 0}):`);
    
    if (items && items.length > 0) {
      for (const item of items) {
        console.log(`\n  - Type: ${item.item_type}`);
        console.log(`    Qty: ${item.quantity} x ${(item.unit_price / 100).toFixed(2)} DKK`);
        
        if (item.item_type === "device" && item.device) {
          const dev = item.device;
          const tpl = dev.template;
          console.log(`    Product: ${tpl?.display_name}`);
          console.log(`    Brand/Model: ${tpl?.brand} ${tpl?.model}`);
          console.log(`    Category: ${tpl?.category}`);
          console.log(`    Template ID: ${tpl?.id}`);
          console.log(`    Template Slug: ${tpl?.slug}`);
          console.log(`    Device ID: ${dev.id}`);
          console.log(`    Grade: ${dev.grade}`);
          console.log(`    Color: ${dev.color}`);
          console.log(`    Storage: ${dev.storage}`);
        } else if (item.item_type === "sku_product" && item.sku_product) {
          const sku = item.sku_product;
          console.log(`    SKU Product ID: ${sku.id}`);
          console.log(`    Title: ${sku.title}`);
          console.log(`    Brand: ${sku.brand}`);
          console.log(`    Category/Subcategory: ${sku.category} / ${sku.subcategory}`);
          console.log(`    Slug: ${sku.slug}`);
        }
      }
    }
  }
  
  console.log(`\n${'='.repeat(70)}\n`);
})().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
