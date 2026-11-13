import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBuybackSettings } from "@/lib/buyback/settings";
import { estimateGuidePrice } from "@/lib/buyback/guide-price-server";
import { readLeadDevices } from "@/lib/buyback/lead-devices";

/**
 * Offentlig: vejledende opkøbspris til sælg-formularen. Svarer kun med et
 * beløb eller "ingen pris". Salgspris, fortjeneste og årsag sendes aldrig ud.
 * Slået fra, indtil ejeren tænder for det i admin (publicPriceEnabled).
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, { count: number; resetAt: number }>();

// Bedste forsøg: hver serverinstans tæller for sig. Det bremser en løkke fra én
// adresse, men er ikke en garanti. Prisen kan alligevel ses ved at udfylde formularen.
function limited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    if (hits.size > 5000) hits.clear();
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const none = () => NextResponse.json({ priced: false }, { headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "ukendt";
  if (limited(ip)) return NextResponse.json({ priced: false }, { status: 429, headers: { "Cache-Control": "no-store" } });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return none();
  }

  // Samme læser som resten af opkøbet, så formularens felter tolkes ens overalt.
  const [lead] = readLeadDevices({ devices: [body] });
  if (!lead) return none();

  try {
    const client = createAdminClient();
    const settings = await loadBuybackSettings(client);
    const estimate = await estimateGuidePrice(client, lead.device, lead.condition, settings);
    if (estimate.status !== "priced") return none();
    return NextResponse.json({ priced: true, amountDkk: estimate.amountOre / 100 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return none();
  }
}
