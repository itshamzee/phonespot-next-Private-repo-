import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSms } from "@/lib/gateway-api/client";
import type { sendInquiryReply } from "@/lib/inquiries/send-reply";

export type ReplyChannel = "email" | "sms";

export type ReplyErrorCode = "not_found" | "no_email" | "no_phone" | "send_failed" | "saved_failed";

const MESSAGES: Record<ReplyErrorCode, string> = {
  not_found: "Henvendelsen blev ikke fundet",
  no_email: "Der er ingen mailadresse på henvendelsen",
  no_phone: "Der er intet telefonnummer på henvendelsen",
  send_failed: "Beskeden kunne ikke sendes. Prøv igen.",
  saved_failed: "SMS'en er sendt, men kunne ikke gemmes i tråden. Send den ikke igen.",
};

export class ReplyError extends Error {
  code: ReplyErrorCode;
  constructor(code: ReplyErrorCode) {
    super(MESSAGES[code]);
    this.name = "ReplyError";
    this.code = code;
  }
}

export interface ReplyArgs {
  inquiryId: string;
  body: string;
  staffName: string;
  channel: ReplyChannel;
  subjectOverride?: string;
}

export interface ReplyDeps {
  sendSms?: typeof sendSms;
  sendEmail?: typeof sendInquiryReply;
}

/** Lazy import: send-reply pulls in Resend/React Email, which tests and SMS-only calls should not load. */
const defaultSendEmail: typeof sendInquiryReply = async (sb, args) => {
  const { sendInquiryReply: impl } = await import("@/lib/inquiries/send-reply");
  return impl(sb, args);
};

/**
 * Sends a staff reply on an inquiry over the chosen channel.
 *
 * Nothing is written to the thread until the message has actually been sent,
 * so a failed send never leaves a phantom reply or flips the status.
 */
export async function sendReply(
  sb: SupabaseClient,
  args: ReplyArgs,
  deps: ReplyDeps = {},
): Promise<{ messageRowId: string; channel: ReplyChannel }> {
  if (args.channel === "email") {
    const sendEmail = deps.sendEmail ?? defaultSendEmail;
    try {
      const result = await sendEmail(sb, {
        inquiryId: args.inquiryId,
        body: args.body,
        staffName: args.staffName,
        ...(args.subjectOverride !== undefined ? { subjectOverride: args.subjectOverride } : {}),
      });
      return { messageRowId: result.messageRowId, channel: "email" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[sendReply] email failed for inquiry ${args.inquiryId}:`, err);
      const code: ReplyErrorCode = msg.includes("ikke fundet")
        ? "not_found"
        : msg.includes("Ingen email")
          ? "no_email"
          : "send_failed";
      throw new ReplyError(code);
    }
  }

  const send = deps.sendSms ?? sendSms;

  const { data: inquiry, error } = await sb
    .from("contact_inquiries")
    .select("*")
    .eq("id", args.inquiryId)
    .single();
  if (error || !inquiry) throw new ReplyError("not_found");
  if (!inquiry.phone) throw new ReplyError("no_phone");

  let result: Awaited<ReturnType<typeof sendSms>>;
  try {
    result = await send(inquiry.phone, args.body);
  } catch (err) {
    result = { success: false, messageId: null, error: err instanceof Error ? err.message : String(err) };
  }

  const { error: logErr } = await sb.from("sms_log").insert({
    phone: inquiry.phone,
    message: args.body,
    provider_message_id: result.messageId,
    status: result.success ? "sent" : "failed",
    inquiry_id: args.inquiryId,
  });
  if (logErr) console.error(`[sendReply] sms_log insert failed for inquiry ${args.inquiryId}:`, logErr);

  if (!result.success) {
    console.error(`[sendReply] sms failed for inquiry ${args.inquiryId}:`, result.error);
    throw new ReplyError("send_failed");
  }

  const { data: message, error: msgErr } = await sb
    .from("inquiry_messages")
    .insert({
      inquiry_id: args.inquiryId,
      sender: "staff",
      channel: "sms",
      body: args.body,
      staff_name: args.staffName,
    })
    .select()
    .single();

  // The customer has the SMS either way, so the inquiry counts as answered.
  const { error: statusErr } = await sb.from("contact_inquiries").update({ status: "besvaret" }).eq("id", args.inquiryId);
  if (statusErr) console.error(`[sendReply] status update failed for inquiry ${args.inquiryId}:`, statusErr);

  if (msgErr || !message) {
    console.error(`[sendReply] sms sent but thread insert failed for inquiry ${args.inquiryId}:`, msgErr);
    throw new ReplyError("saved_failed");
  }
  return { messageRowId: message.id as string, channel: "sms" };
}
