/**
 * Foreslår koblinger reparationsydelse -> del ud fra model og kvalitet (spec §4.4).
 *   LAGERSYSTEM_URL=… LAGERSYSTEM_API_KEY=… npx tsx --env-file=.env.local scripts/suggest-service-parts.ts --out <mappe>
 * Kør fra hovedcheckoutet. Skriver service-part-forslag.csv (semikolon + BOM, åbner direkte i dansk Excel) til ejerens godkendelse:
 * ret/udfyld kolonnen approve ("ja"), og kør derefter apply-service-part-links.ts.
 * Ydelser, der allerede har en kobling, springes over.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getLagersystemClient } from "../src/lib/lagersystem/client";
import Papa from "papaparse";
import { suggestForService, type ServiceIn } from "./lib/service-part-suggest";

const outIdx = process.argv.indexOf("--out");
const out = outIdx > -1 ? process.argv[outIdx + 1] : null;
if (!out) { console.error("Brug: --out <mappe>"); process.exit(1); }
const client = getLagersystemClient();
if (!client) { console.error("Sæt LAGERSYSTEM_URL og LAGERSYSTEM_API_KEY i miljøet"); process.exit(1); }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function main() {
  const [svc, models, brands, linked] = await Promise.all([
    sb.from("repair_services").select("id, name, quality_tier, service_category, model_id").eq("active", true),
    sb.from("repair_models").select("id, name, brand_id"),
    sb.from("repair_brands").select("id, name"),
    sb.from("repair_service_shared_parts").select("service_id"),
  ]);
  for (const r of [svc, models, brands, linked]) if (r.error) throw r.error;
  const modelById = new Map((models.data ?? []).map((m) => [m.id, m]));
  const brandById = new Map((brands.data ?? []).map((b) => [b.id, b.name as string]));
  const done = new Set((linked.data ?? []).map((l) => l.service_id));

  const byModel = new Map<string, ServiceIn[]>();
  for (const s of svc.data ?? []) {
    if (done.has(s.id)) continue;
    const m = modelById.get(s.model_id);
    if (!m) continue;
    const list = byModel.get(m.name) ?? [];
    list.push({ id: s.id, name: s.name, quality_tier: s.quality_tier, service_category: s.service_category, model: m.name, brand: brandById.get(m.brand_id) ?? "" });
    byModel.set(m.name, list);
  }

  const rows = [];
  for (const [modelName, services] of byModel) {
    const catalog = await client!.searchParts(modelName, 50).catch((err) => { console.warn(`Katalogsøgning fejlede for ${modelName}:`, err.message); return []; });
    for (const s of services) rows.push(suggestForService(s, catalog));
  }
  mkdirSync(out!, { recursive: true });
  writeFileSync(join(out!, "service-part-forslag.csv"), "﻿" + Papa.unparse(rows, { delimiter: ";" }), "utf8");
  const count = (c: string) => rows.filter((r) => r.confidence === c).length;
  console.log(`Skrev ${rows.length} forslag: høj ${count("høj")}, middel ${count("middel")}, lav ${count("lav")}, ingen ${count("ingen")}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
