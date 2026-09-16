// src/app/api/webhooks/resend-inbound/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { ingestInboundEmail } from "@/lib/mail-agent/ingest";
import { assessAndDraft } from "@/lib/mail-agent/run";
import { CENTRAL_INBOX } from "@/lib/email/staff-routing";

// Simple rate limiting in-memory (per-process, good enough for single instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 3600_000 }); // 1 hour window
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(req: Request) {
  const supabase = createServerClient();

  // 1. Verify webhook signature (Svix) — skip if secret not configured yet
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const rawBody = await req.text();

  if (webhookSecret) {
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing webhook headers" }, { status: 401 });
    }

    const { Webhook } = await import("svix");
    const wh = new Webhook(webhookSecret);
    try {
      wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("[resend-inbound] RESEND_WEBHOOK_SECRET not set — skipping verification");
  }

  const parsedBody = JSON.parse(rawBody);
  const { type, data } = parsedBody;

  // Only handle email.received events
  if (type !== "email.received") {
    return NextResponse.json({ ok: true });
  }

  const fromEmail = data.from?.[0]?.address || data.from;
  const subject = data.subject || "";
  const textBody = data.text || data.html || "";
  const inReplyTo = data.headers?.["in-reply-to"] || data.in_reply_to || null;
  const eventId = data.id || parsedBody.id;

  // 2. Idempotency check
  if (eventId) {
    const { data: existing } = await supabase
      .from("mail_log")
      .select("id")
      .eq("resend_event_id", eventId)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  // 3. Rate limit
  if (fromEmail && !checkRateLimit(fromEmail)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  // 4. Body size check (500KB)
  if (textBody.length > 500_000) {
    return NextResponse.json({ error: "Body too large" }, { status: 413 });
  }

  // 5-7. Match or create the inquiry thread and store the message (shared with the IMAP poller).
  let inquiryId: string;
  let inquiryMessageId: string;
  try {
    const result = await ingestInboundEmail(supabase, {
      fromEmail,
      fromName: data.from?.[0]?.name ?? null,
      subject,
      text: textBody,
      inReplyTo,
      messageId: data.headers?.["message-id"] ?? null,
      mailbox: null,
    });
    inquiryId = result.inquiryId;
    inquiryMessageId = result.inquiryMessageId;
  } catch (err) {
    console.error("[resend-inbound] ingest failed", err);
    return NextResponse.json({ error: "Failed to create inquiry" }, { status: 500 });
  }

  // 7b. Let the mail agent classify and draft; never block the webhook on it.
  try {
    await assessAndDraft(supabase, {
      inquiryId,
      inquiryMessageId,
      senderEmail: fromEmail,
      senderName: data.from?.[0]?.name ?? null,
      mailbox: CENTRAL_INBOX,
      subject,
    });
  } catch (err) {
    console.error("[resend-inbound] agent failed", err);
  }

  // 8. Log to mail_log (for idempotency)
  await supabase.from("mail_log").insert({
    inquiry_id: inquiryId,
    to_email: "support@reply.phonespot.dk",
    subject: subject || "(inbound)",
    body: textBody.slice(0, 5000),
    status: "delivered",
    resend_event_id: eventId,
  });

  return NextResponse.json({ ok: true, inquiry_id: inquiryId });
}
