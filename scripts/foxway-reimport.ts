// scripts/foxway-reimport.ts — kør: npx tsx scripts/foxway-reimport.ts "<sti-til-csv>"
import fs from "node:fs";
import path from "node:path";

// Indlæs .env.local FØR imports der læser env (brug dynamiske imports nedenfor).
const envPath = path.resolve(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) throw new Error("Angiv sti til CSV-filen som argument");

  const { parseFoxwayCSV } = await import("../src/lib/foxway/parser");
  const { calculateSellPrice } = await import("../src/lib/foxway/pricing");
  const { syncFoxwayItems } = await import("../src/lib/foxway/sync");
  const { createAdminClient } = await import("../src/lib/supabase/admin");

  const csvText = fs.readFileSync(csvPath, "utf-8");
  const parsed = parseFoxwayCSV(csvText);
  console.log(`Parsed: ${parsed.items.length} laptops (${parsed.skipped} skipped af ${parsed.totalRows} rækker)`);
  if (parsed.errors.length) console.log("Parse-fejl:", parsed.errors.slice(0, 5));

  const items = parsed.items.map((item) => ({
    ...item,
    sellPrice: calculateSellPrice(item.buyPrice, item.grade),
  }));

  const supabase = createAdminClient();
  const result = await syncFoxwayItems(items, supabase);
  console.log("Sync-resultat:", JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
