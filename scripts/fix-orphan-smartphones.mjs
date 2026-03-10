#!/usr/bin/env node
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
if (!TOKEN) { console.error("Set SHOPIFY_ADMIN_API_TOKEN env var"); process.exit(1); }
const SHOP = "c47a26-4.myshopify.com";
const API = `https://${SHOP}/admin/api/2024-01`;

const ORPHANS = [
  "motorola-moto-g24-64gb-3gb",
  "oneplus-10-pro-5g-256gb-12gb-rom",
  "xiaomi-redmi-a3-64gb-3gb",
];

async function main() {
  // Get all products
  const res = await fetch(`${API}/products.json?limit=250&status=active`, {
    headers: { "X-Shopify-Access-Token": TOKEN },
  });
  const data = await res.json();
  const products = data.products;

  // Check the smart collection rules for "smartphones"
  const smartRes = await fetch(`${API}/smart_collections.json?handle=smartphones`, {
    headers: { "X-Shopify-Access-Token": TOKEN },
  });
  const smartData = await smartRes.json();
  const smartCollection = smartData.smart_collections?.[0];
  if (smartCollection) {
    console.log("Smartphones smart collection rules:");
    console.log(JSON.stringify(smartCollection.rules, null, 2));
    console.log("");
  }

  // Check what product_type the working smartphones have
  const working = products.filter((p) => {
    const t = p.title.toLowerCase();
    return t.includes("samsung galaxy a40") || t.includes("huawei p40") || t.includes("oneplus 10t") || t.includes("xiaomi redmi note 13");
  });
  console.log("Working smartphones product_type values:");
  for (const p of working) {
    console.log(`  ${p.title} -> product_type: "${p.product_type}" | tags: "${p.tags}"`);
  }

  console.log("");

  // Check orphans
  const orphans = products.filter((p) => ORPHANS.includes(p.handle));
  console.log("Orphan products:");
  for (const p of orphans) {
    console.log(`  ${p.title} -> product_type: "${p.product_type}" | tags: "${p.tags}"`);
  }

  // Fix orphans - set product_type to match working ones
  if (working.length > 0) {
    const targetType = working[0].product_type;
    console.log(`\nSetting orphan product_type to: "${targetType}"`);

    for (const p of orphans) {
      if (p.product_type === targetType) {
        console.log(`  ${p.title} already has correct type`);
        continue;
      }

      const updateRes = await fetch(`${API}/products/${p.id}.json`, {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product: { id: p.id, product_type: targetType },
        }),
      });

      if (updateRes.ok) {
        console.log(`  Updated ${p.title} product_type to "${targetType}"`);
      } else {
        const err = await updateRes.text();
        console.log(`  Failed ${p.title}: ${err}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log("\nDone!");
}

main().catch((e) => console.error(e));
