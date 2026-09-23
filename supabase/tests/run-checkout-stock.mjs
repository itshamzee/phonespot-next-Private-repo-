// Disposable local database only. Never reads project env files or default DB credentials.
// Usage: node supabase/tests/run-checkout-stock.mjs <absolute psql path> <isolated port>
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [psql, port] = process.argv.slice(2);
if (!psql || !/^\d+$/.test(port ?? '')) throw new Error('Explicit psql path and isolated port required');
const database = `checkout_stock_test_${Date.now()}`;
const env = { ...process.env };
for (const key of Object.keys(env)) if (key.startsWith('PG')) delete env[key];
env.PGPASSFILE = resolve('supabase/tests/no-password-file');
const args = db => ['-X', '-w', '-h', '127.0.0.1', '-p', port, '-U', 'phonespot_test', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'];
function sql(query, db = database) {
  const r = spawnSync(psql, args(db), { input: query, encoding: 'utf8', env });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || 'psql failed');
  return r.stdout.trim();
}
function file(path) { return sql(`\\i '${resolve(path).replaceAll('\\', '/')}'\n`); }
function session(name) {
  const child = spawn(psql, args(database), { env, stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '', errors = '';
  child.stdout.on('data', c => { output += c; });
  child.stderr.on('data', c => { errors += c; });
  const done = new Promise((res, rej) => child.on('close', code => code === 0 ? res(output) : rej(new Error(errors))));
  child.stdin.write(`SET application_name='${name}';\n`);
  return { child, done, output: () => output };
}
const pause = () => new Promise(r => setTimeout(r, 25));
async function until(check, description) {
  for (let n = 0; n < 160; n++) { if (check()) return; await pause(); }
  throw new Error(`Timed out: ${description}`);
}
async function race(name, firstSql, secondSql) {
  const first = session(`${name}_first`);
  first.child.stdin.write(`BEGIN;\n${firstSql};\n\\echo FIRST_READY\n`);
  await until(() => first.output().includes('FIRST_READY'), `${name} first transaction`);
  const second = session(`${name}_second`);
  second.child.stdin.end(`${secondSql};\n`);
  // Prove the second RPC is blocked on the first row lock before allowing commit.
  await until(() => sql(`SELECT count(*) FROM pg_stat_activity WHERE application_name='${name}_second' AND wait_event_type='Lock'`) === '1', `${name} lock barrier`);
  first.child.stdin.end('COMMIT;\n');
  await Promise.all([first.done, second.done]);
  console.log(`PASS ${name}: concurrent connection blocked before winner committed`);
}

sql(`CREATE DATABASE ${database}`, 'postgres');
console.log(`Isolated database ${database} on 127.0.0.1:${port}`);
sql("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF; END $$");
file('supabase/tests/checkout_stock_fixture.sql');
// Use the exact existing supplier function definitions, without running seed migrations.
for (const [path, name] of [
 ['supabase/migrations/20260325_foxway_integration.sql', 'decrement_foxway_stock'],
 ['supabase/migrations/20260817_laptop_upgrades_rls.sql', 'increment_foxway_stock'],
]) {
  const source = readFileSync(path, 'utf8');
  const start = source.indexOf(`CREATE OR REPLACE FUNCTION ${name}`);
  const end = source.indexOf('$$ LANGUAGE plpgsql;', start) + '$$ LANGUAGE plpgsql;'.length;
  if (start < 0 || end < start) throw new Error('Supplier source definition missing');
  sql(source.slice(start, end));
}
file('supabase/migrations/20260916180000_checkout_stock_reservations.sql');
console.log(file('supabase/tests/checkout_stock_reservations.sql').split('\n').at(-1));

await race('reserve', "SELECT public.reserve_cart_device(test.id(210),repeat('a',64))", "SELECT public.reserve_cart_device(test.id(210),repeat('b',64))");
sql("SELECT test.assert((SELECT reservation_owner_hash=repeat('a',64) FROM public.devices WHERE id=test.id(210)),'one reservation owner')");
sql('SELECT test.new_order(310); SELECT test.new_order(311);');
const attach = n => `SELECT public.attach_checkout_order_items(test.id(${n}),repeat('a',64),jsonb_build_array(jsonb_build_object('item_type','device','device_id',test.id(210),'reservation_id',(SELECT reservation_id FROM public.devices WHERE id=test.id(210)),'quantity',1,'unit_price',30000,'total_price',30000)))`;
await race('attach', attach(310), `DO $$ BEGIN BEGIN ${attach(311).replace(/^SELECT /,'PERFORM ')}; RAISE EXCEPTION 'Expected conflict'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Checkout reservation conflict' THEN RAISE; END IF; END; END $$`);
sql("SELECT test.assert((SELECT count(*)=1 FROM public.order_items WHERE device_id=test.id(210)),'only one order binds generation')");

sql("SELECT test.new_order(312); SELECT test.new_order(313); INSERT INTO public.sku_stock(product_id,location_id,quantity) VALUES(test.id(110),test.id(1),1); INSERT INTO public.order_items(order_id,item_type,sku_product_id,quantity,unit_price,total_price) VALUES(test.id(312),'sku_product',test.id(110),1,100,100),(test.id(313),'sku_product',test.id(110),1,100,100)");
await race('sku', "SELECT public.complete_checkout_order(test.id(312),'cs_312','pi')", "SELECT public.complete_checkout_order(test.id(313),'cs_313','pi')");
sql("SELECT test.assert((SELECT quantity=0 FROM public.sku_stock WHERE product_id=test.id(110)),'no negative stock'); SELECT test.assert((SELECT status='confirmed' FROM public.orders WHERE id=test.id(312)),'one paid checkout wins'); SELECT test.assert((SELECT status='pending' AND payment_status='paid' AND stock_failure_code='insufficient_stock' FROM public.orders WHERE id=test.id(313)),'loser recorded paid stock failure')");
await race('completion_expiry', "SELECT public.complete_checkout_order(test.id(310),'cs_310','pi')", "SELECT public.expire_checkout_order(test.id(310),'cs_310')");
sql("SELECT test.assert((SELECT status='sold' FROM public.devices WHERE id=test.id(210)),'expiry cannot release completed device')");
sql("SELECT test.new_order(314); INSERT INTO public.order_items(order_id,item_type,sku_product_id,quantity,unit_price,total_price) VALUES(test.id(314),'sku_product',test.id(104),1,100,100)");
await race('expiry_completion', "SELECT public.expire_checkout_order(test.id(314),'cs_314')", "SELECT public.complete_checkout_order(test.id(314),'cs_314','pi')");
sql("SELECT test.assert((SELECT status='abandoned' AND stock_committed_at IS NULL FROM public.orders WHERE id=test.id(314)),'completion cannot confirm expired order')");
sql("SET ROLE service_role; SELECT count(*) FROM public.checkout_sku_inventory; SELECT public.release_cart_device('00000000-0000-0000-0000-000000000999',repeat('a',64)); RESET ROLE;");
for (const role of ['anon','authenticated']) {
  for (const query of ["SELECT * FROM public.checkout_sku_inventory", "SELECT public.reserve_cart_device('00000000-0000-0000-0000-000000000201',repeat('a',64))"]) {
    try { sql(`SET ROLE ${role}; ${query}`); throw new Error('Expected permission denied'); }
    catch (e) { if (!e.message.includes('permission denied')) throw e; }
  }
}
console.log('PASS runtime service/anon/authenticated access checks');
console.log(`All SQL + 5 controlled concurrency cases passed. Database retained for review: ${database}`);
