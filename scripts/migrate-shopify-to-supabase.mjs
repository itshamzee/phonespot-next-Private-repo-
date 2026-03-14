// scripts/migrate-shopify-to-supabase.mjs
// Migrates Shopify products → Supabase product_templates + devices
// Run: node scripts/migrate-shopify-to-supabase.mjs
//
// This script:
// 1. Fetches ALL products from Shopify Storefront API (live, not dump file)
// 2. Separates devices (phones, tablets, watches, laptops) from accessories
// 3. Creates product_templates for each device model
// 4. Creates device entries for each variant (grade/storage/color)
// 5. Creates sku_products for accessories

import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────────────────
const SHOPIFY_DOMAIN = 'c47a26-4.myshopify.com';
const STOREFRONT_TOKEN = '85a7df78022ab56bf0a1b7ad24bdc4e0';
const API_VERSION = '2024-10';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Try loading from .env.local
  const { readFileSync } = await import('fs');
  try {
    const env = readFileSync('.env.local', 'utf-8');
    for (const line of env.split('\n')) {
      const match = line.match(/^([^#=]+)=(.+)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
  } catch { /* ignore */ }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Shopify Fetch ───────────────────────────────────────────────────────────
const endpoint = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

async function shopifyFetch(query, variables = {}) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error('Shopify GraphQL errors:', JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

async function fetchAllProducts() {
  const allProducts = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const data = await shopifyFetch(`
      query($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          nodes {
            id
            handle
            title
            description
            descriptionHtml
            vendor
            productType
            tags
            availableForSale
            priceRange {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
            images(first: 20) {
              nodes { url altText width height }
            }
            variants(first: 100) {
              nodes {
                id
                title
                availableForSale
                selectedOptions { name value }
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `, { first: 250, after: cursor });

    if (!data?.products) break;
    // Normalize nested nodes from GraphQL
    const normalized = data.products.nodes.map(p => ({
      ...p,
      images: p.images?.nodes || [],
      variants: p.variants?.nodes || [],
      tags: Array.isArray(p.tags) ? p.tags : (p.tags || '').split(',').map(t => t.trim()),
    }));
    allProducts.push(...normalized);
    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }

  return allProducts;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function dkkToOere(amount) {
  return Math.round(parseFloat(amount) * 100);
}

function isDeviceProduct(product) {
  const title = product.title.toLowerCase();
  const tags = (product.tags || []).map(t => t.toLowerCase());
  const type = (product.productType || '').toLowerCase();

  // Exclude spare parts and accessories
  const spareParts = ['batteri', 'camera lens', 'charge connector', 'screen', 'skærm',
    'display', 'flex kabel', 'lcd', 'oled', 'bagglas', 'digitizer', 'touchscreen',
    'bagkamera', 'rear facing camera', 'home knap'];
  if (spareParts.some(sp => title.includes(sp))) return false;

  // Exclude accessories
  const accessories = ['cover', 'oplader', 'kabel', 'skærmbeskyttelse', 'panserglas',
    'bookcase', 'earphone', 'earphones', 'headset', 'power bank', 'rem',
    'bluetooth', 'swissten', 'xssive', 'gaming'];
  if (accessories.some(acc => title.includes(acc))) return false;

  // Known device patterns
  if (title.includes('iphone') || title.includes('ipad') || title.includes('apple watch') ||
      title.includes('macbook') || title.includes('thinkpad') || title.includes('galaxy') ||
      title.includes('huawei') || title.includes('oneplus') || title.includes('xiaomi') ||
      title.includes('motorola') || title.includes('airpods')) {
    // Check variant count — devices typically have storage/grade/color variants
    if (product.variants.length > 1) return true;
    // Single variant devices (laptops, watches)
    if (title.includes('thinkpad') || title.includes('macbook') || title.includes('watch') ||
        title.includes('airpods') || type === 'ipad' || type === 'smartphone' ||
        type === 'brugte telefoner') return true;
  }

  return false;
}

function detectCategory(product) {
  const title = product.title.toLowerCase();
  const type = (product.productType || '').toLowerCase();

  if (title.includes('ipad') || type === 'ipad') return 'ipad';
  if (title.includes('macbook') || title.includes('thinkpad') || title.includes('laptop')) return 'laptop';
  if (title.includes('apple watch')) return 'smartwatch';
  if (title.includes('airpods')) return 'accessory';
  if (title.includes('iphone') || type === 'iphone' || type === 'brugte telefoner') return 'iphone';
  if (title.includes('samsung') || title.includes('huawei') || title.includes('oneplus') ||
      title.includes('xiaomi') || title.includes('motorola') || title.includes('google pixel') ||
      type === 'smartphone') return 'smartphone';
  return 'other';
}

function detectBrand(title) {
  const t = title.toLowerCase();
  if (t.includes('apple') || t.includes('iphone') || t.includes('ipad') || t.includes('macbook') || t.includes('airpods')) return 'Apple';
  if (t.includes('samsung')) return 'Samsung';
  if (t.includes('huawei')) return 'Huawei';
  if (t.includes('oneplus')) return 'OnePlus';
  if (t.includes('google') || t.includes('pixel')) return 'Google';
  if (t.includes('xiaomi') || t.includes('redmi')) return 'Xiaomi';
  if (t.includes('motorola') || t.includes('moto')) return 'Motorola';
  if (t.includes('lenovo') || t.includes('thinkpad')) return 'Lenovo';
  return 'Other';
}

function extractModel(title) {
  // Remove "Apple " prefix and variant info
  return title
    .replace(/^Apple\s+/i, '')
    .replace(/\s*\|.*$/, '') // Remove everything after |
    .replace(/\s*\(.*?\)\s*/g, ' ') // Remove parenthetical info
    .trim();
}

function parseVariants(product) {
  // Parse Shopify variants into grade/storage/color combinations
  const variants = product.variants;

  // For single-variant products (laptops, watches)
  if (variants.length === 1 && variants[0].title === 'Default Title') {
    return [{
      grade: 'B',
      storage: null,
      color: null,
      price: dkkToOere(variants[0].price.amount),
      compareAtPrice: variants[0].compareAtPrice ? dkkToOere(variants[0].compareAtPrice.amount) : null,
      available: variants[0].availableForSale,
    }];
  }

  // Multi-variant: parse selectedOptions
  return variants.map(v => {
    const opts = {};
    for (const opt of v.selectedOptions) {
      opts[opt.name.toLowerCase()] = opt.value;
    }

    // Detect grade from title or options
    let grade = 'B';
    const titleLower = v.title.toLowerCase();
    if (titleLower.includes('grade a') || opts.grade === 'A' || opts.tilstand === 'Grade A') grade = 'A';
    else if (titleLower.includes('grade c') || opts.grade === 'C' || opts.tilstand === 'Grade C') grade = 'C';
    else if (titleLower.includes('grade b') || opts.grade === 'B' || opts.tilstand === 'Grade B') grade = 'B';

    // Detect storage
    let storage = opts.storage || opts.lagerplads || opts.kapacitet || null;
    if (!storage) {
      const storageMatch = v.title.match(/(\d+\s*(?:GB|TB))/i);
      if (storageMatch) storage = storageMatch[1].replace(/\s+/g, '');
    }

    // Detect color
    let color = opts.color || opts.farve || null;
    if (!color) {
      // Try to find color in variant title after removing grade and storage
      const known = ['black', 'white', 'silver', 'gold', 'blue', 'red', 'green', 'purple',
        'pink', 'space grey', 'space gray', 'midnight', 'starlight', 'graphite',
        'pacific blue', 'sierra blue', 'alpine green', 'deep purple',
        'sort', 'hvid', 'sølv', 'guld', 'blå', 'rød', 'grøn', 'lilla', 'rosa',
        'spacegrey', 'space grey'];
      const tl = titleLower;
      for (const c of known) {
        if (tl.includes(c)) { color = c.charAt(0).toUpperCase() + c.slice(1); break; }
      }
    }

    return {
      grade,
      storage,
      color,
      price: dkkToOere(v.price.amount),
      compareAtPrice: v.compareAtPrice ? dkkToOere(v.compareAtPrice.amount) : null,
      available: v.availableForSale,
    };
  });
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Get or create location ──────────────────────────────────────────────────
async function getLocationId() {
  const { data } = await supabase
    .from('locations')
    .select('id')
    .eq('name', 'PhoneSpot Slagelse')
    .maybeSingle();

  if (data) return data.id;

  const { data: newLoc, error } = await supabase
    .from('locations')
    .insert({
      name: 'PhoneSpot Slagelse',
      address: 'VestsjællandsCentret 10, 4200 Slagelse',
      type: 'store',
      phone: '+45 XX XX XX XX',
      email: 'info@phonespot.dk',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create location:', error.message);
    process.exit(1);
  }

  return newLoc.id;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching all products from Shopify...');
  const products = await fetchAllProducts();
  console.log(`Found ${products.length} products on Shopify\n`);

  const locationId = await getLocationId();
  console.log(`Using location: ${locationId}\n`);

  const deviceProducts = products.filter(isDeviceProduct);
  const accessoryProducts = products.filter(p => !isDeviceProduct(p));

  console.log(`Device products: ${deviceProducts.length}`);
  console.log(`Accessory products: ${accessoryProducts.length}\n`);

  // ── Import Device Products as product_templates + devices ──
  let templatesCreated = 0;
  let devicesCreated = 0;
  let templatesSkipped = 0;
  let errors = 0;

  for (const product of deviceProducts) {
    try {
      const slug = slugify(product.handle || product.title);
      const category = detectCategory(product);
      const brand = detectBrand(product.title);
      const model = extractModel(product.title);
      const imgNodes = Array.isArray(product.images) ? product.images : product.images?.nodes || [];
      const images = imgNodes.map(img => img.url);
      const description = stripHtml(product.descriptionHtml || product.description);

      // Check if template already exists
      const { data: existing } = await supabase
        .from('product_templates')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      // Parse variants to get storage/color options and pricing
      const parsedVariants = parseVariants(product);
      const storageOptions = [...new Set(parsedVariants.map(v => v.storage).filter(Boolean))];
      const colors = [...new Set(parsedVariants.map(v => v.color).filter(Boolean))];

      // Calculate base prices per grade
      const gradeA = parsedVariants.filter(v => v.grade === 'A');
      const gradeB = parsedVariants.filter(v => v.grade === 'B');
      const gradeC = parsedVariants.filter(v => v.grade === 'C');

      const minPrice = (arr) => arr.length > 0 ? Math.min(...arr.map(v => v.price)) : null;

      const basePriceA = minPrice(gradeA);
      const basePriceB = minPrice(gradeB) || minPrice(parsedVariants);
      const basePriceC = minPrice(gradeC);

      let templateId;
      if (existing) {
        templatesSkipped++;
        templateId = existing.id;
        console.log(`  EXISTS template: ${product.title} → checking devices`);

        // Check if devices already exist for this template
        const { data: existingDevices } = await supabase
          .from('devices')
          .select('id')
          .eq('template_id', templateId)
          .limit(1);

        if (existingDevices && existingDevices.length > 0) {
          console.log(`    Devices already exist, skipping`);
          continue;
        }
      } else {
        // Extract specs from title for laptops
        const specs = {};
        if (category === 'laptop') {
          const titleParts = product.title.split('|').map(p => p.trim());
          if (titleParts.length > 1) {
            for (const part of titleParts.slice(1)) {
              if (part.match(/\d+GB\s*SSD/i)) specs['SSD'] = part.match(/(\d+GB)\s*SSD/i)?.[1] || part;
              if (part.match(/\d+GB\s*Ram/i)) specs['RAM'] = part.match(/(\d+GB)\s*Ram/i)?.[1] || part;
              if (part.match(/Intel|AMD|i[357]-|Ryzen/i)) specs['Processor'] = part;
              if (part.match(/\d+[",]|inch/i)) specs['Skærm'] = part;
              if (part.match(/Simkort|5G|LTE/i)) specs['Forbindelse'] = part;
            }
          }
        }

        // Create product_template
        const { data: template, error: templateErr } = await supabase
          .from('product_templates')
          .insert({
            brand,
            model,
            category,
            storage_options: storageOptions,
            colors,
            default_attributes: {},
            display_name: product.title.replace(/\s*\|.*$/, '').trim(),
            slug,
            description: description || null,
            images,
            short_description: description ? description.substring(0, 200) : null,
            meta_title: `${product.title} | PhoneSpot`,
            meta_description: `Køb refurbished ${product.title} med 36 måneders garanti hos PhoneSpot.`,
            specifications: specs,
            status: 'published',
            base_price_a: basePriceA,
            base_price_b: basePriceB,
            base_price_c: basePriceC,
          })
          .select('id')
          .single();

        if (templateErr) {
          console.error(`  FAIL template: ${product.title} — ${templateErr.message}`);
          errors++;
          continue;
        }

        templateId = template.id;
        templatesCreated++;
        console.log(`  + Template: ${product.title} [${category}] → ${templateId}`);
      }

      // Create devices for each available variant
      for (const variant of parsedVariants) {
        if (!variant.available) continue; // Skip unavailable variants

        const { error: deviceErr } = await supabase
          .from('devices')
          .insert({
            template_id: templateId,
            grade: variant.grade,
            storage: variant.storage,
            color: variant.color,
            selling_price: variant.price,
            purchase_price: Math.round(variant.price * 0.5), // Estimate purchase price at 50%
            vat_scheme: 'brugtmoms',
            origin_country: 'DK',
            location_id: locationId,
            status: 'listed',
            listed_at: new Date().toISOString(),
            photos: [],
          });

        if (deviceErr) {
          console.error(`    FAIL device: ${variant.grade}/${variant.storage}/${variant.color} — ${deviceErr.message}`);
          errors++;
          continue;
        }

        devicesCreated++;
      }
    } catch (err) {
      console.error(`  ERROR: ${product.title}:`, err.message);
      errors++;
    }
  }

  // ── Import Accessories as sku_products ──
  let skuCreated = 0;
  let skuSkipped = 0;

  for (const product of accessoryProducts) {
    try {
      const slug = slugify(product.handle || product.title);

      // Check if already exists
      const { data: existing } = await supabase
        .from('sku_products')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        skuSkipped++;
        continue;
      }

      const brand = detectBrand(product.title);
      const category = detectCategory(product);
      const imgNodes = Array.isArray(product.images) ? product.images : product.images?.nodes || [];
      const images = imgNodes.map(img => img.url);
      const description = stripHtml(product.descriptionHtml || product.description);

      const baseVariant = product.variants[0];
      const sellingPrice = dkkToOere(baseVariant.price.amount);
      const salePrice = baseVariant.compareAtPrice ? dkkToOere(baseVariant.compareAtPrice.amount) : null;

      // Build variants for multi-variant SKU products
      const hasRealVariants = product.variants.length > 1 ||
        (product.variants.length === 1 && product.variants[0].title !== 'Default Title');

      const variants = hasRealVariants
        ? [{
            name: product.variants[0].selectedOptions?.[0]?.name || 'Variant',
            options: product.variants.map(v => ({
              value: v.title,
              price_override: dkkToOere(v.price.amount) !== sellingPrice ? dkkToOere(v.price.amount) : null,
              sku: null,
              image: null,
            })),
          }]
        : [];

      const { error: insertErr } = await supabase
        .from('sku_products')
        .insert({
          title: product.title,
          description: description || null,
          slug,
          brand,
          category: category === 'iphone' ? 'accessory' : category,
          subcategory: null,
          selling_price: sellingPrice,
          sale_price: salePrice,
          images,
          is_active: product.availableForSale,
          status: product.availableForSale ? 'published' : 'draft',
          variants,
        });

      if (insertErr) {
        console.error(`  FAIL sku: ${product.title} — ${insertErr.message}`);
        errors++;
        continue;
      }

      skuCreated++;
    } catch (err) {
      console.error(`  ERROR sku: ${product.title}:`, err.message);
      errors++;
    }
  }

  console.log('\n════════════════════════════════════════');
  console.log('Migration Complete');
  console.log('════════════════════════════════════════');
  console.log(`Templates: ${templatesCreated} created, ${templatesSkipped} skipped`);
  console.log(`Devices:   ${devicesCreated} created`);
  console.log(`SKU Prods: ${skuCreated} created, ${skuSkipped} skipped`);
  console.log(`Errors:    ${errors}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
