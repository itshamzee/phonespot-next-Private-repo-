/**
 * Updates image_url for repair models using Apple CDN product images.
 * Run: node scripts/update-image-urls.mjs
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

// Map model names to Apple CDN image URLs
const imageMap = {
  // ── iPhones ──
  'iPhone 16 Pro Max': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-pro-max-colors.png',
  'iPhone 16 Pro': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-pro-colors.png',
  'iPhone 16 Plus': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-plus-colors.png',
  'iPhone 16': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-colors.png',
  'iPhone 15 Pro Max': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/fall-2023-iphone-colors-iphone-15-pro-max.png',
  'iPhone 15 Pro': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/fall-2023-iphone-colors-iphone-15-pro.png',
  'iPhone 15 Plus': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/fall-2023-iphone-colors-iphone-15-plus.png',
  'iPhone 15': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/fall-2023-iphone-colors-iphone-15.png',
  'iPhone 14 Pro Max': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-14-pro-max-colors.png',
  'iPhone 14 Pro': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-14-pro-colors.png',
  'iPhone 14 Plus': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-14-plus-colors-spring-2023.png',
  'iPhone 14': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-14-colors-spring-2023.png',
  'iPhone 13 Pro Max': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/2022-spring-iphone13-pro-max-colors.png',
  'iPhone 13 Pro': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/2022-spring-iphone13-pro-colors.png',
  'iPhone 13': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/2022-spring-iphone13-colors.png',
  'iPhone 13 Mini': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/2022-iphone13-mini-colors.png',
  'iPhone 12 Pro Max': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-12-pro-max/iphone12-pro-max-colors.jpg',
  'iPhone 12 Pro': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-12-pro/iphone12-pro-colors.jpg',
  'iPhone 12': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/2021-iphone12-colors.png',
  'iPhone 12 Mini': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/2021-iphone12-mini-colors.png',
  'iPhone 11 Pro Max': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/identify-iphone-11pro-max.jpg',
  'iPhone 11 Pro': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/identify-iphone-11pro.jpg',
  'iPhone 11': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/identify-iphone-11-colors.jpg',
  'iPhone SE (3. gen)': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-se-3rd-gen-colors.png',
  'iPhone SE (2. gen)': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-se/iphone-se-2nd-gen-colors.jpg',
  'iPhone XS Max': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-xs-max-colors.jpg',
  'iPhone XS': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-xs-colors.jpg',
  'iPhone XR': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-xr/identify-iphone-xr-colors.jpg',
  'iPhone X': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-x-colors.jpg',
  'iPhone 8 Plus': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-8-plus/iphone8plus-colors.jpg',
  'iPhone 8': 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-8/iphone-8-colors.jpg',

  // ── iPads ──
  'iPad Pro 13" M4': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/spring-2024-1.png',
  'iPad Pro 11" M4': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/spring-2024-2.png',
  'iPad Pro 12.9" M2': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/ipad/fall-2022-12-9-inch-6gen-ipad-pro.png',
  'iPad Pro 11" M2': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/ipad/fall-2022-11-inch-4gen-ipad-pro.png',
  'iPad Pro 12.9" M1': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/ipad/fall-2022-12-9-inch-6gen-ipad-pro.png',
  'iPad Pro 11" M1': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/ipad/fall-2022-11-inch-4gen-ipad-pro.png',
  'iPad Air 13" M2': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/spring-2024-3.png',
  'iPad Air 11" M2': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/spring-2024-4.png',
  'iPad Air (5. gen) M1': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/spring-2024-4.png',
  'iPad Air (4. gen)': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/spring-2024-4.png',
  'iPad (10. gen)': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/ipad/fall-2022-10-gen-ipad.png',
  'iPad (9. gen)': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/ipad/fall-2022-10-gen-ipad.png',
  'iPad (8. gen)': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/ipad/fall-2022-10-gen-ipad.png',
  'iPad (7. gen)': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/ipad/fall-2022-10-gen-ipad.png',
  'iPad Mini (6. gen)': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/ipad-mini/ipad-mini-2024-colors.png',
  'iPad Mini (5. gen)': 'https://cdsassets.apple.com/live/7WUAS350/images/ipad/ipad-mini/ipad-mini-2024-colors.png',

  // ── MacBook Pro ──
  'MacBook Pro 16" M4 Pro/Max': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-pro/macbook-pro-16in-2024-colors.png',
  'MacBook Pro 14" M4 Pro/Max': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-pro/macbook-pro-14in-2024-m4-pro-m4-max-colors.png',
  'MacBook Pro 14" M4': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-pro/macbook-pro-14in-2024-m4-colors.png',
  'MacBook Pro 16" M3 Pro/Max': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-pro/macbook-pro-16in-m3-pro-m3-max-nov-2023-silver-space-black.png',
  'MacBook Pro 14" M3 Pro/Max': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-pro/macbook-pro-14in-m3-pro-m3-max-nov-2023-silver-space-black.png',
  'MacBook Pro 14" M3': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-pro/macbook-pro-14in-m3-nov-2023-silver-space-gray.png',
  'MacBook Pro 16" M2 Pro/Max': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-pro/macbook-pro-16in-2023.png',
  'MacBook Pro 14" M2 Pro/Max': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-pro/macbook-pro-14in-2023.png',
  'MacBook Pro 13" M2': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-pro/macbook-pro-13-in-M2-2022.png',
  'MacBook Pro 16" M1 Pro/Max': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-pro/macbook-pro-2021-16in.png',
  'MacBook Pro 14" M1 Pro/Max': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-pro/macbook-pro-2021-14in.png',
  'MacBook Pro 13" M1': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-pro/macbook-pro-2020-late-13in-device.jpg',

  // ── MacBook Air ──
  'MacBook Air 15" M4': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-air/2025-macbook-air-15in-colors.png',
  'MacBook Air 13" M4': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-air/2025-macbook-air-13in-colors.png',
  'MacBook Air 15" M3': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-air/2024-macbook-air-15in-m3-colors.png',
  'MacBook Air 13" M3': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-air/2024-macbook-air-13in-m3-colors.png',
  'MacBook Air 15" M2': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-air/2023-macbook-air-15in-m2-colors.png',
  'MacBook Air 13" M2': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-air/2022-macbook-air-m2-colors.png',
  'MacBook Air 13" M1': 'https://cdsassets.apple.com/live/7WUAS350/images/macbook-air/macbook-air-2020-late-device.jpg',
};

async function main() {
  console.log('Updating image URLs for Apple models...\n');

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
