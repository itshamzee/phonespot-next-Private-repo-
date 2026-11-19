import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { fiksReply, loadVisibleMessages, validateMessage } from "@/lib/fiks/chat";
import { HONEYPOT_TEXT, MAX_MESSAGE_CHARS, isFiksDisabled } from "@/lib/fiks/config";

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

  try {
    const out = await fiksReply({
      supabase: createServerClient(),
      sessionToken: typeof body.token === "string" ? body.token : null,
      message,
    });
    return json({
      token: out.sessionToken,
      reply: out.reply,
      handoff: out.handoff,
      ...(out.limited ? { limited: out.limited } : {}),
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
    const messages = await loadVisibleMessages(createServerClient(), token);
    return json({ messages });
  } catch (err) {
    console.error("[fiks] history load failed", err instanceof Error ? err.message : err);
    return json({ messages: [] });
  }
}
