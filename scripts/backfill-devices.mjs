// Backfill devices for templates that have 0 listed devices
// Fetches variant data from Shopify and creates device entries
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env
const envText = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([^#=]+)=(.+)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SHOPIFY_DOMAIN = 'c47a26-4.myshopify.com';
const STOREFRONT_TOKEN = '85a7df78022ab56bf0a1b7ad24bdc4e0';

async function shopifyFetch(query, variables = {}) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  return json.data;
}

async function getShopifyProduct(handle) {
  const data = await shopifyFetch(`
    query($handle: String!) {
      product(handle: $handle) {
        title
        variants(first: 100) {
          nodes {
            title
            availableForSale
            selectedOptions { name value }
            price { amount }
            compareAtPrice { amount }
          }
        }
      }
    }
  `, { handle });
  return data?.product;
}

function dkkToOere(amount) {
  return Math.round(parseFloat(amount) * 100);
}

async function main() {
  // Get location
  const { data: loc } = await supabase.from('locations').select('id').eq('name', 'PhoneSpot Slagelse').single();
  const locationId = loc.id;

  // Find templates with no listed devices
  const { data: templates } = await supabase
    .from('product_templates')
    .select('id, slug, display_name, category')
    .eq('status', 'published');

  let created = 0;
  for (const t of templates) {
    const { data: devices } = await supabase
      .from('devices')
      .select('id')
      .eq('template_id', t.id)
      .eq('status', 'listed')
      .limit(1);

    if (devices && devices.length > 0) continue;

    console.log(`\nBackfilling: ${t.display_name} (${t.slug})`);

    // Fetch from Shopify
    const product = await getShopifyProduct(t.slug);
    if (!product) {
      console.log(`  Not found on Shopify: ${t.slug}`);
      continue;
    }

    const variants = product.variants?.nodes || [];
    console.log(`  Found ${variants.length} variants on Shopify`);

    for (const v of variants) {
      // Import all variants regardless of availability — user wants them visible

      const opts = {};
      for (const opt of v.selectedOptions || []) {
        opts[opt.name.toLowerCase()] = opt.value;
      }

      // Detect grade — Shopify uses "Som ny"=A, "God"=B, "Okay"=C
      let grade = 'B';
      const tl = v.title.toLowerCase();
      const gradeOption = (opts.tilstand || opts.grade || '').toLowerCase();
      if (tl.includes('som ny') || gradeOption.includes('som ny') || tl.includes('grade a') || gradeOption === 'a') grade = 'A';
      else if (tl.includes('okay') || gradeOption.includes('okay') || tl.includes('grade c') || gradeOption === 'c') grade = 'C';
      else if (tl.includes('god') || gradeOption.includes('god') || tl.includes('grade b') || gradeOption === 'b') grade = 'B';

      // Detect storage
      let storage = opts.storage || opts.lagerplads || opts.kapacitet || null;
      if (!storage) {
        const sm = v.title.match(/(\d+\s*(?:GB|TB))/i);
        if (sm) storage = sm[1].replace(/\s+/g, '');
      }

      // Detect color
      let color = opts.color || opts.farve || null;
      if (!color) {
        const known = ['black', 'white', 'silver', 'gold', 'blue', 'red', 'green', 'purple',
          'pink', 'space grey', 'space gray', 'midnight', 'starlight', 'graphite',
          'sort', 'hvid', 'sølv', 'guld', 'spacegrey'];
        for (const c of known) {
          if (tl.includes(c)) { color = c.charAt(0).toUpperCase() + c.slice(1); break; }
        }
      }

      const price = dkkToOere(v.price.amount);

      const { error } = await supabase.from('devices').insert({
        template_id: t.id,
        grade,
        storage,
        color,
        selling_price: price,
        purchase_price: Math.round(price * 0.5),
        vat_scheme: 'brugtmoms',
        origin_country: 'DK',
        location_id: locationId,
        status: 'listed',
        listed_at: new Date().toISOString(),
        photos: [],
      });

      if (error) {
        console.log(`  FAIL: ${grade}/${storage}/${color} — ${error.message}`);
      } else {
        created++;
      }
    }
  }

  console.log(`\nDone. Created ${created} devices.`);
}

main().catch(console.error);
