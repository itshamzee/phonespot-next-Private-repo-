/**
 * Update repair_models.image_url with official product images from Apple/Samsung CDNs.
 *
 * Apple images come from cdsassets.apple.com (used on support.apple.com/identify-your-* pages).
 * Samsung images come from images.samsung.com (official product gallery).
 *
 * Run:  node scripts/update-device-images.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// ── Parse .env.local ─────────────────────────────────────────────────────
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

// ── Slug helper (must match seed script) ─────────────────────────────────
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
// IMAGE URL MAPPINGS
// ══════════════════════════════════════════════════════════════════════════
// Source: Apple Support "Identify your iPhone/iPad/Watch/MacBook" pages
// These are stable, publicly accessible CDN URLs from cdsassets.apple.com.

const APPLE_CDN = 'https://cdsassets.apple.com/live/7WUAS350/images';

const imageByModelSlug = {
  // ── iPhones ──────────────────────────────────────────────────────────
  'iphone-16-pro-max':   `${APPLE_CDN}/iphone/iphone-16-pro-max-colors.png`,
  'iphone-16-pro':       `${APPLE_CDN}/iphone/iphone-16-pro-colors.png`,
  'iphone-16-plus':      `${APPLE_CDN}/iphone/iphone-16-plus-colors.png`,
  'iphone-16':           `${APPLE_CDN}/iphone/iphone-16-colors.png`,

  'iphone-15-pro-max':   `${APPLE_CDN}/iphone/fall-2023-iphone-colors-iphone-15-pro-max.png`,
  'iphone-15-pro':       `${APPLE_CDN}/iphone/fall-2023-iphone-colors-iphone-15-pro.png`,
  'iphone-15-plus':      `${APPLE_CDN}/iphone/fall-2023-iphone-colors-iphone-15-plus.png`,
  'iphone-15':           `${APPLE_CDN}/iphone/fall-2023-iphone-colors-iphone-15.png`,

  'iphone-14-pro-max':   `${APPLE_CDN}/iphone/iphone-14-pro-max-colors.png`,
  'iphone-14-pro':       `${APPLE_CDN}/iphone/iphone-14-pro-colors.png`,
  'iphone-14-plus':      `${APPLE_CDN}/iphone/iphone-14-plus-colors-spring-2023.png`,
  'iphone-14':           `${APPLE_CDN}/iphone/iphone-14-colors-spring-2023.png`,

  'iphone-13-pro-max':   `${APPLE_CDN}/iphone/2022-spring-iphone13-pro-max-colors.png`,
  'iphone-13-pro':       `${APPLE_CDN}/iphone/2022-spring-iphone13-pro-colors.png`,
  'iphone-13':           `${APPLE_CDN}/iphone/2022-spring-iphone13-colors.png`,
  'iphone-13-mini':      `${APPLE_CDN}/iphone/2022-iphone13-mini-colors.png`,

  'iphone-12-pro-max':   `${APPLE_CDN}/iphone/iphone-12-pro-max/iphone12-pro-max-colors.jpg`,
  'iphone-12-pro':       `${APPLE_CDN}/iphone/iphone-12-pro/iphone12-pro-colors.jpg`,
  'iphone-12':           `${APPLE_CDN}/iphone/2021-iphone12-colors.png`,
  'iphone-12-mini':      `${APPLE_CDN}/iphone/2021-iphone12-mini-colors.png`,

  'iphone-se-3-gen':     `${APPLE_CDN}/iphone/iphone-se-3rd-gen-colors.png`,

  'iphone-11-pro-max':   `${APPLE_CDN}/iphone/identify-iphone-11pro-max.jpg`,
  'iphone-11-pro':       `${APPLE_CDN}/iphone/identify-iphone-11pro.jpg`,
  'iphone-11':           `${APPLE_CDN}/iphone/identify-iphone-11-colors.jpg`,

  'iphone-xs-max':       `${APPLE_CDN}/iphone/iphone-xs-max-colors.jpg`,
  'iphone-xr':           `${APPLE_CDN}/iphone/iphone-xr/identify-iphone-xr-colors.jpg`,

  // ── iPads ────────────────────────────────────────────────────────────
  'ipad-pro-13-m4':      `${APPLE_CDN}/ipad/spring-2024-1.png`,
  'ipad-pro-11-m4':      `${APPLE_CDN}/ipad/spring-2024-2.png`,
  'ipad-air-m2':         `${APPLE_CDN}/ipad/spring-2024-3.png`,
  'ipad-10-gen':         `${APPLE_CDN}/ipad/ipad/fall-2022-10-gen-ipad.png`,
  'ipad-9-gen':          `${APPLE_CDN}/ipad/ipad/ipad-2021-colors.png`,
  'ipad-mini-6':         `${APPLE_CDN}/ipad/ipad/ipad-mini-2021-colors.png`,

  // ── MacBooks ─────────────────────────────────────────────────────────
  'macbook-pro-16-m4':   `${APPLE_CDN}/macbook-pro/macbook-pro-16in-2024-colors.png`,
  'macbook-pro-14-m4':   `${APPLE_CDN}/macbook-pro/macbook-pro-14in-2024-m4-pro-m4-max-colors.png`,
  'macbook-air-15-m3':   `${APPLE_CDN}/macbook-air/2024-macbook-air-15in-m3-colors.png`,
  'macbook-air-13-m3':   `${APPLE_CDN}/macbook-air/2024-macbook-air-13in-m3-colors.png`,

  // ── Apple Watch ──────────────────────────────────────────────────────
  'apple-watch-ultra-2':    `${APPLE_CDN}/apple-watch/apple-watch-ultra-2-colors.png`,
  'apple-watch-series-9':   `${APPLE_CDN}/apple-watch/apple-watch-series-9-gps.png`,
  'apple-watch-series-8':   `${APPLE_CDN}/apple-watch/fall-2022-watch-series8-aluminum-gps.png`,
  'apple-watch-se-2-gen':   `${APPLE_CDN}/apple-watch/fall-2022-watch-series8-se-gps.png`,

  // ── Samsung Galaxy S-series ──────────────────────────────────────────
  // Samsung images.samsung.com product gallery URLs (stable CDN)
  'galaxy-s25-ultra':  'https://images.samsung.com/is/image/samsung/p6pim/us/2501/gallery/us-galaxy-s25-ultra-s938-sm-s938bzkdxaa-544706282?$650_519_PNG$',
  'galaxy-s25+':       'https://images.samsung.com/is/image/samsung/p6pim/us/2501/gallery/us-galaxy-s25-plus-s936-sm-s936blbdxaa-544705927?$650_519_PNG$',
  'galaxy-s25':        'https://images.samsung.com/is/image/samsung/p6pim/us/2501/gallery/us-galaxy-s25-s931-sm-s931ulbdxaa-544705484?$650_519_PNG$',

  'galaxy-s24-ultra':  'https://images.samsung.com/is/image/samsung/p6pim/us/2401/gallery/us-galaxy-s24-ultra-s928-sm-s928bzkdxaa-537244544?$650_519_PNG$',
  'galaxy-s24+':       'https://images.samsung.com/is/image/samsung/p6pim/us/2401/gallery/us-galaxy-s24-plus-s926-sm-s926bzkdxaa-537243961?$650_519_PNG$',
  'galaxy-s24':        'https://images.samsung.com/is/image/samsung/p6pim/us/2401/gallery/us-galaxy-s24-s921-sm-s921ulbdxaa-537243464?$650_519_PNG$',

  'galaxy-s23-ultra':  'https://images.samsung.com/is/image/samsung/p6pim/us/2302/gallery/us-galaxy-s23-ultra-s918-sm-s918bzkdxaa-534856837?$650_519_PNG$',
  'galaxy-s23+':       'https://images.samsung.com/is/image/samsung/p6pim/us/2302/gallery/us-galaxy-s23-plus-s916-sm-s916bzkdxaa-534856325?$650_519_PNG$',
  'galaxy-s23':        'https://images.samsung.com/is/image/samsung/p6pim/us/2302/gallery/us-galaxy-s23-s911-sm-s911ulbdxaa-534855782?$650_519_PNG$',

  // ── Samsung Galaxy A-series ──────────────────────────────────────────
  'galaxy-a55':  'https://images.samsung.com/is/image/samsung/p6pim/us/2403/gallery/us-galaxy-a55-5g-a556-sm-a556ezkdxaa-538960064?$650_519_PNG$',
  'galaxy-a54':  'https://images.samsung.com/is/image/samsung/p6pim/us/2303/gallery/us-galaxy-a54-5g-a546-sm-a546uzkdxaa-535182920?$650_519_PNG$',
  'galaxy-a35':  'https://images.samsung.com/is/image/samsung/p6pim/us/2403/gallery/us-galaxy-a35-5g-a356-sm-a356ezkdxaa-538960547?$650_519_PNG$',
  'galaxy-a34':  'https://images.samsung.com/is/image/samsung/p6pim/us/2303/gallery/us-galaxy-a34-5g-a346-sm-a346ezkdxaa-535183274?$650_519_PNG$',
  'galaxy-a15':  'https://images.samsung.com/is/image/samsung/p6pim/us/2312/gallery/us-galaxy-a15-5g-a156-sm-a156uzkdxaa-537839614?$650_519_PNG$',
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════
async function main() {
  // 1. Fetch all models from Supabase
  const { data: models, error } = await supabase
    .from('repair_models')
    .select('id, slug, name, image_url')
    .order('slug');

  if (error) {
    console.error('Error fetching models:', error);
    process.exit(1);
  }

  console.log(`Found ${models.length} models in database.\n`);

  let updated = 0;
  let skipped = 0;
  let notMapped = 0;

  for (const model of models) {
    const imageUrl = imageByModelSlug[model.slug];

    if (!imageUrl) {
      console.log(`  [skip] ${model.slug} — no image mapping`);
      notMapped++;
      continue;
    }

    // Only update if the current image_url differs
    if (model.image_url === imageUrl) {
      console.log(`  [ok]   ${model.slug} — already set`);
      skipped++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from('repair_models')
      .update({ image_url: imageUrl })
      .eq('id', model.id);

    if (updateErr) {
      console.error(`  [ERR]  ${model.slug}:`, updateErr.message);
    } else {
      console.log(`  [SET]  ${model.slug}`);
      updated++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Already set: ${skipped}, No mapping: ${notMapped}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
