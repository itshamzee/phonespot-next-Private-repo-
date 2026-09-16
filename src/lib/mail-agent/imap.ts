import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail, type AddressObject } from "mailparser";
import { ONECOM, type MailboxConfig } from "./config";
import type { InboundMail } from "./types";

/** Plain text for the model: the text part when present, otherwise stripped HTML. */
export function preferredBody(parsed: { text?: string; html?: string | false }): string {
  if (parsed.text && parsed.text.trim()) return parsed.text.trim();
  if (parsed.html) {
    return parsed.html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return "";
}

function addresses(value: AddressObject | AddressObject[] | undefined): string[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.flatMap((a) => a.value.map((v) => (v.address ?? "").toLowerCase())).filter(Boolean);
}

export function parseInbound({ mailbox, uid, parsed }: { mailbox: string; uid: number; parsed: ParsedMail }): InboundMail {
  const from = parsed.from?.value?.[0];
  const refs = Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : [];
  return {
    mailbox,
    uid,
    messageId: parsed.messageId ?? `<uid-${uid}@${mailbox}>`,
    fromEmail: (from?.address ?? "").toLowerCase(),
    fromName: from?.name || null,
    to: addresses(parsed.to),
    subject: parsed.subject ?? "",
    text: preferredBody(parsed),
    date: parsed.date ?? new Date(),
    inReplyTo: parsed.inReplyTo ?? null,
    references: refs,
    attachments: (parsed.attachments ?? []).map((a) => a.filename ?? "bilag").filter(Boolean),
  };
}

export async function withImap<T>(box: MailboxConfig, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    host: ONECOM.imapHost,
    port: ONECOM.imapPort,
    secure: true,
    auth: { user: box.address, pass: box.password },
    logger: false,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.logout().catch(() => {});
  }
}

/** Unseen mail in INBOX, oldest first. Does not change any flags. */
export async function fetchUnseen(box: MailboxConfig, limit: number): Promise<InboundMail[]> {
  return withImap(box, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = (await client.search({ seen: false }, { uid: true })) as number[] | false;
      if (!uids || uids.length === 0) return [];
      const chosen = [...uids].sort((a, b) => a - b).slice(0, limit);
      const out: InboundMail[] = [];
      for await (const msg of client.fetch(chosen, { uid: true, source: true }, { uid: true })) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        out.push(parseInbound({ mailbox: box.address, uid: msg.uid, parsed }));
      }
      return out;
    } finally {
      lock.release();
    }
  });
}

export async function markSeen(box: MailboxConfig, uids: number[]): Promise<void> {
  if (uids.length === 0) return;
  await withImap(box, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      await client.messageFlagsAdd(uids, ["\\Seen"], { uid: true });
    } finally {
      lock.release();
    }
  });
}

async function sentFolder(client: ImapFlow): Promise<string> {
  const list = await client.list();
  const special = list.find((m) => m.specialUse === "\\Sent");
  return special?.path ?? list.find((m) => /^sent/i.test(m.name))?.path ?? "Sent";
}

/** Store an outgoing message in the mailbox's Sent folder so Thunderbird shows it in the thread. */
export async function appendToSent(box: MailboxConfig, rawMessage: Buffer): Promise<void> {
  await withImap(box, async (client) => {
    const path = await sentFolder(client);
    await client.append(path, rawMessage, ["\\Seen"]);
  });
}
