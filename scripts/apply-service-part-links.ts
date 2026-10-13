/**
 * Indlæser godkendte koblinger (approve = "ja") fra forslags-CSV'en.
 *   npx tsx --env-file=.env.local scripts/apply-service-part-links.ts --file <csv>          (tørkørsel)
 *   npx tsx --env-file=.env.local scripts/apply-service-part-links.ts --file <csv> --apply  (skriv)
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseApprovedLinks } from "./lib/service-part-suggest";

const fileIdx = process.argv.indexOf("--file");
const file = fileIdx > -1 ? process.argv[fileIdx + 1] : null;
const apply = process.argv.includes("--apply");
if (!file) { console.error("Brug: --file <csv> [--apply]"); process.exit(1); }

async function main() {
  const { links, errors } = parseApprovedLinks(readFileSync(file!, "utf8"));
  for (const e of errors) console.warn(e);
  console.log(`${links.length} godkendte koblinger${apply ? "" : " (tørkørsel — tilføj --apply for at skrive)"}.`);
  if (!apply || links.length === 0) return;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  for (let i = 0; i < links.length; i += 200) {
    const { error } = await sb.from("repair_service_shared_parts").upsert(links.slice(i, i + 200), { onConflict: "service_id,shared_sku" });
    if (error) throw error;
  }
  console.log("Skrevet.");
}

main().catch((err) => { console.error(err); process.exit(1); });
