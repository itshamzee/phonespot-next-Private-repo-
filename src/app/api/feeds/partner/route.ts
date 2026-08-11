import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { checkPartnerAuth } from "@/lib/feeds/partner-auth";
import { DEFAULT_PARTNER_FEED_CATEGORIES, fetchPartnerFeedRows } from "@/lib/feeds/partner-data";
import { toPartnerFeedCsv, toPartnerFeedJson } from "@/lib/feeds/partner-serialize";

export const dynamic = "force-dynamic";

/**
 * GET /api/feeds/partner
 *
 * Authenticated B2B stock feed for wholesale partners. Refurbished phones by
 * default (product_templates.category in 'iphone'/'smartphone').
 *
 * This is deliberately NOT public like the marketing feeds under
 * /api/feeds/{google,iphones,pricerunner} and /feeds/google-shopping — it
 * exposes real quantity, VAT scheme and per-unit barcodes, so every request
 * must carry a valid `PARTNER_FEED_TOKEN` as either:
 *   Authorization: Bearer <token>
 *   X-Api-Key: <token>
 * No token configured on the server => 503 (never falls open to public).
 * Wrong/missing token => 401.
 *
 * Query params:
 *   ?category=  whitelist of product_templates.category values, repeatable
 *               (?category=iphone&category=smartphone) or comma-separated
 *               (?category=iphone,smartphone). Defaults to phones only, so
 *               enabling tablets/laptops later needs no code change — the
 *               partner just requests ?category=ipad.
 *   ?format=    "json" (default) or "csv".
 *
 * Caching is short and private (never a public/CDN cache) because this is
 * authenticated, stock-sensitive data.
 */
export async function GET(req: NextRequest) {
  const auth = checkPartnerAuth(req.headers);
  if (!auth.ok) {
    const message = auth.status === 503 ? "Feed not configured" : "Unauthorized";
    return NextResponse.json({ error: message }, { status: auth.status });
  }

  const url = new URL(req.url);
  const categories = parseCategories(url.searchParams);
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();

  try {
    const supabase = createServerClient();
    const rows = await fetchPartnerFeedRows(supabase, categories);

    // Private + short-lived: this payload carries stock levels and VAT
    // scheme, so it must never be cached by a shared/CDN cache.
    const cacheControl = "private, max-age=60, must-revalidate";

    if (format === "csv") {
      return new NextResponse(toPartnerFeedCsv(rows), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="phonespot-partner-feed.csv"',
          "Cache-Control": cacheControl,
        },
      });
    }

    return NextResponse.json(toPartnerFeedJson(rows), {
      status: 200,
      headers: { "Cache-Control": cacheControl },
    });
  } catch (err) {
    console.error("Partner feed error:", err);
    return NextResponse.json({ error: "Feed error" }, { status: 500 });
  }
}

function parseCategories(params: URLSearchParams): string[] {
  const raw = params.getAll("category").flatMap((v) => v.split(","));
  const cleaned = raw.map((v) => v.trim().toLowerCase()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [...DEFAULT_PARTNER_FEED_CATEGORIES];
}
