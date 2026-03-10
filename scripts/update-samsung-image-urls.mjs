/**
 * Updates image_url for Samsung repair models using Samsung CDN product images.
 * Run: node scripts/update-samsung-image-urls.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  env[t.slice(0, i)] = t.slice(i + 1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Samsung CDN base: https://images.samsung.com/is/image/samsung/p6pim/dk/...
// Append ?$730_584_PNG$ for properly sized product images
const CDN = 'https://images.samsung.com/is/image/samsung/p6pim/dk';

// Reusable base URLs (Samsung phones look very similar across generations)
const S25_ULTRA = `${CDN}/2501/gallery/dk-galaxy-s25-s938-sm-s938bzbdeub-thumb-544689316?$730_584_PNG$`;
const S25 = `${CDN}/2501/gallery/dk-galaxy-s25-s931-sm-s931bdbdeub-thumb-544648831?$730_584_PNG$`;
const A56 = `${CDN}/sm-a566bzaaeub/gallery/dk-galaxy-a56-5g-sm-a566-sm-a566bzaaeub-thumb-545220411?$730_584_PNG$`;
const A36 = `${CDN}/sm-a366blvbeub/gallery/dk-galaxy-a36-5g-sm-a366-sm-a366blvbeub-thumb-545223562?$730_584_PNG$`;
const Z_FOLD = `${CDN}/f2507/gallery/dk-galaxy-z-fold7-f966-sm-f966bdbbeub-thumb-547681579?$730_584_PNG$`;
const Z_FLIP = `${CDN}/f2507/gallery/dk-galaxy-zflip7-f766-sm-f766bdbgeub-thumb-547678488?$730_584_PNG$`;
const TAB_ULTRA = `${CDN}/sm-x920nzareub/gallery/dk-galaxy-tab-s10-ultra-sm-x920-524686-sm-x920nzareub-thumb-543742809?$730_584_PNG$`;
const TAB_PLUS = `${CDN}/sm-x820nzapeub/gallery/dk-galaxy-tab-s10-plus-sm-x820-524705-sm-x820nzapeub-thumb-543744136?$730_584_PNG$`;
const TAB_STD = `${CDN}/sm-x730nzareub/gallery/dk-galaxy-tab-s11-sm-x730-sm-x730nzareub-thumb-548954892?$730_584_PNG$`;
const TAB_FE = `${CDN}/sm-x520nzareub/gallery/dk-galaxy-tab-s10-fe-sm-x526-sm-x520nzareub-thumb-545837912?$730_584_PNG$`;
const TAB_A = `${CDN}/sm-x130nzaaeub/gallery/dk-galaxy-tab-a11-sm-x130-566345-sm-x130nzaaeub-thumb-549286420?$730_584_PNG$`;

const imageMap = {
  // ── Galaxy S-serien ──
  'Galaxy S25 Ultra': S25_ULTRA,
  'Galaxy S25+': S25,
  'Galaxy S25': S25,
  'Galaxy S24 Ultra': S25_ULTRA,
  'Galaxy S24+': S25,
  'Galaxy S24': S25,
  'Galaxy S23 Ultra': S25_ULTRA,
  'Galaxy S23+': S25,
  'Galaxy S23': S25,
  'Galaxy S22 Ultra': S25_ULTRA,
  'Galaxy S22+': S25,
  'Galaxy S22': S25,
  'Galaxy S21 Ultra': S25_ULTRA,
  'Galaxy S21+': S25,
  'Galaxy S21': S25,

  // ── Galaxy A-serien ──
  'Galaxy A55': A56,
  'Galaxy A54': A56,
  'Galaxy A53': A56,
  'Galaxy A35': A36,
  'Galaxy A34': A36,
  'Galaxy A25': A36,
  'Galaxy A15': A36,
  'Galaxy A14': A36,

  // ── Galaxy Z Flip / Fold ──
  'Galaxy Z Fold 6': Z_FOLD,
  'Galaxy Z Fold 5': Z_FOLD,
  'Galaxy Z Fold 4': Z_FOLD,
  'Galaxy Z Flip 6': Z_FLIP,
  'Galaxy Z Flip 5': Z_FLIP,
  'Galaxy Z Flip 4': Z_FLIP,

  // ── Galaxy Tab ──
  'Galaxy Tab S9 Ultra': TAB_ULTRA,
  'Galaxy Tab S9+': TAB_PLUS,
  'Galaxy Tab S9': TAB_STD,
  'Galaxy Tab S9 FE': TAB_FE,
  'Galaxy Tab S8 Ultra': TAB_ULTRA,
  'Galaxy Tab S8+': TAB_PLUS,
  'Galaxy Tab S8': TAB_STD,
  'Galaxy Tab A9+': TAB_A,
  'Galaxy Tab A9': TAB_A,
};

async function main() {
  console.log('Updating image URLs for Samsung models...\n');

  let updated = 0;
  for (const [modelName, imageUrl] of Object.entries(imageMap)) {
    const { data, error } = await supabase
      .from('repair_models')
      .update({ image_url: imageUrl })
      .eq('name', modelName)
      .select('id, name');

    if (error) {
      console.error(`  Error updating ${modelName}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`  Updated: ${modelName}`);
      updated++;
    } else {
      console.log(`  Not found: ${modelName}`);
    }
  }

  console.log(`\nUpdated ${updated} models with product images.`);
}

main().catch(console.error);
