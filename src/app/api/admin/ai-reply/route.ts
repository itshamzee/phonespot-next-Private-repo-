import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { assessMessage } from "@/lib/mail-agent/agent";
import { displayNameFor } from "@/lib/mail-agent/config";
import { CENTRAL_INBOX } from "@/lib/email/staff-routing";

type ThreadMessage = { sender: "customer" | "staff"; body: string; created_at: string };

/**
 * POST /api/admin/ai-reply — "Generer svar med assistenten" i Henvendelser.
 * Body: { inquiryId } (foretrukket: hele traaden + opslag)
 *   eller { customerName, customerMessage, subject, customerEmail? } (loes tekst).
 * Svar: { reply, assessment, lookups }.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY er ikke konfigureret" }, { status: 500 });
  }
  const sb = createAdminClient();
  const payload = await req.json().catch(() => ({}));

  let senderEmail = "";
  let senderName: string | null = null;
  let mailbox: string = CENTRAL_INBOX;
  let subject = "";
  let thread: ThreadMessage[] = [];
  let latest = "";

  if (payload.inquiryId) {
    const { data: inq } = await sb.from("contact_inquiries").select("*").eq("id", payload.inquiryId).maybeSingle();
    if (!inq) return NextResponse.json({ error: "Henvendelse ikke fundet" }, { status: 404 });
    const { data: msgs } = await sb
      .from("inquiry_messages")
      .select("sender, body, created_at")
      .eq("inquiry_id", inq.id)
      .order("created_at", { ascending: true });
    const all: ThreadMessage[] = [
      { sender: "customer", body: inq.message as string, created_at: inq.created_at as string },
      ...((msgs ?? []) as ThreadMessage[]),
    ];
    senderEmail = inq.email;
    senderName = inq.name;
    mailbox = (inq.mailbox as string | null) ?? mailbox;
    subject = inq.subject ?? "";
    const lastCustomer = [...all].reverse().find((m) => m.sender === "customer");
    latest = lastCustomer?.body ?? (inq.message as string);
    thread = all.filter((m) => m !== lastCustomer);
  } else {
    if (!payload.customerMessage) return NextResponse.json({ error: "Besked mangler" }, { status: 400 });
    senderEmail = payload.customerEmail ?? "";
    senderName = payload.customerName ?? null;
    subject = payload.subject ?? "";
    latest = payload.customerMessage;
  }

  try {
    const out = await assessMessage({
      supabase: sb,
      senderEmail,
      senderName,
      mailbox,
      displayName: displayNameFor(mailbox),
      subject,
      thread,
      latest,
    });
    const reply = out.assessment.draft?.body ?? `(${out.assessment.reason})`;
    return NextResponse.json({ reply, assessment: out.assessment, lookups: out.lookups });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Anthropic afviste API-nøglen" }, { status: 500 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "For mange forespørgsler – prøv igen om lidt" }, { status: 429 });
    }
    console.error("[ai-reply]", err);
    return NextResponse.json({ error: "AI-fejl. Prøv igen." }, { status: 500 });
  }
}
