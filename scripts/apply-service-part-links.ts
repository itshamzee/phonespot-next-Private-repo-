/**
 * Indlæser godkendte koblinger (approve = "ja") fra forslags-CSV'en.
 *   npx tsx --env-file=.env.local scripts/apply-service-part-links.ts --file <csv>          (tørkørsel)
 *   npx tsx --env-file=.env.local scripts/apply-service-part-links.ts --file <csv> --apply  (skriv)
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getLagersystemClient, LagersystemError } from "../src/lib/lagersystem/client";
import { existingIdsChunked, parseApprovedLinks, validateLinks } from "./lib/service-part-suggest";

const fileIdx = process.argv.indexOf("--file");
const file = fileIdx > -1 ? process.argv[fileIdx + 1] : null;
const apply = process.argv.includes("--apply");
if (!file) { console.error("Brug: --file <csv> [--apply]"); process.exit(1); }

async function main() {
  const { links, errors } = parseApprovedLinks(readFileSync(file!, "utf8"));
  for (const e of errors) console.warn(e);
  console.log(`${links.length} godkendte koblinger${apply ? "" : " (tørkørsel — tilføj --apply for at skrive)"}.`);
  if (links.length === 0) return;
  if (errors.length > 0) { console.error("Rækker med fejl i filen. Ret dem først; intet er skrevet."); process.exit(1); }
  const client = getLagersystemClient();
  if (!client) { console.error("Sæt LAGERSYSTEM_URL og LAGERSYSTEM_API_KEY i miljøet"); process.exit(1); }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const bad = await validateLinks(links, {
    existingServiceIds: (ids) =>
      existingIdsChunked(ids, async (chunk) => {
        const { data, error } = await sb.from("repair_services").select("id").in("id", chunk);
        if (error) throw error;
        return (data ?? []).map((r) => r.id as string);
      }),
    partExists: async (sku) => {
      try { await client!.getPart(sku); return true; }
      catch (err) { if (err instanceof LagersystemError && err.status === 404) return false; throw err; }
    },
  });
  if (bad.length > 0) { for (const e of bad) console.error(e); console.error("Intet er skrevet."); process.exit(1); }
  if (!apply) return;
  for (let i = 0; i < links.length; i += 200) {
    const { error } = await sb.from("repair_service_shared_parts").upsert(links.slice(i, i + 200), { onConflict: "service_id,shared_sku" });
    if (error) throw error;
  }
  console.log("Skrevet.");
}

main().catch((err) => { console.error(err); process.exit(1); });
