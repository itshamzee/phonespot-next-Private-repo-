import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { loadMailboxes, ONECOM, type MailboxConfig } from "@/lib/mail-agent/config";
import { CENTRAL_INBOX } from "@/lib/email/staff-routing";

/**
 * Intern personalemail over one.com-SMTP — samme postkasser og env som
 * mail-agenten. Resend bruges ikke: ordre@ og info@ er blokeret dér (2026-04-17).
 */
export interface StaffMailDeps {
  mailboxes: () => MailboxConfig[];
  transport: (box: MailboxConfig) => { sendMail(options: Mail.Options): Promise<unknown> };
}

const defaultDeps: StaffMailDeps = {
  mailboxes: () => loadMailboxes(),
  transport: (box) =>
    nodemailer.createTransport({
      host: ONECOM.smtpHost,
      port: ONECOM.smtpPort,
      secure: false,
      requireTLS: true,
      auth: { user: box.address, pass: box.password },
    }),
};

export function pickSenderMailbox(boxes: MailboxConfig[], to: string): MailboxConfig | null {
  const target = to.trim().toLowerCase();
  return boxes.find((b) => b.address === target) ?? boxes.find((b) => b.address === CENTRAL_INBOX) ?? boxes[0] ?? null;
}

export async function sendStaffMail(
  msg: { to: string; bcc?: string[]; subject: string; text: string },
  deps: StaffMailDeps = defaultDeps,
): Promise<void> {
  const box = pickSenderMailbox(deps.mailboxes(), msg.to);
  if (!box) throw new Error("Ingen one.com-postkasse er sat op (MAIL_AGENT_MAILBOXES + ONECOM_MAIL_PASSWORD_*)");
  await deps.transport(box).sendMail({
    from: { name: box.displayName, address: box.address },
    to: msg.to,
    ...(msg.bcc?.length ? { bcc: msg.bcc } : {}),
    subject: msg.subject,
    text: msg.text,
  });
}
