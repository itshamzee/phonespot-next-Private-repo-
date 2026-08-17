/**
 * Apply pending migrations that are committed to the repo but not yet
 * present in the Supabase production schema.
 *
 * Strategy: since Supabase JS SDK does not expose arbitrary DDL, we try:
 *   1. An RPC `exec_sql` if one exists in the project
 *   2. The Supabase Management API (requires sbp_ personal-access-token)
 *   3. Else: print the SQL and abort so the user can paste it into
 *      the Supabase SQL Editor manually.
 *
 * All target statements are idempotent (ADD COLUMN IF NOT EXISTS,
 * CREATE INDEX IF NOT EXISTS, UPDATE ... WHERE already-flag).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i === -1) continue;
  env[t.slice(0, i)] = t.slice(i + 1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = env.SUPABASE_SERVICE_ROLE_KEY;
const mgmtToken   = env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_MANAGEMENT_TOKEN;

if (!supabaseUrl || !serviceKey) { console.error('Missing env'); process.exit(1); }

const MIGRATIONS = ['20260817_foxway_dropship.sql', '20260817_laptop_upgrades.sql'];

const migDir = path.resolve(__dirname, '..', 'supabase', 'migrations');

async function tryRpc(sql) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ sql_query: sql }),
  });
  if (res.ok) return { ok: true, via: 'rpc' };
  return { ok: false, status: res.status, body: await res.text() };
}

async function tryMgmt(sql) {
  if (!mgmtToken) return { ok: false, reason: 'no mgmt token' };
  const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgmtToken}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  if (res.ok) return { ok: true, via: 'mgmt', body: await res.text() };
  return { ok: false, status: res.status, body: await res.text() };
}

for (const file of MIGRATIONS) {
  const filePath = path.join(migDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`× ${file}: missing`);
    continue;
  }
  const sql = fs.readFileSync(filePath, 'utf-8');
  console.log(`\n── Applying ${file} ──`);
  console.log(sql.split('\n').slice(0, 3).join('\n') + (sql.split('\n').length > 3 ? '\n  …' : ''));

  let res = await tryRpc(sql);
  if (!res.ok) {
    console.log(`  RPC failed (${res.status}). Trying Management API…`);
    res = await tryMgmt(sql);
  }
  if (res.ok) {
    console.log(`  ✓ applied via ${res.via}`);
  } else {
    console.error(`  × could not apply — ${res.body?.slice(0, 300) ?? res.reason}`);
    console.error(`\n  Paste the following into Supabase SQL Editor:\n`);
    console.error('  ' + sql.split('\n').join('\n  '));
    process.exit(2);
  }
}

console.log('\n✓ all pending migrations applied');

// Verification: confirm the new columns are queryable via PostgREST.
console.log('\n── Verifying columns ──');
const supabase = createClient(supabaseUrl, serviceKey);

const ordersCheck = await supabase.from('orders').select('foxway_status, foxway_order_ref').limit(1);
if (ordersCheck.error) {
  console.error('  × orders.foxway_status / foxway_order_ref:', ordersCheck.error.message);
  process.exit(3);
}
console.log('  ✓ orders.foxway_status / orders.foxway_order_ref queryable');

const devicesCheck = await supabase.from('devices').select('source_url').limit(1);
if (devicesCheck.error) {
  console.error('  × devices.source_url:', devicesCheck.error.message);
  process.exit(3);
}
console.log('  ✓ devices.source_url queryable');

console.log('\n✓ verification passed');
process.exit(0);
