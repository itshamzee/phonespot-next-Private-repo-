import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Files one inbound email into the inquiry model (contact_inquiries +
 * inquiry_messages). Shared by the Resend inbound webhook and the IMAP poller
 * so both channels match threads the same way.
 */
export interface IngestInput {
  fromEmail: string;
  fromName: string | null;
  subject: string;
  text: string;
  inReplyTo: string | null;
  messageId: string | null;
  /** Our address the mail arrived at; null for Resend/contact-form threads. */
  mailbox: string | null;
  storeId?: string | null;
}

export interface IngestResult {
  inquiryId: string;
  inquiryMessageId: string;
  created: boolean;
  reopened: boolean;
}

const OPEN_STATUSES = ["ny", "besvaret", "venter_paa_svar"];

async function matchByReplyHeader(supabase: SupabaseClient, inReplyTo: string): Promise<string | null> {
  const { data: log } = await supabase
    .from("mail_log")
    .select("inquiry_id")
    .eq("message_id", inReplyTo)
    .maybeSingle();
  if (log?.inquiry_id) return log.inquiry_id as string;

  const { data: msg } = await supabase
    .from("inquiry_messages")
    .select("inquiry_id")
    .eq("message_id", inReplyTo)
    .maybeSingle();
  return (msg?.inquiry_id as string | undefined) ?? null;
}

function stripReplyPrefixes(subject: string): string {
  return subject
    .toLowerCase()
    .replace(/^(\s*(re|sv|vs|fwd?|aw|wg)\s*:\s*)+/i, "")
    .trim();
}

const CLOSED_WINDOW_MS = 30 * 86_400_000;

/** Escape LIKE wildcards so ilike() is an exact, case-insensitive match. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

interface SenderMatch {
  id: string;
  /** True when a closed thread was picked up again by the sender. */
  reopenedClosed: boolean;
}

function pickBySubject<T extends { subject: string | null }>(rows: T[], subject: string, fallbackToNewest: boolean): T | null {
  if (rows.length === 0) return null;
  const normalized = stripReplyPrefixes(subject);
  const bySubject = normalized
    ? rows.find((r) => r.subject && normalized.includes(stripReplyPrefixes(r.subject)))
    : undefined;
  return bySubject ?? (fallbackToNewest ? rows[0] : null);
}

async function matchBySender(
  supabase: SupabaseClient,
  email: string,
  subject: string,
  now: Date,
): Promise<SenderMatch | null> {
  const pattern = escapeLike(email);

  const { data } = await supabase
    .from("contact_inquiries")
    .select("id, subject, status")
    .ilike("email", pattern)
    .in("status", OPEN_STATUSES)
    .order("created_at", { ascending: false })
    .limit(5);
  const open = pickBySubject((data ?? []) as { id: string; subject: string | null }[], subject, true);
  if (open) return { id: open.id, reopenedClosed: false };

  // No open thread: pick up a recently closed one, but only on a subject match.
  const since = new Date(now.getTime() - CLOSED_WINDOW_MS).toISOString();
  const { data: closedData } = await supabase
    .from("contact_inquiries")
    .select("id, subject, status")
    .ilike("email", pattern)
    .eq("status", "lukket")
    .gte("last_inbound_at", since)
    .order("created_at", { ascending: false })
    .limit(5);
  const closed = pickBySubject((closedData ?? []) as { id: string; subject: string | null }[], subject, false);
  return closed ? { id: closed.id, reopenedClosed: true } : null;
}

export async function ingestInboundEmail(
  supabase: SupabaseClient,
  input: IngestInput,
  now: Date = new Date(),
): Promise<IngestResult> {
  const email = input.fromEmail.toLowerCase();
  let inquiryId: string | null = null;
  let created = false;
  let reopened = false;
  let reopenedClosed = false;
  const nowIso = now.toISOString();

  if (input.inReplyTo) inquiryId = await matchByReplyHeader(supabase, input.inReplyTo);
  if (!inquiryId) {
    const match = await matchBySender(supabase, email, input.subject, now);
    if (match) {
      inquiryId = match.id;
      reopenedClosed = match.reopenedClosed;
    }
  }

  if (!inquiryId) {
    const { data, error } = await supabase
      .from("contact_inquiries")
      .insert({
        name: input.fromName || email,
        email,
        subject: input.subject || "Email henvendelse",
        message: input.text.slice(0, 5000),
        status: "ny",
        source: "email",
        channel: "email",
        last_inbound_at: nowIso,
        mailbox: input.mailbox,
        store_id: input.storeId ?? null,
      })
      .select()
      .single();
    if (error || !data) {
      throw new Error(`Kunne ikke oprette henvendelse: ${error?.message ?? "ukendt fejl"}`);
    }
    inquiryId = data.id as string;
    created = true;
  }

  const { data: msg, error: msgErr } = await supabase
    .from("inquiry_messages")
    .insert({
      inquiry_id: inquiryId,
      sender: "customer",
      channel: "email",
      body: input.text.slice(0, 10000),
      message_id: input.messageId,
      in_reply_to: input.inReplyTo,
    })
    .select()
    .single();
  if (msgErr || !msg) {
    throw new Error(`Kunne ikke gemme besked: ${msgErr?.message ?? "ukendt fejl"}`);
  }

  if (!created) {
    const patch: Record<string, unknown> = { last_inbound_at: nowIso, channel: "email" };
    if (reopenedClosed) {
      patch.status = "ny";
      reopened = true;
    } else {
      const { data: current } = await supabase
        .from("contact_inquiries")
        .select("status")
        .eq("id", inquiryId)
        .maybeSingle();
      if (current?.status === "besvaret" || current?.status === "lukket") {
        patch.status = "venter_paa_svar";
        reopened = true;
      }
    }
    await supabase.from("contact_inquiries").update(patch).eq("id", inquiryId);
  }

  return { inquiryId, inquiryMessageId: msg.id as string, created, reopened };
}
