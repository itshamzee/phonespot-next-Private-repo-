import type { SupabaseClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import InquiryReplyEmail, { greetingName } from "@/lib/email/templates/inquiry-reply";
import { resend } from "@/lib/email/resend";
import { resolveSignature, signatureText } from "@/lib/email/signature";
import { loadMailboxes } from "@/lib/mail-agent/config";
import { sendViaOnecom } from "@/lib/mail-agent/send";

export interface SendReplyArgs {
  inquiryId: string;
  body: string;
  staffName: string;
  subjectOverride?: string;
}

export interface SendReplyResult {
  messageRowId: string;
  transport: "onecom" | "resend";
  messageId: string | null;
}

/**
 * Sends a staff email reply on an inquiry and records it in the thread.
 *
 * Threads that arrived in one of our one.com mailboxes (`contact_inquiries.mailbox`)
 * are answered from that mailbox over SMTP with In-Reply-To/References so the
 * customer's client and Thunderbird keep the conversation together. Everything
 * else (contact form, Resend inbound) keeps the existing Resend path.
 *
 * The staff message row is written only after a successful send, so a failed
 * send never leaves a phantom reply in the thread.
 */
export async function sendInquiryReply(sb: SupabaseClient, args: SendReplyArgs): Promise<SendReplyResult> {
  const { data: inquiry, error } = await sb.from("contact_inquiries").select("*").eq("id", args.inquiryId).single();
  if (error || !inquiry) throw new Error("Henvendelse ikke fundet");
  if (!inquiry.email) throw new Error("Ingen email på henvendelsen");

  const mailboxAddress = typeof inquiry.mailbox === "string" ? inquiry.mailbox.toLowerCase() : null;
  const signature = await resolveSignature(sb, mailboxAddress);

  const subject = args.subjectOverride ?? `Re: ${inquiry.subject || "Din henvendelse"}`;
  const html = await render(
    InquiryReplyEmail({ customerName: inquiry.name, replyBody: args.body, signature }),
  );
  const first = greetingName(inquiry.name);
  const text = `${first ? `Hej ${first},` : "Hej,"}\n\n${args.body.trim()}\n\n${signatureText(signature)}`;

  const box = mailboxAddress ? loadMailboxes().find((b) => b.address === mailboxAddress) : undefined;

  let transport: SendReplyResult["transport"] = "resend";
  let messageId: string | null = null;

  if (box) {
    const { data: last } = await sb
      .from("inquiry_messages")
      .select("message_id, in_reply_to")
      .eq("inquiry_id", args.inquiryId)
      .eq("sender", "customer")
      .not("message_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const inReplyTo = (last?.message_id as string | null) ?? null;
    const references = [last?.in_reply_to, last?.message_id].filter((x): x is string => Boolean(x));

    const sent = await sendViaOnecom({
      mailbox: box,
      to: inquiry.email,
      toName: inquiry.name,
      subject,
      text,
      html,
      inReplyTo,
      references,
    });
    transport = "onecom";
    messageId = sent.messageId;
    await sb.from("mail_log").insert({
      inquiry_id: args.inquiryId,
      to_email: inquiry.email,
      subject,
      body: args.body,
      status: "delivered",
      message_id: messageId,
    });
  } else {
    try {
      const result = await resend.emails.send({
        from: "PhoneSpot <info@phonespot.dk>",
        to: inquiry.email,
        replyTo: "support@reply.phonespot.dk",
        subject,
        html,
      });
      messageId = `<${result.data?.id}@reply.phonespot.dk>`;
      await sb.from("mail_log").insert({
        inquiry_id: args.inquiryId,
        to_email: inquiry.email,
        subject,
        body: args.body,
        status: "delivered",
        resend_id: result.data?.id ?? null,
        message_id: messageId,
      });
      if (!inquiry.email_thread_id) {
        await sb.from("contact_inquiries").update({ email_thread_id: crypto.randomUUID() }).eq("id", args.inquiryId);
      }
    } catch {
      await sb.from("mail_log").insert({
        inquiry_id: args.inquiryId,
        to_email: inquiry.email,
        subject,
        body: args.body,
        status: "failed",
        resend_id: null,
      });
      throw new Error("Resend kunne ikke sende mailen");
    }
  }

  const { data: message, error: msgErr } = await sb
    .from("inquiry_messages")
    .insert({
      inquiry_id: args.inquiryId,
      sender: "staff",
      channel: "email",
      body: args.body,
      staff_name: args.staffName,
      message_id: messageId,
    })
    .select()
    .single();
  if (msgErr || !message) throw new Error(msgErr?.message ?? "Kunne ikke gemme beskeden");

  await sb.from("contact_inquiries").update({ status: "besvaret" }).eq("id", args.inquiryId);
  return { messageRowId: message.id as string, transport, messageId };
}
