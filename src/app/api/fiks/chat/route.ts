import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { fiksReply, loadQuoteForToken, loadVisibleMessages, validateMessage } from "@/lib/fiks/chat";
import { sellAction } from "@/lib/fiks/quote-shared";
import { BUSY_TEXT, HONEYPOT_TEXT, IP_WINDOW_MS, MAX_MESSAGE_CHARS, MAX_MESSAGES_PER_IP_PER_WINDOW, isFiksDisabled } from "@/lib/fiks/config";

/**
 * Public chat endpoint for Fiks. Deliberately outside the staff gate in
 * src/middleware.ts (its matcher does not include /api/fiks). No cookies: the
 * session is a server-generated token the widget keeps in sessionStorage.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

const DISABLED_ERROR = "Chatten er lukket lige nu.";
const GENERIC_ERROR = "Chatten kan ikke svare lige nu. Prøv igen om lidt, eller skriv til info@phonespot.dk.";

/** Simpel bremse pr. IP i funktionens hukommelse. Den varige grænse (nye sessioner pr. IP) tælles i databasen. */
const hits = new Map<string, { count: number; reset: number }>();
function tooMany(key: string, now = Date.now()): boolean {
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  const entry = hits.get(key);
  if (!entry || entry.reset <= now) {
    hits.set(key, { count: 1, reset: now + IP_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_MESSAGES_PER_IP_PER_WINDOW;
}

/** IP'en gemmes aldrig i klartekst: kun en saltet hash, der bruges til at tælle. */
function ipHashOf(request: Request): string | null {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (!ip) return null;
  return createHash("sha256").update(`fiks:${process.env.FIKS_IP_SALT ?? "phonespot"}:${ip}`).digest("hex").slice(0, 32);
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  if (isFiksDisabled()) return json({ error: DISABLED_ERROR }, 503);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Beskeden kunne ikke læses. Prøv igen." }, 400);
  }

  // Honeypot: a hidden field people never fill. Answer like normal, store nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ token: crypto.randomUUID(), reply: HONEYPOT_TEXT, handoff: false });
  }

  const message = validateMessage(body.message);
  if (!message) {
    return json({ error: `Skriv en besked på højst ${MAX_MESSAGE_CHARS} tegn.` }, 400);
  }

  const ipHash = ipHashOf(request);
  if (ipHash && tooMany(ipHash)) {
    return json({ token: typeof body.token === "string" ? body.token : null, reply: BUSY_TEXT, handoff: false, limited: "busy" });
  }

  try {
    const out = await fiksReply({
      supabase: createServerClient(),
      ipHash,
      sessionToken: typeof body.token === "string" ? body.token : null,
      message,
    });
    return json({
      token: out.sessionToken,
      reply: out.reply,
      handoff: out.handoff,
      ...(out.limited ? { limited: out.limited } : {}),
      ...(out.quote && out.sessionToken ? { action: sellAction(out.quote, out.sessionToken) } : {}),
    });
  } catch (err) {
    console.error("[fiks] chat turn failed", err instanceof Error ? err.message : err);
    return json({ error: GENERIC_ERROR }, 500);
  }
}

export async function GET(request: Request) {
  if (isFiksDisabled()) return json({ error: DISABLED_ERROR }, 503);
  const token = new URL(request.url).searchParams.get("token");
  try {
    const supabase = createServerClient();
    const messages = await loadVisibleMessages(supabase, token);
    // The button to the sell form survives a reload: it belongs to the latest stored quote.
    const quote = messages.length && token ? await loadQuoteForToken(supabase, token) : null;
    return json({ messages, ...(quote && token ? { action: sellAction(quote, token) } : {}) });
  } catch (err) {
    console.error("[fiks] history load failed", err instanceof Error ? err.message : err);
    return json({ messages: [] });
  }
}
