import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { loadQuoteForToken } from "@/lib/fiks/chat";
import { toPublicQuote } from "@/lib/fiks/quote";

/**
 * Public: the buyback quote Fiks gave in a chat, for prefilling the sell form.
 * The amount comes from the chat inquiry's stored tool result, so a visitor
 * cannot change the price by editing the link. Only model, storage, the
 * condition answers and the amount go out; nothing about the person.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  try {
    const quote = await loadQuoteForToken(createServerClient(), token);
    if (!quote) return NextResponse.json({ error: "Ikke fundet" }, { status: 404, headers: NO_STORE });
    return NextResponse.json(toPublicQuote(quote), { headers: NO_STORE });
  } catch (err) {
    console.error("[fiks] quote load failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404, headers: NO_STORE });
  }
}
