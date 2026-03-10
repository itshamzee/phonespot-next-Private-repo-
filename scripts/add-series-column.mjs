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

// Check if series column exists by trying to select it
const { error } = await supabase.from('repair_models').select('series').limit(1);
if (error) {
  console.log('Series column does not exist yet. Error:', error.message);
  console.log('\nPlease run this SQL in Supabase SQL Editor:');
  console.log('  ALTER TABLE repair_models ADD COLUMN series text;');
} else {
  console.log('Series column already exists. Ready to seed.');
}
