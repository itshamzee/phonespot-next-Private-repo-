/**
 * Seed Apple Watch products into Medusa.
 *
 * Usage:
 *   node scripts/seed-apple-watches.mjs <AUTH_TOKEN>
 *
 * Get your auth token:
 *   1. Log into Medusa Admin dashboard
 *   2. Open DevTools (F12) → Network tab
 *   3. Click any request → copy the "Authorization: Bearer <token>" value
 *   4. Pass just the token (without "Bearer ")
 */

const BACKEND_URL = "https://soaked-camera-console.medusajs.app";
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error("\n  Usage: node scripts/seed-apple-watches.mjs <AUTH_TOKEN>\n");
  console.error("  Get your token from Medusa Admin → DevTools → Network → Authorization header\n");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Product definitions
// ---------------------------------------------------------------------------

const WATCHES = [
  {
    title: "Apple Watch Series 3",
    handle: "apple-watch-series-3",
    description: "Apple Watch Series 3 — den perfekte start på dit Apple Watch-eventyr. GPS, pulsmåler og vandtæt til svømning. Ideel til fitness-tracking og daglig brug.",
    sizes: ["38mm", "42mm"],
    basePriceSomNy: 799,
  },
  {
    title: "Apple Watch Series 4",
    handle: "apple-watch-series-4",
    description: "Apple Watch Series 4 med større display og ECG-funktion. Falddetektion, optisk pulssensor og elektrisk pulssensor. Et stort spring i sundhedsfunktioner.",
    sizes: ["40mm", "44mm"],
    basePriceSomNy: 999,
  },
  {
    title: "Apple Watch Series 5",
    handle: "apple-watch-series-5",
    description: "Apple Watch Series 5 med Always-On Retina-display. Kompas, ECG og faldregistrering. Holdt trit med din daglige træning og sundhed.",
    sizes: ["40mm", "44mm"],
    basePriceSomNy: 1199,
  },
  {
    title: "Apple Watch Series 6",
    handle: "apple-watch-series-6",
    description: "Apple Watch Series 6 med blodiltmåler (SpO2) og Always-On Retina-display. S6-chip med 20% hurtigere ydeevne. Den ultimative sundheds- og fitnesspartner.",
    sizes: ["40mm", "44mm"],
    basePriceSomNy: 1399,
  },
  {
    title: "Apple Watch SE (1. generation)",
    handle: "apple-watch-se-1st-gen",
    description: "Apple Watch SE — alle de vigtigste funktioner til en fantastisk pris. Stor Retina-display, pulsmåler, GPS og vandtæt. Perfekt til dem der vil starte med Apple Watch.",
    sizes: ["40mm", "44mm"],
    basePriceSomNy: 1099,
  },
  {
    title: "Apple Watch SE (2. generation)",
    handle: "apple-watch-se-2nd-gen",
    description: "Apple Watch SE 2. generation med S8-chip, kolliderings­detektion og forbedret træningstracking. Alt hvad du har brug for — uden at bryde budgettet.",
    sizes: ["40mm", "44mm"],
    basePriceSomNy: 1499,
  },
  {
    title: "Apple Watch Series 7",
    handle: "apple-watch-series-7",
    description: "Apple Watch Series 7 med det hidtil største og mest holdbare display. Hurtigere opladning, IP6X-støvtæthed og WR50-vandtæthed. Krystalklart Always-On display.",
    sizes: ["41mm", "45mm"],
    basePriceSomNy: 1599,
  },
  {
    title: "Apple Watch Series 8",
    handle: "apple-watch-series-8",
    description: "Apple Watch Series 8 med temperatur­sensor, kolliderings­detektion og avanceret trænings­tracking. Always-On Retina display og S8-chip. Din mest avancerede sundhedskammerat.",
    sizes: ["41mm", "45mm"],
    basePriceSomNy: 1899,
  },
  {
    title: "Apple Watch Series 9",
    handle: "apple-watch-series-9",
    description: "Apple Watch Series 9 med S9-chip og dobbeltknips-gestus. Lysere Always-On display (2000 nits), præcis GPS med dobbeltfrekvent og avancerede sundhedssensorer.",
    sizes: ["41mm", "45mm"],
    basePriceSomNy: 2299,
  },
  {
    title: "Apple Watch Ultra",
    handle: "apple-watch-ultra",
    description: "Apple Watch Ultra — designet til ekstreme eventyr. 49mm titaniumkabinet, 100m vandtæt, dobbelfrekvens-GPS og op til 36 timers batteri. Til dem der kræver det allerbedste.",
    sizes: ["49mm"],
    basePriceSomNy: 3499,
  },
  {
    title: "Apple Watch Ultra 2",
    handle: "apple-watch-ultra-2",
    description: "Apple Watch Ultra 2 med S9-chip, 3000 nits display og dobbeltknips-gestus. Præcis dobbelfrekvens-GPS, 100m vandtæt og 72 timers batteri med strømsparetilstand.",
    sizes: ["49mm"],
    basePriceSomNy: 4299,
  },
];

const GRADES = [
  { label: "Som ny", discount: 0 },
  { label: "God stand", discount: 0.16 },
  { label: "Okay stand", discount: 0.32 },
];

// Larger size costs a bit more
const SIZE_PREMIUM = {
  "38mm": 0, "40mm": 0, "41mm": 0,
  "42mm": 100, "44mm": 100, "45mm": 100, "49mm": 0,
};

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function api(method, path, body) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TOKEN}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`  ✗ ${method} ${path} → ${res.status}`);
    console.error(`    ${text.slice(0, 300)}`);
    return null;
  }
  return text ? JSON.parse(text) : {};
}

// ---------------------------------------------------------------------------
// Get or find the Danish region + sales channel
// ---------------------------------------------------------------------------

async function getDanishRegionId() {
  const data = await api("GET", "/admin/regions?limit=50");
  if (!data) throw new Error("Cannot fetch regions");
  const region = data.regions.find(
    (r) => r.currency_code === "dkk" || r.name?.toLowerCase().includes("dan"),
  );
  if (!region) throw new Error("No Danish region found — create one in Medusa Admin first");
  return region.id;
}

async function getSalesChannelId() {
  const data = await api("GET", "/admin/sales-channels?limit=10");
  if (!data) throw new Error("Cannot fetch sales channels");
  const channel = data.sales_channels?.[0];
  if (!channel) throw new Error("No sales channel found");
  return channel.id;
}

async function getOrCreateCollection() {
  // Check if smartwatches collection exists
  const data = await api("GET", "/admin/collections?limit=50");
  if (!data) throw new Error("Cannot fetch collections");
  const existing = data.collections?.find(
    (c) => c.handle === "smartwatches" || c.title?.toLowerCase().includes("smartwatch"),
  );
  if (existing) {
    console.log(`  ✓ Using existing collection: ${existing.title} (${existing.id})`);
    return existing.id;
  }

  // Create it
  const created = await api("POST", "/admin/collections", {
    title: "Smartwatches",
    handle: "smartwatches",
  });
  if (!created) throw new Error("Cannot create collection");
  console.log(`  ✓ Created collection: Smartwatches (${created.collection.id})`);
  return created.collection.id;
}

// ---------------------------------------------------------------------------
// Create a single product with all its variants
// ---------------------------------------------------------------------------

async function createProduct(watch, regionId, salesChannelId, collectionId) {
  console.log(`\n  Creating: ${watch.title}...`);

  // Build variant data
  const variants = [];
  for (const size of watch.sizes) {
    for (const grade of GRADES) {
      const basePrice = watch.basePriceSomNy + (SIZE_PREMIUM[size] || 0);
      const price = Math.round(basePrice * (1 - grade.discount));

      variants.push({
        title: `${size} — ${grade.label}`,
        manage_inventory: false,
        prices: [
          {
            amount: price * 100, // Medusa uses cents
            currency_code: "dkk",
          },
        ],
        options: {
          Size: size,
          Stand: grade.label,
        },
      });
    }
  }

  const payload = {
    title: watch.title,
    handle: watch.handle,
    description: watch.description,
    status: "published",
    collection_id: collectionId,
    sales_channels: [{ id: salesChannelId }],
    tags: [
      { value: "grade-a" },
      { value: "grade-b" },
      { value: "grade-c" },
    ],
    type: { value: "Apple Watch" },
    options: [
      { title: "Size", values: watch.sizes },
      { title: "Stand", values: GRADES.map((g) => g.label) },
    ],
    variants,
  };

  const result = await api("POST", "/admin/products", payload);
  if (!result) {
    console.error(`  ✗ Failed to create ${watch.title}`);
    return null;
  }

  const product = result.product;
  console.log(`  ✓ ${product.title} — ${product.variants?.length ?? 0} variants`);
  return product;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n🍏 PhoneSpot Apple Watch Seeder");
  console.log("================================\n");
  console.log(`  Backend: ${BACKEND_URL}`);

  // Test auth
  console.log("\n  Testing authentication...");
  const me = await api("GET", "/admin/users/me");
  if (!me) {
    console.error("\n  ✗ Authentication failed. Check your token.\n");
    console.error("  How to get a token:");
    console.error("  1. Log into Medusa Admin");
    console.error("  2. Open DevTools (F12) → Network tab");
    console.error("  3. Copy the Authorization header value (without 'Bearer ')\n");
    process.exit(1);
  }
  console.log(`  ✓ Logged in as: ${me.user?.email || me.user?.id || "admin"}`);

  // Get infrastructure
  console.log("\n  Setting up...");
  const regionId = await getDanishRegionId();
  console.log(`  ✓ Danish region: ${regionId}`);

  const salesChannelId = await getSalesChannelId();
  console.log(`  ✓ Sales channel: ${salesChannelId}`);

  const collectionId = await getOrCreateCollection();

  // Create all products
  console.log("\n  Creating Apple Watch products...");
  let created = 0;
  let totalVariants = 0;

  for (const watch of WATCHES) {
    const product = await createProduct(watch, regionId, salesChannelId, collectionId);
    if (product) {
      created++;
      totalVariants += product.variants?.length ?? 0;
    }
  }

  console.log("\n================================");
  console.log(`  ✓ Created ${created}/${WATCHES.length} products`);
  console.log(`  ✓ Total variants: ${totalVariants}`);
  console.log(`  ✓ Collection: smartwatches`);
  console.log("\n  Next: Add product images in Medusa Admin\n");
}

main().catch((err) => {
  console.error("\n  Fatal error:", err.message);
  process.exit(1);
});
