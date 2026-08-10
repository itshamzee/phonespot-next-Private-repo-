import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBuybackSettings, DEFAULT_BUYBACK_SETTINGS } from "@/lib/buyback/settings";
import { estimateBuyback } from "@/lib/buyback/estimate";
import type { BuybackCondition, BuybackDevice } from "@/lib/buyback/types";

/* GET /api/trade-in/estimate-public?model=xxx&storage=xxx — public teaser range.
 *
 * PUBLIC endpoint (no auth). Unlike /api/trade-in/suggest, this must never expose
 * our margin, negotiation floor or parts cost — that is buying strategy, not
 * customer-facing data. It returns only a rounded, conservative kr range built
 * from `floorOfferOre` (the most generous offer we could still honour), never
 * `aimOfferOre`. Only `model` and `storage` are accepted from the query string —
 * no engine settings, condition or margin overrides can be passed in.
 */

// Assume the best case (perfect cosmetic condition, working, not iCloud-locked)
// for the public teaser — the real number is refined once the customer answers
// the condition questions in the sell flow.
const GOOD_CONDITION: BuybackCondition = {
  screen: "Perfekt",
  back: "Perfekt",
  battery: "God (80%+)",
  allWorking: "Ja",
  brokenParts: [],
  cloudLocked: "Nej",
};

// Round DOWN to whole hundred kroner (10.000 øre) so the published figure is
// always at or below what the engine would actually offer, never above it.
const PUBLIC_ROUNDING_ORE = 10_000;
function roundDownToHundredKr(ore: number): number {
  if (ore <= 0) return 0;
  return Math.floor(ore / PUBLIC_ROUNDING_ORE) * PUBLIC_ROUNDING_ORE;
}

// The published low end sits a fixed step below the (rounded) high end so we
// never claim to offer more than we would actually pay, while still reading as
// a range rather than a single number.
const RANGE_SPREAD_ORE = 100_00; // 100 kr

// Simple in-memory per-IP rate limit (per-process; good enough for a single
// Vercel instance — see report for what this does and doesn't prevent).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

type PublicEstimate = { available: true; lowOre: number; highOre: number } | { available: false };

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ available: false } satisfies PublicEstimate, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  // Whitelist: only `model` and `storage` are ever read from the query string.
  // No settings, condition, margin or anything else can be passed in.
  const model = (searchParams.get("model") ?? "").trim();
  const storage = (searchParams.get("storage") ?? "").trim();

  if (!model) {
    return NextResponse.json({ available: false } satisfies PublicEstimate, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  const device: BuybackDevice = {
    deviceType: "",
    brand: "Apple", // only Apple devices are auto-priced; anything else resolves to "manual" below
    model,
    storage,
    ram: "",
    useCustom: false,
    brandCustom: "",
    modelCustom: "",
  };

  // A public, unauthenticated endpoint must never 500 (and never leak a stack
  // trace) just because Supabase is briefly unreachable or misconfigured — it
  // should simply have nothing to publish. `supabase` is deliberately typed to
  // allow null so a failed client construction still flows through rather than
  // throwing before we get a chance to degrade gracefully.
  let supabase: ReturnType<typeof createAdminClient> | null;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = null;
  }

  let settings = DEFAULT_BUYBACK_SETTINGS;
  if (supabase) {
    try {
      settings = await loadBuybackSettings(supabase);
    } catch {
      // Keep defaults — a settings-table hiccup should not break the teaser.
    }
  }

  let result;
  try {
    result = await estimateBuyback(supabase as ReturnType<typeof createAdminClient>, device, GOOD_CONDITION, settings);
  } catch {
    return NextResponse.json({ available: false } satisfies PublicEstimate, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  if (result.status !== "ok") {
    // Never guess: no own listing, unknown/non-Apple model, or any other
    // manual-review case all mean we simply have nothing to publish.
    return NextResponse.json({ available: false } satisfies PublicEstimate, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  // Build the response literally, field by field. NEVER spread `result` and
  // never JSON.stringify it — a future engine field must not silently become
  // public just because it exists on PricingResult.
  const highOre = roundDownToHundredKr(result.floorOfferOre);
  if (highOre <= 0) {
    return NextResponse.json({ available: false } satisfies PublicEstimate, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }
  const lowOre = Math.max(0, roundDownToHundredKr(highOre - RANGE_SPREAD_ORE));

  const body: PublicEstimate = { available: true, lowOre, highOre };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
