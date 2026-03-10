import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

// Use the PostgREST SQL endpoint directly
const sql = 'ALTER TABLE repair_models ADD COLUMN IF NOT EXISTS series text;';

// Try via the Supabase REST SQL endpoint
const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  },
  body: JSON.stringify({ sql_query: sql }),
});

if (!res.ok) {
  console.log('RPC approach failed, trying direct pg approach...');

  // Extract the DB connection details from supabase URL
  // Format: https://PROJECT_ID.supabase.co
  const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

  // Try the Supabase Management API
  const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!mgmtRes.ok) {
    console.log('Management API also failed.');
    console.log('Status:', mgmtRes.status);
    console.log('\nPlease run this SQL in Supabase SQL Editor:');
    console.log(sql);
    process.exit(1);
  } else {
    console.log('Migration ran via Management API');
  }
} else {
  console.log('Migration ran via RPC');
}
