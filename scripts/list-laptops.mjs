#!/usr/bin/env node
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
if (!TOKEN) { console.error("Set SHOPIFY_ADMIN_API_TOKEN env var"); process.exit(1); }
const SHOP = "c47a26-4.myshopify.com";
const API = `https://${SHOP}/admin/api/2024-01`;

async function main() {
  let products = [];
  let url = `${API}/products.json?limit=250`;
  while (url) {
    const r = await fetch(url, { headers: { "X-Shopify-Access-Token": TOKEN } });
    const link = r.headers.get("link");
    const d = await r.json();
    products.push(...d.products);
    url = null;
    if (link) {
      const next = link.match(/<([^>]+)>;\s*rel="next"/);
      if (next) url = next[1];
    }
  }

  const laptops = products.filter((p) => {
    const t = p.title.toLowerCase();
    const type = (p.product_type || "").toLowerCase();
    return (
      t.includes("macbook") || t.includes("thinkpad") || t.includes("lenovo") ||
      t.includes("elitebook") || t.includes("hp ") || t.includes("probook") ||
      t.includes("ideapad") || t.includes("laptop") ||
      type.includes("computer") || type.includes("laptop") || type.includes("baerbar")
    );
  });

  console.log(`Total laptops: ${laptops.length}\n`);

  // Sort by lowest price
  laptops.sort((a, b) => {
    const pa = Math.min(...a.variants.map((v) => parseFloat(v.price)).filter((x) => x > 0));
    const pb = Math.min(...b.variants.map((v) => parseFloat(v.price)).filter((x) => x > 0));
    return pa - pb;
  });

  for (const p of laptops) {
    const prices = p.variants.map((v) => parseFloat(v.price)).filter((x) => x > 0);
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const priceStr = low === high ? `${low}` : `${low}-${high}`;
    console.log(`${priceStr} DKK | ${p.title} [${p.status}] | Type: ${p.product_type || "(none)"} | Variants: ${p.variants.length}`);
  }
}

main().catch((e) => console.error(e));
