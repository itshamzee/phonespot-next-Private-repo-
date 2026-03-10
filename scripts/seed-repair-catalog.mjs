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
// MODELS (keyed by brand slug) — each entry: { name, series }
// ══════════════════════════════════════════════════════════════════════════
const modelsByBrand = {
  iphone: [
    // iPhone 17
    { name: 'iPhone 17 Pro Max', series: 'iPhone 17' },
    { name: 'iPhone 17 Pro', series: 'iPhone 17' },
    { name: 'iPhone 17 Air', series: 'iPhone 17' },
    { name: 'iPhone 17', series: 'iPhone 17' },
    // iPhone 16
    { name: 'iPhone 16 Pro Max', series: 'iPhone 16' },
    { name: 'iPhone 16 Pro', series: 'iPhone 16' },
    { name: 'iPhone 16 Plus', series: 'iPhone 16' },
    { name: 'iPhone 16', series: 'iPhone 16' },
    { name: 'iPhone 16e', series: 'iPhone 16' },
    // iPhone 15
    { name: 'iPhone 15 Pro Max', series: 'iPhone 15' },
    { name: 'iPhone 15 Pro', series: 'iPhone 15' },
    { name: 'iPhone 15 Plus', series: 'iPhone 15' },
    { name: 'iPhone 15', series: 'iPhone 15' },
    // iPhone 14
    { name: 'iPhone 14 Pro Max', series: 'iPhone 14' },
    { name: 'iPhone 14 Pro', series: 'iPhone 14' },
    { name: 'iPhone 14 Plus', series: 'iPhone 14' },
    { name: 'iPhone 14', series: 'iPhone 14' },
    // iPhone 13
    { name: 'iPhone 13 Pro Max', series: 'iPhone 13' },
    { name: 'iPhone 13 Pro', series: 'iPhone 13' },
    { name: 'iPhone 13', series: 'iPhone 13' },
    { name: 'iPhone 13 Mini', series: 'iPhone 13' },
    // iPhone 12
    { name: 'iPhone 12 Pro Max', series: 'iPhone 12' },
    { name: 'iPhone 12 Pro', series: 'iPhone 12' },
    { name: 'iPhone 12', series: 'iPhone 12' },
    { name: 'iPhone 12 Mini', series: 'iPhone 12' },
    // iPhone 11
    { name: 'iPhone 11 Pro Max', series: 'iPhone 11' },
    { name: 'iPhone 11 Pro', series: 'iPhone 11' },
    { name: 'iPhone 11', series: 'iPhone 11' },
    // iPhone SE & older
    { name: 'iPhone SE (3. gen)', series: 'iPhone SE & Ældre' },
    { name: 'iPhone SE (2. gen)', series: 'iPhone SE & Ældre' },
    { name: 'iPhone XS Max', series: 'iPhone SE & Ældre' },
    { name: 'iPhone XS', series: 'iPhone SE & Ældre' },
    { name: 'iPhone XR', series: 'iPhone SE & Ældre' },
    { name: 'iPhone X', series: 'iPhone SE & Ældre' },
    { name: 'iPhone 8 Plus', series: 'iPhone SE & Ældre' },
    { name: 'iPhone 8', series: 'iPhone SE & Ældre' },
  ],
  samsung: [
    // S-serien
    { name: 'Galaxy S25 Ultra', series: 'Galaxy S-serien' },
    { name: 'Galaxy S25+', series: 'Galaxy S-serien' },
    { name: 'Galaxy S25', series: 'Galaxy S-serien' },
    { name: 'Galaxy S24 Ultra', series: 'Galaxy S-serien' },
    { name: 'Galaxy S24+', series: 'Galaxy S-serien' },
    { name: 'Galaxy S24', series: 'Galaxy S-serien' },
    { name: 'Galaxy S24 FE', series: 'Galaxy S-serien' },
    { name: 'Galaxy S23 Ultra', series: 'Galaxy S-serien' },
    { name: 'Galaxy S23+', series: 'Galaxy S-serien' },
    { name: 'Galaxy S23', series: 'Galaxy S-serien' },
    { name: 'Galaxy S23 FE', series: 'Galaxy S-serien' },
    { name: 'Galaxy S22 Ultra', series: 'Galaxy S-serien' },
    { name: 'Galaxy S22+', series: 'Galaxy S-serien' },
    { name: 'Galaxy S22', series: 'Galaxy S-serien' },
    { name: 'Galaxy S21 Ultra', series: 'Galaxy S-serien' },
    { name: 'Galaxy S21+', series: 'Galaxy S-serien' },
    { name: 'Galaxy S21', series: 'Galaxy S-serien' },
    { name: 'Galaxy S21 FE', series: 'Galaxy S-serien' },
    { name: 'Galaxy S20 Ultra', series: 'Galaxy S-serien' },
    { name: 'Galaxy S20+', series: 'Galaxy S-serien' },
    { name: 'Galaxy S20', series: 'Galaxy S-serien' },
    { name: 'Galaxy S20 FE', series: 'Galaxy S-serien' },
    // A-serien
    { name: 'Galaxy A56', series: 'Galaxy A-serien' },
    { name: 'Galaxy A55', series: 'Galaxy A-serien' },
    { name: 'Galaxy A54', series: 'Galaxy A-serien' },
    { name: 'Galaxy A53', series: 'Galaxy A-serien' },
    { name: 'Galaxy A52', series: 'Galaxy A-serien' },
    { name: 'Galaxy A36', series: 'Galaxy A-serien' },
    { name: 'Galaxy A35', series: 'Galaxy A-serien' },
    { name: 'Galaxy A34', series: 'Galaxy A-serien' },
    { name: 'Galaxy A26', series: 'Galaxy A-serien' },
    { name: 'Galaxy A25', series: 'Galaxy A-serien' },
    { name: 'Galaxy A16', series: 'Galaxy A-serien' },
    { name: 'Galaxy A15', series: 'Galaxy A-serien' },
    { name: 'Galaxy A14', series: 'Galaxy A-serien' },
    // Z Flip / Z Fold
    { name: 'Galaxy Z Fold 6', series: 'Galaxy Z Flip / Fold' },
    { name: 'Galaxy Z Fold 5', series: 'Galaxy Z Flip / Fold' },
    { name: 'Galaxy Z Fold 4', series: 'Galaxy Z Flip / Fold' },
    { name: 'Galaxy Z Flip 6', series: 'Galaxy Z Flip / Fold' },
    { name: 'Galaxy Z Flip 5', series: 'Galaxy Z Flip / Fold' },
    { name: 'Galaxy Z Flip 4', series: 'Galaxy Z Flip / Fold' },
    // Galaxy Tab
    { name: 'Galaxy Tab S10 Ultra', series: 'Galaxy Tab' },
    { name: 'Galaxy Tab S10+', series: 'Galaxy Tab' },
    { name: 'Galaxy Tab S9 Ultra', series: 'Galaxy Tab' },
    { name: 'Galaxy Tab S9+', series: 'Galaxy Tab' },
    { name: 'Galaxy Tab S9', series: 'Galaxy Tab' },
    { name: 'Galaxy Tab S9 FE', series: 'Galaxy Tab' },
    { name: 'Galaxy Tab S8 Ultra', series: 'Galaxy Tab' },
    { name: 'Galaxy Tab S8+', series: 'Galaxy Tab' },
    { name: 'Galaxy Tab S8', series: 'Galaxy Tab' },
    { name: 'Galaxy Tab A9+', series: 'Galaxy Tab' },
    { name: 'Galaxy Tab A9', series: 'Galaxy Tab' },
  ],
  ipad: [
    // iPad Pro
    { name: 'iPad Pro 13" M4 (2024)', series: 'iPad Pro' },
    { name: 'iPad Pro 11" M4 (2024)', series: 'iPad Pro' },
    { name: 'iPad Pro 12.9" 6. gen (2022)', series: 'iPad Pro' },
    { name: 'iPad Pro 11" 4. gen (2022)', series: 'iPad Pro' },
    { name: 'iPad Pro 12.9" 5. gen (2021)', series: 'iPad Pro' },
    { name: 'iPad Pro 11" 3. gen (2021)', series: 'iPad Pro' },
    // iPad Air
    { name: 'iPad Air 13" M3 (2025)', series: 'iPad Air' },
    { name: 'iPad Air 11" M3 (2025)', series: 'iPad Air' },
    { name: 'iPad Air 13" M2 (2024)', series: 'iPad Air' },
    { name: 'iPad Air 11" M2 (2024)', series: 'iPad Air' },
    { name: 'iPad Air 5. gen (2022)', series: 'iPad Air' },
    { name: 'iPad Air 4. gen (2020)', series: 'iPad Air' },
    // iPad
    { name: 'iPad 10. gen (2022)', series: 'iPad' },
    { name: 'iPad 9. gen (2021)', series: 'iPad' },
    { name: 'iPad 8. gen (2020)', series: 'iPad' },
    { name: 'iPad 7. gen (2019)', series: 'iPad' },
    // iPad Mini
    { name: 'iPad Mini 7. gen (2024)', series: 'iPad Mini' },
    { name: 'iPad Mini 6. gen (2021)', series: 'iPad Mini' },
    { name: 'iPad Mini 5. gen (2019)', series: 'iPad Mini' },
  ],
  macbook: [
    // MacBook Pro
    { name: 'MacBook Pro 16" M4 Pro/Max', series: 'MacBook Pro' },
    { name: 'MacBook Pro 14" M4 Pro/Max', series: 'MacBook Pro' },
    { name: 'MacBook Pro 14" M4', series: 'MacBook Pro' },
    { name: 'MacBook Pro 16" M3 Pro/Max', series: 'MacBook Pro' },
    { name: 'MacBook Pro 14" M3 Pro/Max', series: 'MacBook Pro' },
    { name: 'MacBook Pro 14" M3', series: 'MacBook Pro' },
    { name: 'MacBook Pro 16" M2 Pro/Max', series: 'MacBook Pro' },
    { name: 'MacBook Pro 14" M2 Pro/Max', series: 'MacBook Pro' },
    { name: 'MacBook Pro 13" M2', series: 'MacBook Pro' },
    { name: 'MacBook Pro 16" M1 Pro/Max', series: 'MacBook Pro' },
    { name: 'MacBook Pro 14" M1 Pro/Max', series: 'MacBook Pro' },
    { name: 'MacBook Pro 13" M1', series: 'MacBook Pro' },
    // MacBook Air
    { name: 'MacBook Air 15" M4', series: 'MacBook Air' },
    { name: 'MacBook Air 13" M4', series: 'MacBook Air' },
    { name: 'MacBook Air 15" M3', series: 'MacBook Air' },
    { name: 'MacBook Air 13" M3', series: 'MacBook Air' },
    { name: 'MacBook Air 15" M2', series: 'MacBook Air' },
    { name: 'MacBook Air 13" M2', series: 'MacBook Air' },
    { name: 'MacBook Air 13" M1', series: 'MacBook Air' },
  ],
  'apple-watch': [
    { name: 'Apple Watch Ultra 2', series: 'Apple Watch Ultra' },
    { name: 'Apple Watch Ultra', series: 'Apple Watch Ultra' },
    { name: 'Apple Watch Series 10', series: 'Apple Watch Series' },
    { name: 'Apple Watch Series 9', series: 'Apple Watch Series' },
    { name: 'Apple Watch Series 8', series: 'Apple Watch Series' },
    { name: 'Apple Watch Series 7', series: 'Apple Watch Series' },
    { name: 'Apple Watch SE (2. gen)', series: 'Apple Watch SE' },
    { name: 'Apple Watch SE (1. gen)', series: 'Apple Watch SE' },
  ],
  'google-pixel': [
    { name: 'Pixel 9 Pro XL', series: 'Pixel 9' },
    { name: 'Pixel 9 Pro', series: 'Pixel 9' },
    { name: 'Pixel 9', series: 'Pixel 9' },
    { name: 'Pixel 8 Pro', series: 'Pixel 8' },
    { name: 'Pixel 8a', series: 'Pixel 8' },
    { name: 'Pixel 8', series: 'Pixel 8' },
    { name: 'Pixel 7 Pro', series: 'Pixel 7' },
    { name: 'Pixel 7a', series: 'Pixel 7' },
    { name: 'Pixel 7', series: 'Pixel 7' },
  ],
  oneplus: [
    { name: 'OnePlus 13', series: 'OnePlus Flagship' },
    { name: 'OnePlus 12', series: 'OnePlus Flagship' },
    { name: 'OnePlus 11', series: 'OnePlus Flagship' },
    { name: 'OnePlus 10 Pro', series: 'OnePlus Flagship' },
    { name: 'OnePlus 10T', series: 'OnePlus Flagship' },
    { name: 'OnePlus 9 Pro', series: 'OnePlus Flagship' },
    { name: 'OnePlus 9', series: 'OnePlus Flagship' },
    { name: 'OnePlus Nord 4', series: 'OnePlus Nord' },
    { name: 'OnePlus Nord 3', series: 'OnePlus Nord' },
    { name: 'OnePlus Nord CE 4', series: 'OnePlus Nord' },
    { name: 'OnePlus Nord CE 3', series: 'OnePlus Nord' },
  ],
  huawei: [
    { name: 'Huawei P60 Pro', series: 'Huawei P-serien' },
    { name: 'Huawei P50 Pro', series: 'Huawei P-serien' },
    { name: 'Huawei Mate 60 Pro', series: 'Huawei Mate' },
    { name: 'Huawei Mate 50 Pro', series: 'Huawei Mate' },
    { name: 'Huawei Mate 50', series: 'Huawei Mate' },
  ],
  sony: [
    { name: 'Xperia 1 VI', series: null },
    { name: 'Xperia 1 V', series: null },
    { name: 'Xperia 5 V', series: null },
    { name: 'Xperia 10 VI', series: null },
  ],
  xiaomi: [
    { name: 'Xiaomi 14 Ultra', series: 'Xiaomi Flagship' },
    { name: 'Xiaomi 14', series: 'Xiaomi Flagship' },
    { name: 'Xiaomi 13T Pro', series: 'Xiaomi Flagship' },
    { name: 'Xiaomi 13T', series: 'Xiaomi Flagship' },
    { name: 'Redmi Note 13 Pro+', series: 'Redmi Note' },
    { name: 'Redmi Note 13 Pro', series: 'Redmi Note' },
    { name: 'Redmi Note 13', series: 'Redmi Note' },
  ],
  motorola: [
    { name: 'Motorola Edge 50 Pro', series: 'Motorola Edge' },
    { name: 'Motorola Edge 40 Pro', series: 'Motorola Edge' },
    { name: 'Motorola Edge 40', series: 'Motorola Edge' },
    { name: 'Moto G84', series: 'Moto G' },
    { name: 'Moto G54', series: 'Moto G' },
  ],
  playstation: [
    { name: 'PlayStation 5 Pro', series: null },
    { name: 'PlayStation 5', series: null },
    { name: 'PlayStation 5 Digital', series: null },
    { name: 'PlayStation 4 Pro', series: null },
    { name: 'PlayStation 4', series: null },
  ],
  nintendo: [
    { name: 'Nintendo Switch 2', series: null },
    { name: 'Nintendo Switch OLED', series: null },
    { name: 'Nintendo Switch', series: null },
    { name: 'Nintendo Switch Lite', series: null },
  ],
};

// ══════════════════════════════════════════════════════════════════════════
// SERVICE TEMPLATES per device_type
// ══════════════════════════════════════════════════════════════════════════
const serviceTemplates = {
  smartphone: [
    { name: 'Skærmskift (Original)',  slug: 'skaermskift-original', sort_order: 1 },
    { name: 'Skærmskift (OEM)',       slug: 'skaermskift-oem',      sort_order: 2 },
    { name: 'Skærmskift (Budget)',    slug: 'skaermskift-budget',   sort_order: 3 },
    { name: 'Batteriskift',           slug: 'batteriskift',          sort_order: 4 },
    { name: 'Opladerstik',            slug: 'opladerstik',           sort_order: 5 },
    { name: 'Bagkamera',              slug: 'bagkamera',             sort_order: 6 },
    { name: 'Frontkamera',            slug: 'frontkamera',           sort_order: 7 },
    { name: 'Bagglas',                slug: 'bagglas',               sort_order: 8 },
    { name: 'Højttaler',              slug: 'hoejttaler',            sort_order: 9 },
    { name: 'Mikrofon',               slug: 'mikrofon',              sort_order: 10 },
    { name: 'Power-knap',             slug: 'power-knap',            sort_order: 11 },
    { name: 'Vibrator',               slug: 'vibrator',              sort_order: 12 },
    { name: 'Vandskade',              slug: 'vandskade',             sort_order: 13 },
    { name: 'Software-fejl',          slug: 'software-fejl',         sort_order: 14 },
    { name: 'Diagnostik',             slug: 'diagnostik',            sort_order: 15 },
  ],
  tablet: [
    { name: 'Skærmskift',    slug: 'skaermskift',  sort_order: 1 },
    { name: 'Batteriskift',   slug: 'batteriskift', sort_order: 2 },
    { name: 'Opladerstik',    slug: 'opladerstik',  sort_order: 3 },
    { name: 'Højttaler',      slug: 'hoejttaler',   sort_order: 4 },
    { name: 'Vandskade',      slug: 'vandskade',    sort_order: 5 },
    { name: 'Diagnostik',     slug: 'diagnostik',   sort_order: 6 },
  ],
  laptop: [
    { name: 'Skærmskift',    slug: 'skaermskift',    sort_order: 1 },
    { name: 'Batteriskift',   slug: 'batteriskift',   sort_order: 2 },
    { name: 'Tastatur',       slug: 'tastatur',       sort_order: 3 },
    { name: 'Topcase',        slug: 'topcase',        sort_order: 4 },
    { name: 'Blæser',         slug: 'blaeser',        sort_order: 5 },
    { name: 'Termisk pasta',  slug: 'termisk-pasta',  sort_order: 6 },
    { name: 'Vandskade',      slug: 'vandskade',      sort_order: 7 },
    { name: 'Diagnostik',     slug: 'diagnostik',     sort_order: 8 },
  ],
  watch: [
    { name: 'Skærmskift',  slug: 'skaermskift',  sort_order: 1 },
    { name: 'Batteriskift', slug: 'batteriskift', sort_order: 2 },
    { name: 'Diagnostik',   slug: 'diagnostik',   sort_order: 3 },
  ],
  console: [
    { name: 'HDMI-port',              slug: 'hdmi-port',              sort_order: 1 },
    { name: 'Blæser',                 slug: 'blaeser',                sort_order: 2 },
    { name: 'Termisk pasta',          slug: 'termisk-pasta',          sort_order: 3 },
    { name: 'Controller-reparation',  slug: 'controller-reparation',  sort_order: 4 },
    { name: 'Diagnostik',             slug: 'diagnostik',             sort_order: 5 },
  ],
};

// ══════════════════════════════════════════════════════════════════════════
// DEVICE IMAGE MAPPING
// ══════════════════════════════════════════════════════════════════════════
function getDeviceImage(brandSlug, modelName) {
  // No product photos — use the DeviceImage silhouette component instead
  return null;
}

// ══════════════════════════════════════════════════════════════════════════
// PRICING — calibrated against iDriveRep.dk (max 5% below competitor)
// ══════════════════════════════════════════════════════════════════════════

// ── iPhone base prices (for 17 Pro Max — newest flagship) ──
// Calibrated: ~5% below iDriveRep.dk (iPhone 16 Pro Max + new-model premium)
const iphoneBase = {
  'skaermskift-original': 4299,  // iDriveRep 16PM: 3,999 + new model premium
  'skaermskift-oem': 2799,       // iDriveRep 16PM OEM: 2,499 + premium
  'skaermskift-budget': 1999,    // budget tier — affordable for all
  'batteriskift': 1299,          // iDriveRep 16PM: 1,199 + premium
  'opladerstik': 1499,           // iDriveRep 16PM: 1,400 + premium
  'bagkamera': 1999,             // iDriveRep 16PM: 1,899 + premium
  'frontkamera': 1499,           // reasonable
  'bagglas': 1899,               // iDriveRep 16PM: 1,799 + premium
  'hoejttaler': 1299,            // iDriveRep 16PM: 1,199 + premium
  'mikrofon': 999,               // reasonable
  'power-knap': 1699,            // iDriveRep 16PM: 1,600 + premium
  'vibrator': 899,               // reasonable
  'diagnostik': 0,
  'vandskade': 1499,
  'software-fejl': 599,
};

// ── Samsung base prices (for S25 Ultra — newest flagship) ──
// Calibrated: ~3-5% below iDriveRep.dk Samsung prices
const samsungBase = {
  'skaermskift-original': 2799,  // iDriveRep S25U: 2,899
  'skaermskift-oem': 2099,       // ~25% below original
  'skaermskift-budget': 1499,    // budget tier
  'batteriskift': 799,           // iDriveRep S25U: 799
  'opladerstik': 699,            // iDriveRep S25U: 699
  'bagkamera': 1299,             // reasonable
  'frontkamera': 899,
  'bagglas': 999,                // iDriveRep S25U: 999
  'hoejttaler': 699,
  'mikrofon': 599,
  'power-knap': 799,
  'vibrator': 599,
  'diagnostik': 0,
  'vandskade': 999,
  'software-fejl': 499,
};

// ── Other brands base (Pixel, OnePlus, etc.) ──
const otherBase = {
  'skaermskift-original': 2299,
  'skaermskift-oem': 1699,
  'skaermskift-budget': 1199,
  'batteriskift': 799,
  'opladerstik': 699,
  'bagkamera': 999,
  'frontkamera': 799,
  'bagglas': 799,
  'hoejttaler': 599,
  'mikrofon': 499,
  'power-knap': 599,
  'vibrator': 499,
  'diagnostik': 0,
  'vandskade': 799,
  'software-fejl': 399,
};

// ── Minimum price floors — no service goes below these ──
const SERVICE_FLOORS = {
  'skaermskift-original': 1299,
  'skaermskift-oem': 799,
  'skaermskift-budget': 599,
  'batteriskift': 599,
  'opladerstik': 599,
  'bagkamera': 699,
  'frontkamera': 599,
  'bagglas': 599,
  'hoejttaler': 499,
  'mikrofon': 499,
  'power-knap': 499,
  'vibrator': 399,
  'vandskade': 699,
  'software-fejl': 399,
};

function roundPrice(price) {
  if (price === 0) return 0;
  const base = Math.round(price / 100) * 100;
  return base - 1;
}

// ── iPhone multipliers ──
// Conservative: max 5% below iDriveRep for every generation
function iphoneMultiplier(modelName) {
  // Special models
  if (/SE|XR|\bX\b|^iPhone 8/i.test(modelName)) return 0.35;
  if (/XS Max/i.test(modelName)) return 0.38;
  if (/XS$/i.test(modelName)) return 0.36;
  if (/16e/i.test(modelName)) return 0.50;
  if (/17 Air/i.test(modelName)) return 0.88;

  // Generation factor (conservative — prices don't drop fast)
  // iDriveRep: 16PM=3999, 15PM=4149, 14PM=3999, 13PM=3000, 12PM=1350
  let genFactor = 1.0;
  if (/\b17\b/.test(modelName)) genFactor = 1.0;
  else if (/\b16\b/.test(modelName)) genFactor = 0.95;  // 4299*0.95=4084→3999
  else if (/\b15\b/.test(modelName)) genFactor = 0.97;  // 4299*0.97=4170→4199 (iDR 15PM=4149)
  else if (/\b14\b/.test(modelName)) genFactor = 0.95;  // 4299*0.95=4084→3999 (iDR 14PM=3999)
  else if (/\b13\b/.test(modelName)) genFactor = 0.72;  // 4299*0.72=3095→3099 (iDR 13PM=3000)
  else if (/\b12\b/.test(modelName)) genFactor = 0.35;  // 4299*0.35=1505→1499 (iDR 12PM=1350)
  else if (/\b11\b/.test(modelName)) genFactor = 0.32;

  // Tier factor
  let tierFactor = 0.85;
  if (/Pro Max/i.test(modelName)) tierFactor = 1.0;
  else if (/Pro/i.test(modelName)) tierFactor = 0.94;  // iDR: 16Pro/16PM ≈ 0.963
  else if (/Plus/i.test(modelName)) tierFactor = 0.90;
  else if (/Mini/i.test(modelName)) tierFactor = 0.82;

  return genFactor * tierFactor;
}

// ── Samsung multipliers ──
function samsungMultiplier(modelName) {
  // Galaxy Tab → handled separately via tablet pricing
  if (/Tab/i.test(modelName)) return 1.0; // uses tablet pricing path
  // Z Fold — expensive foldables
  if (/Z Fold 6/i.test(modelName)) return 1.15;
  if (/Z Fold 5/i.test(modelName)) return 1.05;
  if (/Z Fold 4/i.test(modelName)) return 0.95;
  // Z Flip
  if (/Z Flip 6/i.test(modelName)) return 0.90;
  if (/Z Flip 5/i.test(modelName)) return 0.82;
  if (/Z Flip 4/i.test(modelName)) return 0.75;
  // A-series (affordable)
  if (/A14|A15|A16/i.test(modelName)) return 0.35;
  if (/A25|A26/i.test(modelName)) return 0.42;
  if (/A3[456]/i.test(modelName)) return 0.48;
  if (/A5[2-6]/i.test(modelName)) return 0.55;
  // S-series FE
  if (/FE/i.test(modelName)) {
    if (/S24/i.test(modelName)) return 0.60;
    if (/S23/i.test(modelName)) return 0.55;
    if (/S21/i.test(modelName)) return 0.48;
    if (/S20/i.test(modelName)) return 0.42;
    return 0.50;
  }
  // S-series flagships
  // iDriveRep: S25U=2899, S24U=2899, S23U=2600
  let genFactor = 1.0;
  if (/S25/i.test(modelName)) genFactor = 1.0;
  else if (/S24/i.test(modelName)) genFactor = 1.0;  // same price as S25 at iDR
  else if (/S23/i.test(modelName)) genFactor = 0.92;  // 2799*0.92=2575→2599 (iDR=2600)
  else if (/S22/i.test(modelName)) genFactor = 0.82;
  else if (/S21/i.test(modelName)) genFactor = 0.72;
  else if (/S20/i.test(modelName)) genFactor = 0.62;

  let tierFactor = 0.85;
  if (/Ultra/i.test(modelName)) tierFactor = 1.0;
  else if (/\+/i.test(modelName)) tierFactor = 0.92;

  return genFactor * tierFactor;
}

// ── Other brands multiplier ──
function otherSmartphoneMultiplier(brandSlug, modelName) {
  const brandScale = {
    'google-pixel': 1.0,
    'oneplus': 0.92,
    'huawei': 0.95,
    'sony': 0.92,
    'xiaomi': 0.75,
    'motorola': 0.70,
  };
  let mult = brandScale[brandSlug] || 0.85;

  if (/Pro|Ultra/i.test(modelName)) mult *= 1.05;
  if (/Nord|Redmi|Moto G|CE/i.test(modelName)) mult *= 0.70;
  if (/\ba\b|Lite/i.test(modelName)) mult *= 0.75;

  // Older models cost less
  const nums = modelName.match(/\d+/g);
  if (nums && nums.length > 0) {
    const mainNum = parseInt(nums[0]);
    if (/Pixel/i.test(modelName)) {
      if (mainNum <= 7) mult *= 0.85;
      else if (mainNum <= 8) mult *= 0.92;
    }
  }
  return mult;
}

function getSmartphonePrice(brandSlug, modelName, serviceSlug) {
  // Pick correct base prices for brand
  let basePrices;
  if (brandSlug === 'iphone') basePrices = iphoneBase;
  else if (brandSlug === 'samsung') basePrices = samsungBase;
  else basePrices = otherBase;

  const basePrice = basePrices[serviceSlug];
  if (basePrice === undefined) return null;
  if (basePrice === 0) return 0;

  // Get model multiplier
  let mult;
  if (brandSlug === 'iphone') mult = iphoneMultiplier(modelName);
  else if (brandSlug === 'samsung') mult = samsungMultiplier(modelName);
  else mult = otherSmartphoneMultiplier(brandSlug, modelName);

  const raw = roundPrice(basePrice * mult);
  const floor = SERVICE_FLOORS[serviceSlug] ?? 0;
  return Math.max(raw, floor);
}

// ── iPad pricing (calibrated to market) ──
function getTabletPrice(modelName, serviceSlug) {
  const basePrices = {
    'skaermskift': 3999,   // iPad Pro 13" flagship
    'batteriskift': 1999,
    'opladerstik': 1299,
    'hoejttaler': 899,
    'vandskade': 1299,
    'diagnostik': 0,
  };
  const base = basePrices[serviceSlug];
  if (base === undefined) return null;
  if (base === 0) return 0;

  let mult = 0.55; // default older models
  if (/Pro 13|Pro 12.9/i.test(modelName)) mult = 1.0;
  else if (/Pro 11/i.test(modelName)) mult = 0.88;
  else if (/Air 13/i.test(modelName)) mult = 0.78;
  else if (/Air/i.test(modelName)) mult = 0.70;
  else if (/Mini/i.test(modelName)) mult = 0.62;
  else if (/10. gen/i.test(modelName)) mult = 0.58;
  else if (/9. gen|8. gen|7. gen/i.test(modelName)) mult = 0.52;
  // Samsung Galaxy Tab
  else if (/Tab S10 Ultra|Tab S9 Ultra|Tab S8 Ultra/i.test(modelName)) mult = 1.0;
  else if (/Tab S10\+|Tab S9\+|Tab S8\+/i.test(modelName)) mult = 0.82;
  else if (/Tab S9 FE|Tab A9/i.test(modelName)) mult = 0.50;
  else if (/Tab S/i.test(modelName)) mult = 0.68;
  else if (/Tab A/i.test(modelName)) mult = 0.45;

  return roundPrice(base * mult);
}

// ── MacBook pricing (calibrated to iDriveRep/FixPhone) ──
function getLaptopPrice(modelName, serviceSlug) {
  const basePrices = {
    'skaermskift': 7999,    // competitors ~8,495
    'batteriskift': 2399,   // competitors ~2,495
    'tastatur': 2999,       // competitors ~3,500
    'topcase': 4499,        // competitors ~4,595
    'blaeser': 999,
    'termisk-pasta': 599,
    'vandskade': 1499,
    'diagnostik': 0,
  };
  const base = basePrices[serviceSlug];
  if (base === undefined) return null;
  if (base === 0) return 0;

  let mult = 0.70;
  if (/16".*M4/i.test(modelName)) mult = 1.0;
  else if (/14".*M4 Pro|14".*M4$/i.test(modelName)) mult = 0.92;
  else if (/16".*M3/i.test(modelName)) mult = 0.90;
  else if (/14".*M3/i.test(modelName)) mult = 0.85;
  else if (/16".*M2/i.test(modelName)) mult = 0.82;
  else if (/14".*M2|13".*M2/i.test(modelName)) mult = 0.78;
  else if (/M1/i.test(modelName)) mult = 0.72;
  // Air generally cheaper
  if (/Air/i.test(modelName)) mult *= 0.78;

  return roundPrice(base * mult);
}

// ── Watch pricing ──
function getWatchPrice(modelName, serviceSlug) {
  const basePrices = {
    'skaermskift': 2499,
    'batteriskift': 899,
    'diagnostik': 0,
  };
  const base = basePrices[serviceSlug];
  if (base === undefined) return null;
  if (base === 0) return 0;

  let mult = 0.55;
  if (/Ultra 2/i.test(modelName)) mult = 1.0;
  else if (/Ultra$/i.test(modelName)) mult = 0.90;
  else if (/Series 10/i.test(modelName)) mult = 0.80;
  else if (/Series 9/i.test(modelName)) mult = 0.72;
  else if (/Series 8/i.test(modelName)) mult = 0.65;
  else if (/Series 7/i.test(modelName)) mult = 0.58;
  else if (/SE/i.test(modelName)) mult = 0.50;

  return roundPrice(base * mult);
}

// ── Console pricing ──
const consolePrices = {
  'hdmi-port': 899,
  'blaeser': 699,
  'termisk-pasta': 499,
  'controller-reparation': 599,
  'diagnostik': 0,
};

function getPrice(deviceType, brandSlug, modelName, serviceSlug) {
  if (deviceType === 'smartphone') {
    if (/Galaxy Tab/i.test(modelName)) {
      return getTabletPrice(modelName, serviceSlug);
    }
    return getSmartphonePrice(brandSlug, modelName, serviceSlug);
  }
  if (deviceType === 'tablet') return getTabletPrice(modelName, serviceSlug);
  if (deviceType === 'laptop') return getLaptopPrice(modelName, serviceSlug);
  if (deviceType === 'watch') return getWatchPrice(modelName, serviceSlug);
  if (deviceType === 'console') return consolePrices[serviceSlug] ?? null;
  return null;
}

// Determine which service templates to use based on model name + device type
function getServiceTemplatesForModel(deviceType, modelName) {
  // Samsung Galaxy Tab gets tablet services even though brand is smartphone
  if (/Galaxy Tab/i.test(modelName)) return serviceTemplates.tablet;
  return serviceTemplates[deviceType];
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('Seeding repair catalog...\n');

  // Clean existing data first
  console.log('Cleaning existing data...');
  await supabase.from('repair_services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('repair_models').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('repair_brands').delete().neq('id', '00000000-0000-0000-0000-000000000000');

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
    models.forEach((m, idx) => {
      modelRows.push({
        brand_id: brand.id,
        name: m.name,
        slug: slugify(m.name),
        series: m.series,
        image_url: getDeviceImage(brandSlug, m.name),
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

  // Build brand lookup by id
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
    const templates = getServiceTemplatesForModel(deviceType, model.name);
    if (!templates) continue;

    for (const tmpl of templates) {
      const price = getPrice(deviceType, brandSlug, model.name, tmpl.slug);
      if (price === null) continue;
      serviceRows.push({
        model_id: model.id,
        name: tmpl.name,
        slug: tmpl.slug,
        price_dkk: price,
        sort_order: tmpl.sort_order,
      });
    }
  }

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

  // ── Price verification (key models vs iDriveRep) ──
  console.log('\n── Price verification (key models) ──');
  const verifyModels = [
    ['iphone', 'iPhone 17 Pro Max', 'skaermskift-original', 'iDR: ~4,399 est'],
    ['iphone', 'iPhone 16 Pro Max', 'skaermskift-original', 'iDR: 3,999'],
    ['iphone', 'iPhone 16 Pro', 'skaermskift-original', 'iDR: 3,850'],
    ['iphone', 'iPhone 15 Pro Max', 'skaermskift-original', 'iDR: 4,149'],
    ['iphone', 'iPhone 14 Pro Max', 'skaermskift-original', 'iDR: 3,999'],
    ['iphone', 'iPhone 13 Pro Max', 'skaermskift-original', 'iDR: 3,000'],
    ['iphone', 'iPhone 12 Pro Max', 'skaermskift-original', 'iDR: 1,350'],
    ['iphone', 'iPhone 16 Pro Max', 'batteriskift', 'iDR: 1,199'],
    ['iphone', 'iPhone 13 Pro Max', 'batteriskift', 'iDR: 800'],
    ['samsung', 'Galaxy S25 Ultra', 'skaermskift-original', 'iDR: 2,899'],
    ['samsung', 'Galaxy S24 Ultra', 'skaermskift-original', 'iDR: 2,899'],
    ['samsung', 'Galaxy S23 Ultra', 'skaermskift-original', 'iDR: 2,600'],
    ['samsung', 'Galaxy S25 Ultra', 'batteriskift', 'iDR: 799'],
  ];
  for (const [brand, model, svc, ref] of verifyModels) {
    const price = getSmartphonePrice(brand, model, svc);
    console.log(`  ${model} ${svc}: ${price} DKK (${ref})`);
  }

  console.log(`\nSeeded ${insertedBrands.length} brands, ${insertedModels.length} models, ${totalServices} services`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
