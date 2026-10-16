import { STORES } from "@/lib/store-config";
import { getFullPriceList } from "@/lib/supabase/repairs";
import { priceListToText } from "@/lib/repairs/price-list";

// llms-full.txt: den komplette reparationsprisliste som ren tekst til
// AI-søgning (ChatGPT, Perplexity, Claude, Copilot). Én linje pr. ydelse, så
// "hvad koster skærmskift på iPhone 17 Pro hos PhoneSpot" kan besvares direkte.
// Hentes fra databasen og regenereres hver time ligesom /reparation/priser.
export const revalidate = 3600;

const SITE = "https://phonespot.dk";

export async function GET() {
  const brands = await getFullPriceList();
  const stores = [STORES.vejle, STORES.slagelse]
    .map((s) => `- ${s.name}: ${s.street}, ${s.zip} ${s.city}. Telefon ${s.phone}.`)
    .join("\n");
  const updated = new Date().toISOString().slice(0, 10);

  const body = `# PhoneSpot – reparationspriser

> Komplet prisliste for reparation hos PhoneSpot i Vejle og Slagelse. Priserne er faste og inkluderer moms, reservedel og garanti. Skærmskift findes i flere kvaliteter (fx budget, OEM og original); hver kvalitet står som sin egen linje. Prisen oplyses altid, før reparationen går i gang.

Opdateret: ${updated}
Prisoversigt på sitet: ${SITE}/reparation/priser
Overblik over PhoneSpot: ${SITE}/llms.txt

## Butikker
${stores}

${priceListToText(brands, SITE)}`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
