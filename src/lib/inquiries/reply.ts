import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSms } from "@/lib/gateway-api/client";
import type { sendInquiryReply } from "@/lib/inquiries/send-reply";

export type ReplyChannel = "email" | "sms";

export type ReplyErrorCode = "not_found" | "no_email" | "no_phone" | "send_failed";

export class ReplyError extends Error {
  code: ReplyErrorCode;
  constructor(code: ReplyErrorCode, message: string) {
    super(message);
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
      const msg = err instanceof Error ? err.message : "Kunne ikke sende mailen";
      const code: ReplyErrorCode = msg.includes("ikke fundet")
        ? "not_found"
        : msg.includes("Ingen email")
          ? "no_email"
          : "send_failed";
      throw new ReplyError(code, msg);
    }
  }

  const send = deps.sendSms ?? sendSms;

  const { data: inquiry, error } = await sb
    .from("contact_inquiries")
    .select("*")
    .eq("id", args.inquiryId)
    .single();
  if (error || !inquiry) throw new ReplyError("not_found", "Henvendelse ikke fundet");
  if (!inquiry.phone) throw new ReplyError("no_phone", "Ingen telefonnummer på henvendelsen");

  const result = await send(inquiry.phone, args.body);

  await sb.from("sms_log").insert({
    phone: inquiry.phone,
    message: args.body,
    provider_message_id: result.messageId,
    status: result.success ? "sent" : "failed",
    inquiry_id: args.inquiryId,
  });

  if (!result.success) {
    throw new ReplyError("send_failed", result.error || "SMS kunne ikke sendes");
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
  if (msgErr || !message) throw new ReplyError("send_failed", msgErr?.message ?? "Kunne ikke gemme beskeden");

  await sb.from("contact_inquiries").update({ status: "besvaret" }).eq("id", args.inquiryId);
  return { messageRowId: message.id as string, channel: "sms" };
}
