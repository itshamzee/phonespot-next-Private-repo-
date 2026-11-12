import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail, type AddressObject } from "mailparser";
import { ONECOM, type MailboxConfig } from "./config";
import type { InboxEntry } from "./folders";
import type { InboundMail } from "./types";

/**
 * Keyword the agent puts on INBOX mail it has dealt with. It replaces the Seen
 * flag as the "done" marker, so unread keeps meaning "no person has looked at this".
 */
export const AGENT_KEYWORD = "PSAgent";
const LOOKBACK_DAYS = 14;
const SEEN = String.fromCharCode(92) + "Seen";
const ANSWERED = String.fromCharCode(92) + "Answered";

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
    listUnsubscribe: Boolean(parsed.headers?.get("list-unsubscribe")),
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

/** Deduplicated, oldest first, capped at `limit`. */
export function chooseUids(uids: number[], limit: number): number[] {
  return [...new Set(uids)].sort((a, b) => a - b).slice(0, limit);
}

/**
 * Recent INBOX mail the agent has not handled yet, oldest first, read or not.
 * Whether a person has opened the mail plays no part: a mail read in
 * Thunderbird before the poll is still picked up, and a mail that failed is
 * retried until it succeeds or ages out. Does not change any flags.
 */
export async function fetchUnhandled(box: MailboxConfig, limit: number): Promise<InboundMail[]> {
  return withImap(box, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000);
      const found = (await client.search({ since, unKeyword: AGENT_KEYWORD }, { uid: true })) as number[] | false;
      const chosen = chooseUids(found || [], limit);
      if (chosen.length === 0) return [];
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

/**
 * Mark INBOX mail as handled by the agent. Only `read` is also marked as read
 * (noise such as newsletters); the rest stays unread for a person.
 */
export async function markHandled(box: MailboxConfig, uids: number[], read: number[] = []): Promise<void> {
  if (uids.length === 0) return;
  await withImap(box, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      await client.messageFlagsAdd(uids, [AGENT_KEYWORD], { uid: true });
      if (read.length) await client.messageFlagsAdd(read, [SEEN], { uid: true });
    } finally {
      lock.release();
    }
  });
}

/** Mark INBOX mail read: used when a reply has gone out or a draft was discarded. */
export async function markSeen(box: MailboxConfig, uids: number[]): Promise<void> {
  if (uids.length === 0) return;
  await withImap(box, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      await client.messageFlagsAdd(uids, [SEEN], { uid: true });
    } finally {
      lock.release();
    }
  });
}

/**
 * Who a mail is a conversation with. Reply-To is set by the sender, so it is
 * only trusted on our own form notices; anyone else is identified by From, or
 * a stranger could attach their mail to another customer's conversation.
 */
export function counterpartOf(fromEmail: string, replyTo: string): string {
  const own = fromEmail === "noreply@phonespot.dk" || fromEmail === "ordre@phonespot.dk";
  return own && replyTo ? replyTo : fromEmail;
}

/** Envelope and flags for everything in INBOX. Read-only. */
export async function listInbox(box: MailboxConfig): Promise<InboxEntry[]> {
  return withImap(box, async (client) => {
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const out: InboxEntry[] = [];
      const status = await client.status("INBOX", { messages: true });
      if (!status.messages) return out;
      for await (const msg of client.fetch("1:*", { uid: true, envelope: true, flags: true, internalDate: true })) {
        const env = msg.envelope;
        const fromEmail = (env?.from?.[0]?.address ?? "").toLowerCase();
        const replyTo = (env?.replyTo?.[0]?.address ?? "").toLowerCase();
        out.push({
          uid: msg.uid,
          messageId: env?.messageId ?? "",
          counterpart: counterpartOf(fromEmail, replyTo),
          fromEmail,
          subject: env?.subject ?? "",
          date: new Date((msg.internalDate as Date | string | undefined) ?? env?.date ?? Date.now()),
          answered: msg.flags?.has(ANSWERED) ?? false,
        });
      }
      return out;
    } finally {
      lock.release();
    }
  });
}

/** Create the folder if missing. Returns the server path. Idempotent. */
export async function ensureFolder(client: ImapFlow, path: string[]): Promise<string> {
  const list = await client.list();
  const delimiter = list.find((m) => m.delimiter)?.delimiter ?? ".";
  const target = path.join(delimiter);
  const found = list.find((m) => m.path.toLowerCase() === target.toLowerCase());
  if (found) return found.path;
  const res = await client.mailboxCreate(path);
  return res.path;
}

/** Create every folder in `paths` in one connection. */
export async function ensureFolders(box: MailboxConfig, paths: string[][]): Promise<string[]> {
  return withImap(box, async (client) => {
    const out: string[] = [];
    for (const p of paths) out.push(await ensureFolder(client, p));
    return out;
  });
}

/** Move messages (by INBOX uid) into a folder, creating it if needed. */
export async function moveToFolder(box: MailboxConfig, uids: number[], path: string[]): Promise<void> {
  if (uids.length === 0) return;
  await withImap(box, async (client) => {
    const target = await ensureFolder(client, path);
    const lock = await client.getMailboxLock("INBOX");
    try {
      await client.messageMove(uids, target, { uid: true });
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
