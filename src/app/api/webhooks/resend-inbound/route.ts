// src/app/api/webhooks/resend-inbound/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

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

  // 5. Match to inquiry
  let inquiryId: string | null = null;

  // Primary: match via In-Reply-To header against mail_log.message_id
  if (inReplyTo) {
    const { data: logEntry } = await supabase
      .from("mail_log")
      .select("inquiry_id")
      .eq("message_id", inReplyTo)
      .single();

    if (logEntry) {
      inquiryId = logEntry.inquiry_id;
    }
  }

  // Fallback: match sender email to most recent active inquiry
  if (!inquiryId && fromEmail) {
    const { data: inquiries } = await supabase
      .from("contact_inquiries")
      .select("id, subject, status")
      .eq("email", fromEmail)
      .in("status", ["ny", "besvaret", "venter_paa_svar"])
      .order("created_at", { ascending: false })
      .limit(5);

    if (inquiries && inquiries.length > 0) {
      // If subject matches, prefer that inquiry
      if (subject && inquiries.length > 1) {
        const subjectMatch = inquiries.find(
          (inq) => inq.subject && subject.toLowerCase().includes(inq.subject.toLowerCase())
        );
        inquiryId = subjectMatch?.id || inquiries[0].id;
      } else {
        inquiryId = inquiries[0].id;
      }
    }
  }

  // No match: create new inquiry
  if (!inquiryId) {
    const { data: newInquiry, error: createErr } = await supabase
      .from("contact_inquiries")
      .insert({
        name: data.from?.[0]?.name || fromEmail,
        email: fromEmail,
        subject: subject || "Email henvendelse",
        message: textBody.slice(0, 5000),
        status: "ny",
        source: "email" as any,
      })
      .select("id")
      .single();

    if (createErr || !newInquiry) {
      return NextResponse.json({ error: "Failed to create inquiry" }, { status: 500 });
    }
    inquiryId = newInquiry.id;
  }

  // 6. Create inquiry_message
  await supabase.from("inquiry_messages").insert({
    inquiry_id: inquiryId,
    sender: "customer",
    channel: "email",
    body: textBody.slice(0, 10000),
    in_reply_to: inReplyTo,
  });

  // 7. Update inquiry status
  const { data: currentInquiry } = await supabase
    .from("contact_inquiries")
    .select("status")
    .eq("id", inquiryId)
    .single();

  if (currentInquiry?.status === "besvaret" || currentInquiry?.status === "lukket") {
    await supabase
      .from("contact_inquiries")
      .update({ status: "venter_paa_svar" })
      .eq("id", inquiryId);
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
