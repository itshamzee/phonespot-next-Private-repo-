#!/usr/bin/env node
// Lægger gennemgåede GTIN'er ind i product_templates.default_attributes.gtins_by_variant.
//
//   node scripts/apply-gtin-varianter.mjs <json> [--apply] [--env <sti til .env.local>]
//
// Uden --apply er det en prøvekørsel: den viser ændringerne og skriver intet.
// Med --apply gemmes først en backup af de berørte skabeloners default_attributes
// (backup-gtins-<tidspunkt>.json ved siden af JSON-filen). Skriver kun til
// gtins_by_variant, og en eksisterende anden værdi for samme nøgle overskrives
// aldrig: den bliver rapporteret, og kørslen stopper, før noget skrives.

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const envFlag = args.indexOf("--env");
const envPath = envFlag >= 0 ? args[envFlag + 1] : ".env.local";
const jsonPath = args.find((a, i) => !a.startsWith("--") && (envFlag < 0 || i !== envFlag + 1));
if (!jsonPath) {
  console.error("Brug: node scripts/apply-gtin-varianter.mjs <json> [--apply] [--env <sti>]");
  process.exit(1);
}

function readEnv(key) {
  if (process.env[key]) return process.env[key];
  const text = fs.readFileSync(envPath, "utf8");
  const match = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

function hasValidCheckDigit(gtin) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(gtin)) return false;
  const digits = gtin.padStart(14, "0").split("").map(Number);
  const sum = digits.slice(0, 13).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === digits[13];
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const entries = data.variants ?? [];

const problems = [];
const seen = new Map();
for (const e of entries) {
  const label = `${e.template_slug} ${e.storage}|${e.color}`;
  if (!e.template_slug || !e.storage || !e.color || !e.source_url) problems.push(`${label}: mangler felt`);
  if (!hasValidCheckDigit(e.gtin ?? "")) problems.push(`${label}: ugyldigt kontrolciffer (${e.gtin})`);
  if (seen.has(e.gtin) && seen.get(e.gtin) !== label) problems.push(`${e.gtin} står på både ${seen.get(e.gtin)} og ${label}`);
  seen.set(e.gtin, label);
}

const slugs = [...new Set(entries.map((e) => e.template_slug))];
const res = await fetch(
  `${url}/rest/v1/product_templates?select=id,slug,default_attributes&slug=in.(${slugs.join(",")})`,
  { headers },
);
if (!res.ok) throw new Error(`Læsning fejlede: ${res.status}`);
const templates = await res.json();
const bySlug = new Map(templates.map((t) => [t.slug, t]));

const updates = [];
for (const slug of slugs) {
  const template = bySlug.get(slug);
  if (!template) {
    problems.push(`${slug}: skabelon findes ikke`);
    continue;
  }
  const current = template.default_attributes?.gtins_by_variant ?? {};
  const merged = { ...current };
  let changed = 0;
  for (const e of entries.filter((x) => x.template_slug === slug)) {
    const k = `${e.storage}|${e.color}`;
    if (merged[k] === e.gtin) continue;
    if (merged[k]) {
      problems.push(`${slug} ${k}: har allerede ${merged[k]}, afviser ${e.gtin}`);
      continue;
    }
    merged[k] = e.gtin;
    changed += 1;
  }
  if (changed > 0) updates.push({ template, merged, changed });
}

for (const u of updates) console.log(`${u.template.slug}: ${u.changed} nye`);
console.log(`${updates.reduce((a, u) => a + u.changed, 0)} nye GTIN'er på ${updates.length} skabeloner.`);

if (problems.length > 0) {
  console.error(`\nStopper, intet er skrevet (${problems.length} problemer):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exitCode = 1;
} else if (!apply) {
  console.log("Prøvekørsel, intet er skrevet. Tilføj --apply for at skrive.");
} else if (updates.length > 0) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(path.dirname(jsonPath), `backup-gtins-${stamp}.json`);
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      updates.map((u) => ({ id: u.template.id, slug: u.template.slug, default_attributes: u.template.default_attributes })),
      null,
      2,
    ),
  );
  console.log(`Backup: ${backupPath}`);

  for (const u of updates) {
    const r = await fetch(`${url}/rest/v1/product_templates?id=eq.${u.template.id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        default_attributes: { ...u.template.default_attributes, gtins_by_variant: u.merged },
      }),
    });
    if (!r.ok) throw new Error(`Skrivning fejlede for ${u.template.slug}: ${r.status} ${await r.text()}`);
  }
  console.log("Færdig.");
}
