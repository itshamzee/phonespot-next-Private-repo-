/**
 * Inspect current Shopify products to understand their structure.
 */

const domain = "phonespot.dk";
const token = "85a7df78022ab56bf0a1b7ad24bdc4e0";
const endpoint = `https://${domain}/api/2024-10/graphql.json`;

async function gql(query) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

async function run() {
  // 1. Fetch collections
  const colData = await gql(`{
    collections(first: 20) {
      nodes {
        handle
        title
      }
    }
  }`);

  const collections = colData?.collections?.nodes || [];
  console.log(`\nFound ${collections.length} collections:`);
  for (const c of collections) {
    console.log(`  - ${c.title} (${c.handle})`);
  }

  // 2. Fetch products from each collection
  for (const col of collections) {
    const pData = await gql(`{
      collection(handle: "${col.handle}") {
        products(first: 20) {
          nodes {
            title
            handle
            vendor
            productType
            tags
            variants(first: 50) {
              nodes {
                title
                selectedOptions { name value }
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
                availableForSale
                barcode
                sku
              }
            }
          }
        }
      }
    }`);

    const products = pData?.collection?.products?.nodes || [];
    if (products.length === 0) continue;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Collection: ${col.title} (${col.handle}) — ${products.length} products`);
    console.log("=".repeat(60));

    for (const p of products) {
      const variants = p.variants.nodes;
      console.log(`\n  Product: ${p.title}`);
      console.log(`  Handle:  ${p.handle}`);
      console.log(`  Vendor:  "${p.vendor}" | Type: "${p.productType}"`);
      console.log(`  Tags:    [${p.tags.join(", ")}]`);

      // Check what's missing
      const issues = [];
      if (!p.vendor) issues.push("NO VENDOR");
      if (!p.tags.some((t) => t.startsWith("ean:"))) issues.push("NO EAN TAG");
      if (!p.tags.some((t) => t.startsWith("mpn:"))) issues.push("NO MPN TAG");

      const optionNames = new Set();
      for (const v of variants) {
        for (const o of v.selectedOptions) optionNames.add(o.name);
        if (!v.compareAtPrice) issues.push("NO COMPARE-AT PRICE");
      }

      const hasStand = [...optionNames].some(
        (n) => n.toLowerCase() === "stand",
      );
      const hasSize = [...optionNames].some(
        (n) => n.toLowerCase() === "size" || n.toLowerCase() === "størrelse",
      );
      const hasColor = [...optionNames].some(
        (n) => n.toLowerCase() === "farve" || n.toLowerCase() === "color",
      );

      if (!hasStand) issues.push("NO STAND OPTION");
      if (!hasSize) issues.push("NO SIZE OPTION");

      console.log(`  Options: [${[...optionNames].join(", ")}]`);
      console.log(`  Variants: ${variants.length}`);

      // Show first 3 variants
      for (const v of variants.slice(0, 3)) {
        const opts = v.selectedOptions.map((o) => `${o.name}=${o.value}`).join(", ");
        console.log(
          `    - ${opts} | ${v.price.amount} DKK | Compare: ${v.compareAtPrice?.amount || "NONE"} | SKU: ${v.sku || "NONE"} | EAN: ${v.barcode || "NONE"} | Avail: ${v.availableForSale}`,
        );
      }
      if (variants.length > 3)
        console.log(`    ... +${variants.length - 3} more variants`);

      // Unique issues only
      const uniqueIssues = [...new Set(issues)];
      if (uniqueIssues.length > 0) {
        console.log(`  ⚠ ISSUES: ${uniqueIssues.join(" | ")}`);
      } else {
        console.log(`  ✓ Structure looks good`);
      }
    }
  }
}

run().catch((e) => console.error("Fatal:", e.message));
