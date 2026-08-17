import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envPath = 'C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next/.env.local';
const env = {};
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i === -1) continue;
  env[t.slice(0, i)] = t.slice(i + 1);
}
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const OPTION_ID = 'd1117196-f0b9-4758-9997-14515e5e4763'; // "Opgrader til 32 GB RAM (inkl. montering)"
const T14S_ID   = '15904ca2-59dc-4408-82dc-8ca7c2c5e3b3'; // Lenovo ThinkPad T14s G1 — loddet RAM, kan IKKE opgraderes
const EB840G8_ID = '8fae4257-1adb-4725-895f-196549b98729'; // HP EliteBook 840 G7 — 2x SODIMM, 6 listede enheder, koebbar PDP

const del = await svc
  .from('template_upgrade_options')
  .delete()
  .eq('template_id', T14S_ID)
  .eq('upgrade_option_id', OPTION_ID)
  .select();
console.log('deleted T14s G1 link rows:', del.data?.length ?? 0, '| error:', del.error?.message ?? 'none');

const ins = await svc
  .from('template_upgrade_options')
  .upsert({ template_id: EB840G8_ID, upgrade_option_id: OPTION_ID })
  .select();
console.log('inserted EliteBook 840 G8 link rows:', ins.data?.length ?? 0, '| error:', ins.error?.message ?? 'none');

const { data: after } = await svc
  .from('template_upgrade_options')
  .select('template_id, upgrade_option_id, template:product_templates(display_name, slug)');
console.log('=== links after fix ===');
for (const l of after ?? []) console.log('  ', l.template?.display_name, '|', l.template?.slug, '-> opt', l.upgrade_option_id);
