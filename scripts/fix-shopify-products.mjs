#!/usr/bin/env node
/**
 * Fix Shopify product data for PriceRunner compatibility and pricing.
 *
 * What it does:
 *   1. Fixes vendor names ("Apple - Iphone" → "Apple", "PhoneSpot" → actual brand)
 *   2. Adds compare-at prices (ny-pris markup on all variants)
 *   3. Adds ean: and mpn: tags for known models
 *   4. Adds product type
 *
 * Usage:
 *   node scripts/fix-shopify-products.mjs shpat_YOUR_TOKEN_HERE
 *
 * Get your token:
 *   Shopify Admin → Settings → Apps → Develop apps → Create app
 *   → Admin API scopes: write_products, read_products
 *   → Install → Copy Admin API access token
 */

const SHOP = "phonespot.dk";
const API_VERSION = "2024-10";
const TOKEN = process.argv[2];

if (!TOKEN || !TOKEN.startsWith("shpat_")) {
  console.error("\n  Usage: node scripts/fix-shopify-products.mjs shpat_YOUR_TOKEN\n");
  process.exit(1);
}

const endpoint = `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`;

// ---------------------------------------------------------------------------
// EAN / MPN lookup for known models (base EAN, first variant)
// ---------------------------------------------------------------------------

const MODEL_DATA = {
  "iphone 14 pro max": { ean: "194253401377", mpn: "MQ9T3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 14 pro": { ean: "194253401155", mpn: "MQ1E3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 14 plus": { ean: "194253374770", mpn: "MQ4D3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 14": { ean: "194253374503", mpn: "MPUF3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 13 pro max": { ean: "194252698822", mpn: "MLKN3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 13 pro": { ean: "194252698563", mpn: "MLVF3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 13 mini": { ean: "194252697276", mpn: "MLK53DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 13": { ean: "194252697009", mpn: "MLPF3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 12 pro max": { ean: "194252021972", mpn: "MGDA3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 12 pro": { ean: "194252021521", mpn: "MGMN3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 12 mini": { ean: "194252015537", mpn: "MGDX3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 12": { ean: "194252031001", mpn: "MGJ53DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 11 pro max": { ean: "190199380356", mpn: "MWHK2DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 11 pro": { ean: "190199380080", mpn: "MWC22DH/A", vendor: "Apple", type: "iPhone" },
  "iphone 11": { ean: "190199220218", mpn: "MHDH3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone xs max": { ean: "190198783066", mpn: "MT502DH/A", vendor: "Apple", type: "iPhone" },
  "iphone xs": { ean: "190198791030", mpn: "MT9E2DH/A", vendor: "Apple", type: "iPhone" },
  "iphone x": { ean: "190198457684", mpn: "MQAC2DH/A", vendor: "Apple", type: "iPhone" },
  "iphone xr": { ean: "190198776433", mpn: "MRY42DH/A", vendor: "Apple", type: "iPhone" },
  "iphone se 2022": { ean: "194253013150", mpn: "MMXL3DH/A", vendor: "Apple", type: "iPhone" },
  "iphone se 2020": { ean: "190199505117", mpn: "MX9R2DH/A", vendor: "Apple", type: "iPhone" },
  "ipad 7": { ean: "190199602038", mpn: "MW742DH/A", vendor: "Apple", type: "iPad" },
  "ipad 8": { ean: "190199741386", mpn: "MYMH2DH/A", vendor: "Apple", type: "iPad" },
  "ipad 6": { ean: "190198647313", mpn: "MR7J2DH/A", vendor: "Apple", type: "iPad" },
  "ipad air 2": { ean: "888462068758", mpn: "MGTX2DH/A", vendor: "Apple", type: "iPad" },
  "ipad pro": { ean: "190198470874", mpn: "MPDY2DH/A", vendor: "Apple", type: "iPad" },
  "airpods 3": { ean: "194252818527", mpn: "MME73DH/A", vendor: "Apple", type: "AirPods" },
};

// ---------------------------------------------------------------------------
// GraphQL helpers
// ---------------------------------------------------------------------------

async function gql(query, variables = {}) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// Fetch all products with pagination
// ---------------------------------------------------------------------------

async function fetchAllProducts() {
  const products = [];
  let cursor = null;

  while (true) {
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const data = await gql(`{
      products(first: 50${afterClause}) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          title
          handle
          vendor
          productType
          tags
          variants(first: 100) {
            nodes {
              id
              price
              compareAtPrice
              barcode
              sku
            }
          }
        }
      }
    }`);

    if (!data?.products) break;
    products.push(...data.products.nodes);

    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }

  return products;
}

// ---------------------------------------------------------------------------
// Find model data by matching product title
// ---------------------------------------------------------------------------

function findModelData(title) {
  const t = title.toLowerCase();
  // Try longest matches first
  const keys = Object.keys(MODEL_DATA).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (t.includes(key)) return MODEL_DATA[key];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fix a single product
// ---------------------------------------------------------------------------

async function fixProduct(product) {
  const fixes = [];
  const model = findModelData(product.title);
  const mutations = [];

  // 1. Fix vendor
  let newVendor = product.vendor;
  if (model?.vendor && product.vendor !== model.vendor) {
    newVendor = model.vendor;
    fixes.push(`vendor: "${product.vendor}" → "${model.vendor}"`);
  } else if (product.vendor.toLowerCase().includes("apple") && product.vendor !== "Apple") {
    newVendor = "Apple";
    fixes.push(`vendor: "${product.vendor}" → "Apple"`);
  }

  // 2. Fix product type
  let newType = product.productType;
  if (model?.type && product.productType !== model.type) {
    newType = model.type;
    fixes.push(`type: "${product.productType}" → "${model.type}"`);
  }

  // 3. Add ean/mpn tags
  const existingTags = product.tags || [];
  const newTags = [...existingTags];
  const hasEan = existingTags.some((t) => t.startsWith("ean:"));
  const hasMpn = existingTags.some((t) => t.startsWith("mpn:"));
  const hasRefurbished = existingTags.some((t) => t.toLowerCase() === "refurbished");

  if (model?.ean && !hasEan) {
    newTags.push(`ean:${model.ean}`);
    fixes.push(`+tag ean:${model.ean}`);
  }
  if (model?.mpn && !hasMpn) {
    newTags.push(`mpn:${model.mpn}`);
    fixes.push(`+tag mpn:${model.mpn}`);
  }
  if (!hasRefurbished && (product.title.toLowerCase().includes("iphone") || product.title.toLowerCase().includes("ipad"))) {
    newTags.push("refurbished");
    fixes.push("+tag refurbished");
  }

  // Update product metadata if anything changed
  if (newVendor !== product.vendor || newType !== product.productType || newTags.length !== existingTags.length) {
    const result = await gql(`
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product { id title vendor productType tags }
          userErrors { field message }
        }
      }
    `, {
      input: {
        id: product.id,
        vendor: newVendor,
        productType: newType,
        tags: newTags,
      },
    });

    if (result?.productUpdate?.userErrors?.length > 0) {
      console.error(`    Errors:`, result.productUpdate.userErrors);
    }
  }

  // 4. Add compare-at prices to variants that don't have them
  // Compare-at price = "Som ny" price × 1.5 (simulates new price)
  const variants = product.variants.nodes;
  const highestPrice = Math.max(...variants.map((v) => parseFloat(v.price)));
  const compareAtBase = Math.round(highestPrice * 1.5);

  for (const variant of variants) {
    if (!variant.compareAtPrice) {
      const variantInput = {
        id: variant.id,
        compareAtPrice: compareAtBase.toFixed(2),
      };

      // Also set barcode if we have an EAN and variant doesn't have one
      if (model?.ean && !variant.barcode) {
        variantInput.barcode = model.ean;
      }

      await gql(`
        mutation productVariantUpdate($input: ProductVariantInput!) {
          productVariantUpdate(input: $input) {
            productVariant { id }
            userErrors { field message }
          }
        }
      `, { input: variantInput });

      fixes.push(`variant compareAt → ${compareAtBase} kr`);
      break; // Only log once, but update all
    }
  }

  // Update remaining variants without compareAt (silently)
  for (const variant of variants) {
    if (!variant.compareAtPrice) {
      const input = {
        id: variant.id,
        compareAtPrice: compareAtBase.toFixed(2),
      };
      if (model?.ean && !variant.barcode) {
        input.barcode = model.ean;
      }
      await gql(`
        mutation productVariantUpdate($input: ProductVariantInput!) {
          productVariantUpdate(input: $input) {
            productVariant { id }
            userErrors { field message }
          }
        }
      `, { input });
    }
  }

  return fixes;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\nPhoneSpot Shopify Product Fixer");
  console.log("================================\n");

  console.log("  Fetching all products...");
  const products = await fetchAllProducts();
  console.log(`  Found ${products.length} products\n`);

  let fixed = 0;
  let totalFixes = 0;

  for (const product of products) {
    const fixes = await fixProduct(product);
    if (fixes.length > 0) {
      console.log(`  ${product.title}`);
      for (const fix of [...new Set(fixes)]) {
        console.log(`    - ${fix}`);
      }
      fixed++;
      totalFixes += fixes.length;
    }
  }

  console.log("\n================================");
  console.log(`  Products fixed: ${fixed}/${products.length}`);
  console.log(`  Total fixes applied: ${totalFixes}`);
  console.log("\n  Done!\n");
}

main().catch((e) => {
  console.error("\n  Fatal error:", e.message);
  process.exit(1);
});
