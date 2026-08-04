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
  console.log("Searching for orders with S1258, S1260, S1261...\n");
  
  // Try partial match with ILIKE
  const { data: allOrders, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at, customer:customers(name, email)")
    .or("order_number.ilike.%S1258%,order_number.ilike.%S1260%,order_number.ilike.%S1261%")
    .order("created_at", { ascending: false })
    .limit(20);
  
  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
  
  console.log(`Found ${allOrders?.length ?? 0} order(s)\n`);
  
  if (allOrders && allOrders.length > 0) {
    console.log(JSON.stringify(allOrders, null, 2));
  } else {
    console.log("No orders found with those numbers.");
    console.log("\nTrying to list all recent orders...");
    const { data: recent } = await supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, customer:customers(name, email)")
      .order("created_at", { ascending: false })
      .limit(10);
    console.log(`Recent orders:\n${JSON.stringify(recent, null, 2)}`);
  }
})().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
