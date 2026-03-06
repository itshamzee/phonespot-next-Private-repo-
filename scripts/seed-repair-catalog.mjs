/**
 * Seed script for repair catalog: brands, models, and services.
 * Run: node scripts/seed-repair-catalog.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// ── Parse .env.local manually ────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Helper: slugify ──────────────────────────────────────────────────────
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .replace(/ö/g, 'oe').replace(/ä/g, 'ae').replace(/ü/g, 'ue')
    .replace(/[()".,']/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ══════════════════════════════════════════════════════════════════════════
// BRANDS
// ══════════════════════════════════════════════════════════════════════════
const brands = [
  // Smartphones
  { name: 'iPhone',       slug: 'iphone',       device_type: 'smartphone', sort_order: 1 },
  { name: 'Samsung',      slug: 'samsung',       device_type: 'smartphone', sort_order: 2 },
  { name: 'Google Pixel', slug: 'google-pixel',  device_type: 'smartphone', sort_order: 3 },
  { name: 'OnePlus',      slug: 'oneplus',       device_type: 'smartphone', sort_order: 4 },
  { name: 'Huawei',       slug: 'huawei',        device_type: 'smartphone', sort_order: 5 },
  { name: 'Sony',         slug: 'sony',          device_type: 'smartphone', sort_order: 6 },
  { name: 'Xiaomi',       slug: 'xiaomi',        device_type: 'smartphone', sort_order: 7 },
  { name: 'Motorola',     slug: 'motorola',      device_type: 'smartphone', sort_order: 8 },
  // Tablets
  { name: 'iPad',         slug: 'ipad',          device_type: 'tablet',     sort_order: 1 },
  // Laptops
  { name: 'MacBook',      slug: 'macbook',       device_type: 'laptop',     sort_order: 1 },
  // Watches
  { name: 'Apple Watch',  slug: 'apple-watch',   device_type: 'watch',      sort_order: 1 },
  // Consoles
  { name: 'PlayStation',  slug: 'playstation',   device_type: 'console',    sort_order: 1 },
  { name: 'Nintendo',     slug: 'nintendo',      device_type: 'console',    sort_order: 2 },
];

// ══════════════════════════════════════════════════════════════════════════
// MODELS (keyed by brand slug)
// ══════════════════════════════════════════════════════════════════════════
const modelsByBrand = {
  iphone: [
    'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 Mini',
    'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 Mini',
    'iPhone SE (3. gen)',
    'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
    'iPhone XS Max', 'iPhone XR',
  ],
  samsung: [
    'Galaxy S25 Ultra', 'Galaxy S25+', 'Galaxy S25',
    'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24',
    'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23',
    'Galaxy A55', 'Galaxy A54', 'Galaxy A35', 'Galaxy A34', 'Galaxy A15',
  ],
  ipad: [
    'iPad Pro 13" M4', 'iPad Pro 11" M4', 'iPad Air M2',
    'iPad (10. gen)', 'iPad (9. gen)', 'iPad Mini 6',
  ],
  macbook: [
    'MacBook Pro 16" M4', 'MacBook Pro 14" M4',
    'MacBook Air 15" M3', 'MacBook Air 13" M3',
  ],
  'apple-watch': [
    'Apple Watch Ultra 2', 'Apple Watch Series 9',
    'Apple Watch Series 8', 'Apple Watch SE (2. gen)',
  ],
  'google-pixel': [
    'Pixel 9 Pro', 'Pixel 9', 'Pixel 8 Pro', 'Pixel 8', 'Pixel 7 Pro', 'Pixel 7',
  ],
  oneplus: ['OnePlus 12', 'OnePlus 11', 'OnePlus Nord 3'],
  huawei: ['Huawei P60 Pro', 'Huawei P50 Pro', 'Huawei Mate 50'],
  sony: ['Xperia 1 V', 'Xperia 5 V'],
  xiaomi: ['Xiaomi 14', 'Xiaomi 13T Pro', 'Redmi Note 13'],
  motorola: ['Motorola Edge 40', 'Moto G84'],
  playstation: ['PlayStation 5', 'PlayStation 4'],
  nintendo: ['Nintendo Switch OLED', 'Nintendo Switch'],
};

// ══════════════════════════════════════════════════════════════════════════
// SERVICE TEMPLATES per device_type
// ══════════════════════════════════════════════════════════════════════════
const serviceTemplates = {
  smartphone: [
    { name: 'Skaermskift (Original)', slug: 'skaermskift-original', sort_order: 1 },
    { name: 'Skaermskift (OEM)',      slug: 'skaermskift-oem',      sort_order: 2 },
    { name: 'Batteriskift',           slug: 'batteriskift',          sort_order: 3 },
    { name: 'Opladerstik',            slug: 'opladerstik',           sort_order: 4 },
    { name: 'Bagkamera',              slug: 'bagkamera',             sort_order: 5 },
    { name: 'Frontkamera',            slug: 'frontkamera',           sort_order: 6 },
    { name: 'Bagglas',                slug: 'bagglas',               sort_order: 7 },
    { name: 'Hoejttaler',             slug: 'hoejttaler',            sort_order: 8 },
    { name: 'Mikrofon',               slug: 'mikrofon',              sort_order: 9 },
    { name: 'Power-knap',             slug: 'power-knap',            sort_order: 10 },
    { name: 'Diagnostik',             slug: 'diagnostik',            sort_order: 11 },
    { name: 'Vandskade',              slug: 'vandskade',             sort_order: 12 },
  ],
  tablet: [
    { name: 'Skaermskift', slug: 'skaermskift', sort_order: 1 },
    { name: 'Batteriskift', slug: 'batteriskift', sort_order: 2 },
    { name: 'Opladerstik',  slug: 'opladerstik',  sort_order: 3 },
    { name: 'Hoejttaler',   slug: 'hoejttaler',   sort_order: 4 },
    { name: 'Diagnostik',   slug: 'diagnostik',   sort_order: 5 },
  ],
  laptop: [
    { name: 'Skaermskift', slug: 'skaermskift', sort_order: 1 },
    { name: 'Batteriskift', slug: 'batteriskift', sort_order: 2 },
    { name: 'Tastatur',     slug: 'tastatur',     sort_order: 3 },
    { name: 'Diagnostik',   slug: 'diagnostik',   sort_order: 4 },
  ],
  watch: [
    { name: 'Skaermskift', slug: 'skaermskift', sort_order: 1 },
    { name: 'Batteriskift', slug: 'batteriskift', sort_order: 2 },
    { name: 'Diagnostik',   slug: 'diagnostik',   sort_order: 3 },
  ],
  console: [
    { name: 'HDMI-port',              slug: 'hdmi-port',              sort_order: 1 },
    { name: 'Blaeser',                slug: 'blaeser',                sort_order: 2 },
    { name: 'Termisk pasta',          slug: 'termisk-pasta',          sort_order: 3 },
    { name: 'Controller-reparation',  slug: 'controller-reparation',  sort_order: 4 },
    { name: 'Diagnostik',             slug: 'diagnostik',             sort_order: 5 },
  ],
};

// ══════════════════════════════════════════════════════════════════════════
// PRICING
// ══════════════════════════════════════════════════════════════════════════

// iPhone flagship base prices (generation 0 = newest)
const iphoneFlagshipBase = {
  'skaermskift-original': 2999,
  'skaermskift-oem': 1899,
  'batteriskift': 699,
  'opladerstik': 899,
  'bagkamera': 1299,
  'frontkamera': 899,
  'bagglas': 999,
  'hoejttaler': 599,
  'mikrofon': 599,
  'power-knap': 599,
  'diagnostik': 0,
  'vandskade': 999,
};

/**
 * Return a price multiplier based on model position within the iPhone lineup.
 * group 0 = 16 series, group 1 = 15, group 2 = 14, group 3 = 13, etc.
 * Within a group: Pro Max = 1.0, Pro = 0.95, Plus = 0.90, base = 0.85, Mini = 0.80
 */
function iphoneMultiplier(modelName) {
  // Budget models
  if (/SE|XR/i.test(modelName)) return 0.55;
  if (/XS Max/i.test(modelName)) return 0.60;

  // Determine generation offset
  let genFactor = 1.0;
  if (/\b16\b/.test(modelName)) genFactor = 1.0;
  else if (/\b15\b/.test(modelName)) genFactor = 0.85;
  else if (/\b14\b/.test(modelName)) genFactor = 0.72;
  else if (/\b13\b/.test(modelName)) genFactor = 0.62;
  else if (/\b12\b/.test(modelName)) genFactor = 0.54;
  else if (/\b11\b/.test(modelName)) genFactor = 0.48;

  // Tier within generation
  let tierFactor = 0.85;
  if (/Pro Max/i.test(modelName)) tierFactor = 1.0;
  else if (/Pro/i.test(modelName)) tierFactor = 0.95;
  else if (/Plus/i.test(modelName)) tierFactor = 0.90;
  else if (/Mini/i.test(modelName)) tierFactor = 0.80;

  return genFactor * tierFactor;
}

function samsungMultiplier(modelName) {
  if (/A15/i.test(modelName)) return 0.35;
  if (/A3[45]/i.test(modelName)) return 0.42;
  if (/A5[45]/i.test(modelName)) return 0.48;
  // S-series
  let genFactor = 1.0;
  if (/S25/i.test(modelName)) genFactor = 1.0;
  else if (/S24/i.test(modelName)) genFactor = 0.85;
  else if (/S23/i.test(modelName)) genFactor = 0.72;

  let tierFactor = 0.85;
  if (/Ultra/i.test(modelName)) tierFactor = 1.0;
  else if (/\+/i.test(modelName)) tierFactor = 0.92;

  return genFactor * tierFactor;
}

function otherSmartphoneMultiplier(brandSlug, modelName) {
  // 70-80% of iPhone flagship, then scale within brand
  const brandBase = {
    'google-pixel': 0.75,
    'oneplus': 0.70,
    'huawei': 0.72,
    'sony': 0.70,
    'xiaomi': 0.55,
    'motorola': 0.50,
  };
  let base = brandBase[brandSlug] || 0.65;

  // Newer/Pro models get more, older/budget less
  if (/Pro/i.test(modelName)) base *= 1.05;
  if (/Nord|Redmi|Moto G|Edge 40/i.test(modelName)) base *= 0.75;
  // Second-gen models slightly cheaper
  const nums = modelName.match(/\d+/g);
  if (nums && nums.length > 0) {
    const mainNum = parseInt(nums[0]);
    // Slight scaling for older numbered models
    if (/Pixel/i.test(modelName)) {
      if (mainNum <= 7) base *= 0.88;
      else if (mainNum <= 8) base *= 0.94;
    }
  }
  return base;
}

function roundPrice(price) {
  if (price === 0) return 0;
  // Round to nearest 49 or 99
  const base = Math.round(price / 100) * 100;
  return base - 1; // gives x99
}

function getSmartphonePrice(brandSlug, modelName, serviceSlug) {
  const basePrice = iphoneFlagshipBase[serviceSlug];
  if (basePrice === undefined) return null;
  if (basePrice === 0) return 0;

  let mult;
  if (brandSlug === 'iphone') mult = iphoneMultiplier(modelName);
  else if (brandSlug === 'samsung') mult = samsungMultiplier(modelName);
  else mult = otherSmartphoneMultiplier(brandSlug, modelName);

  return roundPrice(basePrice * mult);
}

// iPad pricing by model index (0 = most expensive)
const iPadPrices = {
  'skaermskift': [2499, 2199, 1799, 1499, 1299, 1499],
  'batteriskift': [999, 999, 799, 699, 699, 699],
  'opladerstik': [899, 899, 699, 599, 599, 599],
  'hoejttaler':  [599, 599, 499, 399, 399, 399],
  'diagnostik':  [0, 0, 0, 0, 0, 0],
};

// MacBook pricing by model index
const macBookPrices = {
  'skaermskift': [4999, 4499, 3499, 2999],
  'batteriskift': [1499, 1399, 1099, 999],
  'tastatur':    [1999, 1799, 1499, 1299],
  'diagnostik':  [0, 0, 0, 0],
};

// Apple Watch pricing by model index
const watchPrices = {
  'skaermskift': [1999, 1499, 1299, 999],
  'batteriskift': [699, 599, 499, 399],
  'diagnostik':  [0, 0, 0, 0],
};

// Console pricing (same for all models)
const consolePrices = {
  'hdmi-port': 799,
  'blaeser': 599,
  'termisk-pasta': 399,
  'controller-reparation': 499,
  'diagnostik': 0,
};

function getPrice(deviceType, brandSlug, modelName, modelIndex, serviceSlug) {
  if (deviceType === 'smartphone') {
    return getSmartphonePrice(brandSlug, modelName, serviceSlug);
  }
  if (deviceType === 'tablet') {
    const arr = iPadPrices[serviceSlug];
    return arr ? (arr[modelIndex] ?? arr[arr.length - 1]) : null;
  }
  if (deviceType === 'laptop') {
    const arr = macBookPrices[serviceSlug];
    return arr ? (arr[modelIndex] ?? arr[arr.length - 1]) : null;
  }
  if (deviceType === 'watch') {
    const arr = watchPrices[serviceSlug];
    return arr ? (arr[modelIndex] ?? arr[arr.length - 1]) : null;
  }
  if (deviceType === 'console') {
    return consolePrices[serviceSlug] ?? null;
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('Seeding repair catalog...\n');

  // 1. Insert brands
  const { data: insertedBrands, error: brandErr } = await supabase
    .from('repair_brands')
    .insert(brands)
    .select();

  if (brandErr) {
    console.error('Error inserting brands:', brandErr);
    process.exit(1);
  }
  console.log(`Inserted ${insertedBrands.length} brands`);

  // Build brand lookup: slug -> { id, device_type }
  const brandLookup = {};
  for (const b of insertedBrands) {
    brandLookup[b.slug] = { id: b.id, device_type: b.device_type };
  }

  // 2. Insert models
  const modelRows = [];
  for (const [brandSlug, models] of Object.entries(modelsByBrand)) {
    const brand = brandLookup[brandSlug];
    if (!brand) {
      console.error(`Brand not found for slug: ${brandSlug}`);
      continue;
    }
    models.forEach((name, idx) => {
      modelRows.push({
        brand_id: brand.id,
        name,
        slug: slugify(name),
        sort_order: idx + 1,
      });
    });
  }

  const { data: insertedModels, error: modelErr } = await supabase
    .from('repair_models')
    .insert(modelRows)
    .select();

  if (modelErr) {
    console.error('Error inserting models:', modelErr);
    process.exit(1);
  }
  console.log(`Inserted ${insertedModels.length} models`);

  // Build model lookup: model.id -> { brand_slug, model_name, model_index }
  // We need brand_slug to determine pricing. Build from brand_id.
  const brandIdToSlug = {};
  for (const b of insertedBrands) {
    brandIdToSlug[b.id] = b.slug;
  }

  // 3. Insert services
  const serviceRows = [];
  for (const model of insertedModels) {
    const brandSlug = brandIdToSlug[model.brand_id];
    const brand = brandLookup[brandSlug];
    const deviceType = brand.device_type;
    const templates = serviceTemplates[deviceType];
    if (!templates) continue;

    // model index within its brand (for array-based pricing)
    const brandModels = modelsByBrand[brandSlug];
    const modelIndex = brandModels ? brandModels.indexOf(model.name) : 0;

    for (const tmpl of templates) {
      const price = getPrice(deviceType, brandSlug, model.name, modelIndex, tmpl.slug);
      serviceRows.push({
        model_id: model.id,
        name: tmpl.name,
        slug: tmpl.slug,
        price_dkk: price,
        sort_order: tmpl.sort_order,
      });
    }
  }

  // Supabase has a row limit per insert; batch in chunks of 500
  let totalServices = 0;
  for (let i = 0; i < serviceRows.length; i += 500) {
    const batch = serviceRows.slice(i, i + 500);
    const { data: inserted, error: svcErr } = await supabase
      .from('repair_services')
      .insert(batch)
      .select();

    if (svcErr) {
      console.error(`Error inserting services batch ${i}:`, svcErr);
      process.exit(1);
    }
    totalServices += inserted.length;
  }
  console.log(`Inserted ${totalServices} services`);

  console.log(`\nSeeded ${insertedBrands.length} brands, ${insertedModels.length} models, ${totalServices} services`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
