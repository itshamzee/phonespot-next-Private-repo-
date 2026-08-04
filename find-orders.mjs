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
  const orderNumbers = ["S1258", "S1260", "S1261"];
  
  for (const orderNum of orderNumbers) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`ORDER: ${orderNum}`);
    console.log('='.repeat(60));
    
    // Get order basic info
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total,
        created_at,
        customer:customers(id, name, email)
      `)
      .eq("order_number", orderNum)
      .maybeSingle();
    
    if (orderError) {
      console.error(`ERROR fetching order ${orderNum}:`, orderError.message);
      continue;
    }
    
    if (!order) {
      console.log(`Order ${orderNum} not found in database`);
      continue;
    }
    
    console.log(`\nOrder Details:`);
    console.log(`  ID: ${order.id}`);
    console.log(`  Number: ${order.order_number}`);
    console.log(`  Status: ${order.status}`);
    console.log(`  Total: ${order.total} øre (${(order.total / 100).toFixed(2)} DKK)`);
    console.log(`  Created: ${order.created_at}`);
    console.log(`\nCustomer:`);
    console.log(`  Name: ${order.customer?.name}`);
    console.log(`  Email: ${order.customer?.email}`);
    
    // Get items
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        id,
        item_type,
        device_id,
        sku_product_id,
        quantity,
        unit_price,
        device:devices(id, grade, color, storage, selling_price, template:product_templates(id, display_name, brand, model, slug, category)),
        sku_product:sku_products(id, title, slug, brand, category, subcategory)
      `)
      .eq("order_id", order.id);
    
    if (itemsError) {
      console.error(`ERROR fetching items for order ${orderNum}:`, itemsError.message);
      continue;
    }
    
    console.log(`\nOrder Items (${items?.length ?? 0}):`);
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`\n  Item ${i + 1}:`);
        console.log(`    Type: ${item.item_type}`);
        console.log(`    Quantity: ${item.quantity}`);
        console.log(`    Unit Price: ${item.unit_price} øre (${(item.unit_price / 100).toFixed(2)} DKK)`);
        
        if (item.item_type === "device" && item.device) {
          const dev = item.device;
          const tpl = dev.template;
          console.log(`    Device ID: ${dev.id}`);
          console.log(`    Product: ${tpl?.display_name} (${tpl?.brand} ${tpl?.model})`);
          console.log(`    Category: ${tpl?.category}`);
          console.log(`    Slug: ${tpl?.slug}`);
          console.log(`    Template ID: ${tpl?.id}`);
          console.log(`    Grade: ${dev.grade}`);
          console.log(`    Color: ${dev.color}`);
          console.log(`    Storage: ${dev.storage}`);
        } else if (item.item_type === "sku_product" && item.sku_product) {
          const sku = item.sku_product;
          console.log(`    SKU Product ID: ${sku.id}`);
          console.log(`    Title: ${sku.title}`);
          console.log(`    Brand: ${sku.brand}`);
          console.log(`    Category: ${sku.category}`);
          console.log(`    Subcategory: ${sku.subcategory}`);
          console.log(`    Slug: ${sku.slug}`);
        }
      }
    }
  }
})().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
