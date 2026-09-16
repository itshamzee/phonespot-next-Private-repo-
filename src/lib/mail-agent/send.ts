import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { ONECOM, type MailboxConfig } from "./config";
import { appendToSent } from "./imap";

export interface OutgoingReply {
  mailbox: MailboxConfig;
  to: string;
  toName: string | null;
  subject: string;
  text: string;
  html: string;
  inReplyTo: string | null;
  references: string[];
}

/** Pure: the nodemailer options for a reply, with threading headers when we have them. */
export function buildMailOptions(r: OutgoingReply): Mail.Options {
  return {
    from: { name: r.mailbox.displayName, address: r.mailbox.address },
    to: r.toName ? { name: r.toName, address: r.to } : r.to,
    subject: r.subject,
    text: r.text,
    html: r.html,
    ...(r.inReplyTo ? { inReplyTo: r.inReplyTo } : {}),
    ...(r.references.length ? { references: r.references } : {}),
  };
}

/**
 * Sends over one.com SMTP from the mailbox itself, then stores a copy in that
 * mailbox's Sent folder so Thunderbird shows the reply in the thread.
 */
export async function sendViaOnecom(r: OutgoingReply): Promise<{ messageId: string; raw: Buffer }> {
  const transport = nodemailer.createTransport({
    host: ONECOM.smtpHost,
    port: ONECOM.smtpPort,
    secure: false,
    requireTLS: true,
    auth: { user: r.mailbox.address, pass: r.mailbox.password },
  });
  const options = buildMailOptions(r);
  const info = await transport.sendMail(options);

  const composer = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const built = await composer.sendMail({ ...options, messageId: info.messageId });
  const raw = built.message as Buffer;
  try {
    await appendToSent(r.mailbox, raw);
  } catch (err) {
    console.warn("[mail-agent] kunne ikke gemme i Sendt:", (err as Error).message);
  }
  return { messageId: info.messageId, raw };
}
