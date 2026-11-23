import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ONECOM, loadMailboxes, type MailboxConfig } from "./config";
import { isContactNotice, type InboxEntry } from "./folders";
import { folderPath } from "./folders";
import { listInbox, listSentSince, markSeen, moveToFolder } from "./imap";
import { CATEGORY_LABELS, type MailCategory } from "./types";

/**
 * Morgenoverblikket: én mail til ejeren med hvad der kom ind og gik ud i går,
 * og en nummereret liste over dem, der venter på svar, med agentens udkast.
 * Ejeren besvarer mailen ("1 ok, 3: skriv at vi ringer, 5 luk"), og
 * digest-reply.ts udfører det.
 */

export const DIGEST_SUBJECT_PREFIX = "Mailoverblik";

/** One numbered point in a digest. Stored in mail_digests.items; the reply refers to `n`. */
export interface DigestItem {
  n: number;
  mailbox: string;
  email: string;
  name: string | null;
  /** INBOX uids and Message-IDs of the waiting mails, for filing once handled. */
  uids: number[];
  messageIds: string[];
  subject: string;
  waitingSince: string;
  category: MailCategory | null;
  summary: string | null;
  inquiryId: string | null;
  draftId: string | null;
  draftBody: string | null;
  /** Our own contact-form notice (answered through the inquiry, filed as a notification). */
  contactNotice: boolean;
}

export interface DigestActivity {
  inbound: { mailbox: string; count: number }[];
  sent: { mailbox: string; count: number }[];
}

export function digestRecipient(env: NodeJS.ProcessEnv = process.env): string {
  return (env.MAIL_DIGEST_TO ?? "ha@phonespot.dk").trim().toLowerCase();
}

/** The mailbox digests are sent from. Replies land here, so it must be one the agent polls. */
export function digestSender(boxes: MailboxConfig[], recipient: string): MailboxConfig | null {
  return boxes.find((b) => b.address === "info@phonespot.dk") ?? boxes.find((b) => b.address !== recipient) ?? null;
}

/** A digest (or a receipt) from the agent itself: stays unread in the owner's inbox instead of being filed as a notification. */
export function isDigestMail(mail: { fromEmail: string; subject: string }): boolean {
  return mail.fromEmail.toLowerCase().endsWith("@phonespot.dk") && (mail.subject ?? "").startsWith(DIGEST_SUBJECT_PREFIX);
}

/** A mail from the owner that answers something: candidate for a digest reply. The digest lookup decides. */
export function isDigestReply(mail: { fromEmail: string; inReplyTo: string | null; references: string[] }, recipient: string): boolean {
  return mail.fromEmail.toLowerCase() === recipient.toLowerCase() && Boolean(mail.inReplyTo || mail.references.length);
}

export function waitingDays(sinceIso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(sinceIso).getTime()) / (24 * 3600 * 1000)));
}

/**
 * Groups unread INBOX mail into one point per person, oldest wait first.
 * Digests themselves and mail from our own addresses are left out.
 */
export function groupWaiting(mailbox: string, entries: InboxEntry[]): Omit<DigestItem, "n" | "name" | "category" | "summary" | "inquiryId" | "draftId" | "draftBody">[] {
  const groups = new Map<string, InboxEntry[]>();
  for (const e of entries) {
    if (e.seen) continue;
    if (isDigestMail(e)) continue;
    const notice = isContactNotice(e);
    if (!notice && e.fromEmail.endsWith("@phonespot.dk")) continue;
    if (!e.counterpart) continue;
    groups.set(e.counterpart, [...(groups.get(e.counterpart) ?? []), e]);
  }
  return [...groups.entries()].map(([email, list]) => {
    list.sort((a, b) => a.date.getTime() - b.date.getTime());
    const latest = list[list.length - 1];
    return {
      mailbox,
      email,
      uids: list.map((e) => e.uid),
      messageIds: list.map((e) => e.messageId).filter(Boolean),
      subject: latest.subject,
      waitingSince: list[0].date.toISOString(),
      contactNotice: list.every((e) => isContactNotice(e)),
    };
  });
}

/** Unread INBOX mail across all mailboxes, joined with the agent's newest pending draft per person. */
export async function collectWaiting(sb: SupabaseClient, boxes: MailboxConfig[]): Promise<DigestItem[]> {
  const raw: ReturnType<typeof groupWaiting> = [];
  for (const box of boxes) raw.push(...groupWaiting(box.address, await listInbox(box)));
  if (!raw.length) return [];

  const messageIds = raw.flatMap((r) => r.messageIds);
  const { data: inbound } = messageIds.length
    ? await sb.from("mail_inbound").select("message_id, inquiry_id, classification").in("message_id", messageIds)
    : { data: [] };
  type Inbound = { message_id: string; inquiry_id: string | null; classification: string | null };
  const byMessage = new Map(((inbound ?? []) as Inbound[]).map((r) => [r.message_id, r]));

  // Contact-form notices are not ingested; their inquiry is the newest one on the customer's address.
  const noticeEmails = raw.filter((r) => r.contactNotice).map((r) => r.email);
  const { data: formInquiries } = noticeEmails.length
    ? await sb.from("contact_inquiries").select("id, email, created_at").in("email", noticeEmails).order("created_at", { ascending: false })
    : { data: [] };
  const formInquiry = new Map<string, string>();
  for (const i of (formInquiries ?? []) as { id: string; email: string | null }[]) {
    const key = (i.email ?? "").toLowerCase();
    if (key && !formInquiry.has(key)) formInquiry.set(key, i.id);
  }

  const resolved = raw.map((r) => {
    const known = r.messageIds.map((id) => byMessage.get(id)).filter((x): x is Inbound => Boolean(x));
    const inquiryId = known.map((k) => k.inquiry_id).filter(Boolean).pop() ?? formInquiry.get(r.email) ?? null;
    const category = (known.map((k) => k.classification).filter(Boolean).pop() ?? null) as MailCategory | null;
    return { ...r, inquiryId, category };
  });

  const inquiryIds = [...new Set(resolved.map((r) => r.inquiryId).filter((x): x is string => Boolean(x)))];
  const [{ data: drafts }, { data: inquiries }] = await Promise.all([
    inquiryIds.length
      ? sb.from("ai_drafts").select("id, inquiry_id, summary, draft_body, category, created_at").in("inquiry_id", inquiryIds).eq("status", "pending").order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    inquiryIds.length ? sb.from("contact_inquiries").select("id, name").in("id", inquiryIds) : Promise.resolve({ data: [] }),
  ]);
  type Draft = { id: string; inquiry_id: string; summary: string | null; draft_body: string | null; category: MailCategory | null };
  const newestDraft = new Map<string, Draft>();
  for (const d of (drafts ?? []) as Draft[]) newestDraft.set(d.inquiry_id, d);
  const names = new Map(((inquiries ?? []) as { id: string; name: string | null }[]).map((i) => [i.id, i.name]));

  return resolved
    .sort((a, b) => a.waitingSince.localeCompare(b.waitingSince))
    .map((r, i) => {
      const draft = r.inquiryId ? newestDraft.get(r.inquiryId) : undefined;
      return {
        ...r,
        n: i + 1,
        name: r.inquiryId ? (names.get(r.inquiryId) ?? null) : null,
        category: r.category ?? draft?.category ?? null,
        summary: draft?.summary ?? null,
        draftId: draft?.draft_body ? draft.id : null,
        draftBody: draft?.draft_body ?? null,
      };
    });
}

/** What came in (agent log) and went out (Sent folders) since `since`. */
export async function collectActivity(sb: SupabaseClient, boxes: MailboxConfig[], since: Date): Promise<DigestActivity> {
  const { data } = await sb
    .from("mail_inbound")
    .select("mailbox, classification")
    .gte("received_at", since.toISOString())
    .not("classification", "in", "(nyhedsbrev_spam,system_notifikation)")
    .limit(2000);
  const inbound = boxes.map((b) => ({ mailbox: b.address, count: ((data ?? []) as { mailbox: string }[]).filter((r) => r.mailbox === b.address).length }));
  const sent: DigestActivity["sent"] = [];
  for (const box of boxes) {
    const list = await listSentSince(box, since).catch(() => []);
    sent.push({ mailbox: box.address, count: list.filter((m) => !m.subject.startsWith(DIGEST_SUBJECT_PREFIX)).length });
  }
  return { inbound, sent };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const local = (address: string) => `${address.split("@")[0]}@`;

function perBox(list: { mailbox: string; count: number }[]): string {
  const total = list.reduce((a, b) => a + b.count, 0);
  const parts = list.filter((b) => b.count > 0).map((b) => `${local(b.mailbox)} ${b.count}`);
  return parts.length > 1 ? `${total} (${parts.join(", ")})` : String(total);
}

export const REPLY_HELP =
  'Besvar denne mail for at sende. Fx: "1 ok, 2 ok, 4: skriv at vi ringer i morgen, 6 luk". ' +
  '"ok" sender udkastet, som det står. Skriver du en besked efter nummeret, laver jeg et nyt udkast og sender det til dig til godkendelse. ' +
  '"luk" lægger mailen væk uden svar. "alle ok" sender alle udkast. Punkter, du ikke nævner, bliver stående til i morgen.';

function itemHeading(item: DigestItem, now: number): string {
  const days = waitingDays(item.waitingSince, now);
  const who = item.name ? `${item.name} <${item.email}>` : item.email;
  const wait = days === 0 ? "i dag" : days === 1 ? "ventet 1 dag" : `ventet ${days} dage`;
  const label = item.contactNotice ? "Kontaktformular" : item.category ? CATEGORY_LABELS[item.category] : null;
  return [who, local(item.mailbox), wait, label].filter(Boolean).join(" · ");
}

/** Pure: subject, plain text and HTML for the morning digest. */
export function buildDigest(items: DigestItem[], activity: DigestActivity, now: Date): { subject: string; text: string; html: string } {
  const date = new Intl.DateTimeFormat("da-DK", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Copenhagen" }).format(now);
  const subject = `${DIGEST_SUBJECT_PREFIX} ${date}: ${items.length === 0 ? "ingen venter på svar" : items.length === 1 ? "1 venter på svar" : `${items.length} venter på svar`}`;
  const yesterday = `Seneste døgn: ${perBox(activity.inbound)} henvendelser ind, ${perBox(activity.sent)} mails ud.`;

  const text: string[] = ["Godmorgen.", "", yesterday, ""];
  const html: string[] = [
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222;max-width:680px">`,
    `<p>Godmorgen.</p><p>${esc(yesterday)}</p>`,
  ];
  if (items.length === 0) {
    text.push("Ingen venter på svar. Indbakkerne er tomme for ulæste kundemails.");
    html.push("<p>Ingen venter på svar. Indbakkerne er tomme for ulæste kundemails.</p>");
  } else {
    text.push(REPLY_HELP, "");
    html.push(`<p style="background:#F4F1EA;border-radius:8px;padding:12px 14px">${esc(REPLY_HELP)}</p>`);
    for (const item of items) {
      const heading = itemHeading(item, now.getTime());
      const what = item.summary ?? item.subject ?? "(intet emne)";
      text.push(`${item.n}. ${heading}`, `   ${what}`);
      html.push(`<div style="border-top:1px solid #E5E0D5;padding:14px 0"><p style="margin:0"><strong>${item.n}.</strong> ${esc(heading)}</p><p style="margin:4px 0 0">${esc(what)}</p>`);
      if (item.draftBody) {
        text.push("   Udkast:", ...item.draftBody.trim().split("\n").map((l) => `   | ${l}`));
        html.push(`<p style="margin:10px 0 4px;color:#666;font-size:13px">Udkast</p><div style="border-left:3px solid #1A3D2E;padding:2px 0 2px 12px;white-space:pre-wrap">${esc(item.draftBody.trim())}</div>`);
      } else {
        const hint = item.inquiryId ? "Intet udkast. Skriv efter nummeret, hvad jeg skal svare, eller svar selv i Thunderbird." : "Intet udkast. Svar selv i Thunderbird, eller skriv \"luk\".";
        text.push(`   ${hint}`);
        html.push(`<p style="margin:8px 0 0;color:#666;font-size:13px">${esc(hint)}</p>`);
      }
      text.push("");
      html.push("</div>");
    }
  }
  html.push("</div>");
  return { subject, text: text.join("\n"), html: html.join("") };
}

/** Sends a mail from the agent to the owner with a Message-ID that only the recipient learns. */
export async function sendFromAgent(
  from: MailboxConfig,
  to: string,
  mail: { subject: string; text: string; html: string; inReplyTo?: string | null; references?: string[] },
): Promise<string> {
  const messageId = `<overblik-${randomUUID()}@phonespot.dk>`;
  const transport = nodemailer.createTransport({
    host: ONECOM.smtpHost,
    port: ONECOM.smtpPort,
    secure: false,
    requireTLS: true,
    auth: { user: from.address, pass: from.password },
  });
  await transport.sendMail({
    from: { name: "PhoneSpot mailoverblik", address: from.address },
    to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    messageId,
    ...(mail.inReplyTo ? { inReplyTo: mail.inReplyTo } : {}),
    ...(mail.references?.length ? { references: mail.references } : {}),
  });
  return messageId;
}

export interface DigestResult {
  sent: boolean;
  items: number;
  recipient: string;
  reason?: string;
}

/** Builds and sends today's digest. `dryRun` returns the mail without sending or storing it. */
export async function sendMorningDigest(
  sb: SupabaseClient,
  opts: { dryRun?: boolean; now?: Date } = {},
): Promise<DigestResult & { preview?: { subject: string; text: string } }> {
  const now = opts.now ?? new Date();
  const boxes = loadMailboxes();
  const recipient = digestRecipient();
  const from = digestSender(boxes, recipient);
  if (!from) return { sent: false, items: 0, recipient, reason: "Ingen postkasse at sende fra" };

  const items = await collectWaiting(sb, boxes);
  const activity = await collectActivity(sb, boxes, new Date(now.getTime() - 24 * 3600 * 1000));
  const mail = buildDigest(items, activity, now);
  if (opts.dryRun) return { sent: false, items: items.length, recipient, preview: { subject: mail.subject, text: mail.text } };

  // Yesterday's overview is superseded: file it so only the newest one stands unread.
  const own = boxes.find((b) => b.address === recipient);
  if (own) {
    try {
      const old = (await listInbox(own)).filter((e) => isDigestMail(e)).map((e) => e.uid);
      if (old.length) {
        await markSeen(own, old);
        await moveToFolder(own, old, folderPath("notifikationer_andet"));
      }
    } catch (err) {
      console.warn("[mail-digest] kunne ikke rydde gamle overblik:", (err as Error).message);
    }
  }

  const messageId = await sendFromAgent(from, recipient, mail);
  const { error } = await sb.from("mail_digests").insert({ message_id: messageId, kind: "morning", recipient, sent_from: from.address, items });
  if (error) throw new Error(`mail_digests: ${error.message}`);
  return { sent: true, items: items.length, recipient };
}
