import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasUnparseableAmount,
  unbackedAmounts,
} from "@/lib/mail-agent/amount-filter";
import { FORBIDDEN_WORDS } from "@/lib/mail-agent/knowledge";
import {
  BUSY_TEXT,
  FALLBACK_TEXT,
  FIKS_CHANNEL,
  FIKS_FALLBACK_MODEL,
  FIKS_MODEL,
  FIKS_SOURCE,
  FIKS_STAFF_NAME,
  FIKS_VISITOR_NAME,
  HANDOFF_CONFIRM_TEXT,
  HISTORY_FOR_MODEL,
  HISTORY_LOAD_LIMIT,
  MAX_MESSAGES_PER_HOUR,
  MAX_MESSAGES_PER_SESSION,
  MAX_MESSAGE_CHARS,
  MAX_NEW_SESSIONS_PER_HOUR,
  MAX_NEW_SESSIONS_PER_IP_PER_HOUR,
  MIN_MESSAGE_CHARS,
  OFF_TOPIC_SAFE_TEXT,
  SAFE_PRICE_TEXT,
  SESSION_LIMIT_TEXT,
  SUBJECT_CHARS,
} from "./config";
import { buildFiksSystemPrompt, buildSessionNote } from "./prompt";
import { readStoredQuote, toStoredQuote, type StoredFiksQuote } from "./quote";
import { MAX_FIKS_PRODUCTS, sanitizeProducts, type FiksProduct } from "./products-shared";
import { buildPublicTools, handoffImpl, type FiksToolContext, type HandoffTarget } from "./tools";
import type { FindDevicesDeps } from "./devices";
import type { PricedBuybackQuote } from "@/lib/mail-agent/tools";

export interface FiksReplyInput {
  supabase: SupabaseClient;
  sessionToken: string | null;
  message: string;
  anthropic?: Anthropic;
  /** Hash af den besøgendes IP. Bruges kun til at begrænse nye sessioner pr. besøgende. */
  ipHash?: string | null;
  /** For tests. */
  now?: () => Date;
  /** For tests: the loaders behind find_devices. */
  findDevicesDeps?: FindDevicesDeps;
}

export interface FiksReplyOutput {
  /** Null only when no session exists (a new session refused for load). */
  sessionToken: string | null;
  reply: string;
  handoff: boolean;
  limited?: "session" | "busy";
  /** Set when quote_buyback priced a device in this turn and the reply passed the checks. */
  quote?: StoredFiksQuote;
  /** Devices from the turn's last find_devices call, only when the reply passed the checks. */
  products?: FiksProduct[];
}

/** Stored on the chat inquiry as metadata.fiks_products: the cards under one Fiks reply. */
export interface StoredFiksProducts {
  items: FiksProduct[];
  at: string;
  /** Hash of the reply the cards belong to, so a reload only shows them under that reply. */
  reply_hash: string;
}

/** Short, stable fingerprint of a reply text. */
export function replyHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

export interface ChatMessageRow {
  sender: "customer" | "staff";
  body: string;
  staff_name: string | null;
  is_internal: boolean | null;
  created_at: string;
}

interface Session {
  id: string;
  token: string;
  status: string;
  metadata: Record<string, unknown>;
}

const TOKEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOUR_MS = 3_600_000;

/** Trimmed message, or null if it is empty or too long. */
export function validateMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const msg = raw.trim();
  if (msg.length < MIN_MESSAGE_CHARS || msg.length > MAX_MESSAGE_CHARS)
    return null;
  return msg;
}

export function isSessionToken(raw: unknown): raw is string {
  return typeof raw === "string" && TOKEN_RE.test(raw);
}

/** The open chat inquiry for a token, or null (unknown, malformed or closed). */
export async function findSession(
  supabase: SupabaseClient,
  token: string | null | undefined,
): Promise<Session | null> {
  if (!isSessionToken(token)) return null;
  const { data, error } = await supabase
    .from("contact_inquiries")
    .select("id, status, metadata")
    .eq("channel", FIKS_CHANNEL)
    .eq("external_thread_id", token)
    .neq("status", "lukket")
    .maybeSingle();
  if (error) throw new Error(`session lookup failed: ${error.message}`);
  if (!data) return null;
  const metadata =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : {};
  return {
    id: data.id as string,
    token,
    status: String(data.status),
    metadata,
  };
}

/** Messages of one session, oldest first, internal notes included (callers filter). */
export async function loadHistory(
  supabase: SupabaseClient,
  inquiryId: string,
  limit = HISTORY_LOAD_LIMIT,
): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from("inquiry_messages")
    .select("sender, body, staff_name, is_internal, created_at")
    .eq("inquiry_id", inquiryId)
    .eq("channel", FIKS_CHANNEL)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`history load failed: ${error.message}`);
  return ((data ?? []) as ChatMessageRow[]).slice().reverse();
}

async function countRows(
  supabase: SupabaseClient,
  table: string,
  filters: Record<string, string>,
  since?: string,
): Promise<number> {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  for (const [col, v] of Object.entries(filters)) q = q.eq(col, v);
  if (since) q = q.gte("created_at", since);
  const { count, error } = await q;
  if (error) throw new Error(`count ${table} failed: ${error.message}`);
  return count ?? 0;
}

function hasForbiddenWord(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_WORDS.some((w) => lower.includes(w));
}

/** The model is told to write plain text; strip the markdown it might still use. */
export function toPlainText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1: $2")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type ModelMessage = { role: "user" | "assistant"; content: string };

/** Visible history as alternating turns, starting with the visitor, ending with the new message. */
export function toModelMessages(
  history: ChatMessageRow[],
  latest: string,
): ModelMessage[] {
  const visible = history.filter((m) => !m.is_internal);
  const turns: ModelMessage[] = [
    ...visible.map((m) => ({
      role:
        m.sender === "customer" ? ("user" as const) : ("assistant" as const),
      content: m.body,
    })),
    { role: "user", content: latest },
  ].slice(-HISTORY_FOR_MODEL) as ModelMessage[];
  const merged: ModelMessage[] = [];
  for (const t of turns) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === t.role)
      prev.content = `${prev.content}\n\n${t.content}`;
    else merged.push({ ...t });
  }
  while (merged.length && merged[0].role === "assistant") merged.shift();
  return merged;
}

type ContentBlock = { type: string; text?: string };

function finalText(
  message: { content?: ContentBlock[]; stop_reason?: string | null } | null,
): string {
  if (!message || message.stop_reason === "tool_use") return "";
  return (message.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("")
    .trim();
}

let defaultClient: Anthropic | null = null;
function client(): Anthropic {
  // Ruten må køre 60 sekunder: giv op før det, så den besøgende får reserveteksten og ikke en netværksfejl.
  if (!defaultClient) defaultClient = new Anthropic({ timeout: 40_000, maxRetries: 0 });
  return defaultClient;
}

async function insertMessage(
  supabase: SupabaseClient,
  inquiryId: string,
  sender: "customer" | "staff",
  body: string,
): Promise<void> {
  const { error } = await supabase.from("inquiry_messages").insert({
    inquiry_id: inquiryId,
    sender,
    channel: FIKS_CHANNEL,
    body,
    staff_name: sender === "staff" ? FIKS_STAFF_NAME : null,
    is_internal: false,
  });
  if (error) throw new Error(`message insert failed: ${error.message}`);
}

/**
 * One chat turn: finds or creates the session, enforces the limits, stores the
 * visitor's message, asks the model and stores the checked reply. History is
 * always read from the database by token, never taken from the browser.
 * Model and SDK errors become a fixed fallback text; database errors throw.
 */
export async function fiksReply(
  input: FiksReplyInput,
): Promise<FiksReplyOutput> {
  const { supabase } = input;
  const now = input.now ?? (() => new Date());
  const message = validateMessage(input.message);
  if (!message) throw new Error("invalid message");
  const hourAgo = new Date(now().getTime() - HOUR_MS).toISOString();

  let session = await findSession(supabase, input.sessionToken);
  let history: ChatMessageRow[] = [];

  if (session) {
    const sent = await countRows(supabase, "inquiry_messages", {
      inquiry_id: session.id,
      sender: "customer",
    });
    if (sent >= MAX_MESSAGES_PER_SESSION) {
      return {
        sessionToken: session.token,
        reply: SESSION_LIMIT_TEXT,
        handoff: false,
        limited: "session",
      };
    }
  } else {
    const newSessions = await countRows(
      supabase,
      "contact_inquiries",
      { channel: FIKS_CHANNEL },
      hourAgo,
    );
    const fromIp = input.ipHash
      ? await countRows(supabase, "contact_inquiries", { channel: FIKS_CHANNEL, "metadata->>fiks_ip": input.ipHash }, hourAgo)
      : 0;
    if (newSessions >= MAX_NEW_SESSIONS_PER_HOUR || fromIp >= MAX_NEW_SESSIONS_PER_IP_PER_HOUR) {
      return {
        sessionToken: null,
        reply: BUSY_TEXT,
        handoff: false,
        limited: "busy",
      };
    }
  }
  const lastHour = await countRows(
    supabase,
    "inquiry_messages",
    { channel: FIKS_CHANNEL, sender: "customer" },
    hourAgo,
  );
  if (lastHour >= MAX_MESSAGES_PER_HOUR) {
    return {
      sessionToken: session?.token ?? null,
      reply: BUSY_TEXT,
      handoff: false,
      limited: "busy",
    };
  }

  const handedOffBefore = Boolean(session?.metadata.fiks_handoff_at);
  const nowIso = now().toISOString();

  if (session) {
    history = await loadHistory(supabase, session.id);
    const update: Record<string, unknown> = { last_inbound_at: nowIso };
    // A handed-off chat that staff already answered goes back on the to-do list.
    if (handedOffBefore && session.status !== "ny")
      update.status = "venter_paa_svar";
    const { error } = await supabase
      .from("contact_inquiries")
      .update(update)
      .eq("id", session.id);
    if (error) throw new Error(`session update failed: ${error.message}`);
  } else {
    const token = crypto.randomUUID();
    const newMetadata: Record<string, unknown> = input.ipHash ? { fiks_ip: input.ipHash } : {};
    const { data, error } = await supabase
      .from("contact_inquiries")
      .insert({
        channel: FIKS_CHANNEL,
        source: FIKS_SOURCE,
        external_thread_id: token,
        name: FIKS_VISITOR_NAME,
        email: null,
        subject: message.replace(/\s+/g, " ").slice(0, SUBJECT_CHARS),
        message,
        status: "besvaret",
        last_inbound_at: nowIso,
        metadata: newMetadata,
      })
      .select("id")
      .single();
    if (error || !data)
      throw new Error(`session insert failed: ${error?.message ?? "no row"}`);
    session = {
      id: data.id as string,
      token,
      status: "besvaret",
      metadata: newMetadata,
    };
  }

  await insertMessage(supabase, session.id, "customer", message);

  const buybackQuotes: PricedBuybackQuote[] = [];
  const deviceFinds: FiksProduct[][] = [];
  const ctx: FiksToolContext = {
    supabase,
    verified: { emails: [] },
    log: [],
    outputs: [],
    scopeMismatch: { value: false },
    buybackQuotes,
    deviceFinds,
    ...(input.findDevicesDeps ? { findDevicesDeps: input.findDevicesDeps } : {}),
  };
  const target: HandoffTarget = {
    supabase,
    inquiryId: session.id,
    metadata: session.metadata,
  };
  let handedOff = false;
  const tools = buildPublicTools(ctx, async (h) => {
    const result = await handoffImpl(target, h);
    if (result.done) handedOff = true;
    return result;
  });

  let reply = "";
  // Ukendt model-id (404) rammer før noget værktøj er kørt: prøv da én gang med mailassistentens model.
  for (const model of [FIKS_MODEL, FIKS_FALLBACK_MODEL]) {
    try {
      const anthropic = input.anthropic ?? client();
      const sessionNote = buildSessionNote({ handedOff: handedOffBefore });
      const runner = anthropic.beta.messages.toolRunner({
        model,
        max_tokens: 2000,
        thinking: { type: "adaptive" as const },
        output_config: { effort: "low" as const },
        system: [
          {
            type: "text" as const,
            text: buildFiksSystemPrompt(),
            cache_control: { type: "ephemeral" as const },
          },
          ...(sessionNote
            ? [{ type: "text" as const, text: sessionNote }]
            : []),
        ],
        tools,
        messages: toModelMessages(history, message),
        max_iterations: 6,
      });
      type FinalMessage = {
        content?: ContentBlock[];
        stop_reason?: string | null;
      };
      let last: FinalMessage | null = null;
      for await (const m of runner) last = m as unknown as FinalMessage;
      reply = toPlainText(finalText(last));
      break;
    } catch (err) {
      console.error(
        `[fiks] model call failed (${model})`,
        err instanceof Error ? err.message : err,
      );
      reply = "";
      if (
        (err as { status?: number } | null)?.status !== 404 ||
        model === FIKS_FALLBACK_MODEL
      )
        break;
    }
  }

  // The button to the sell form only goes with a reply the model wrote and the checks let through.
  let replyPassed = false;
  if (!reply) {
    reply = handedOff ? HANDOFF_CONFIRM_TEXT : FALLBACK_TEXT;
  } else {
    replyPassed = true;
    const backing = [
      ...ctx.outputs,
      ...history
        .filter((m) => m.sender === "staff" && !m.is_internal)
        .map((m) => m.body),
    ];
    if (
      unbackedAmounts(reply, backing).length > 0 ||
      hasUnparseableAmount(reply)
    ) {
      reply = handedOff ? HANDOFF_CONFIRM_TEXT : SAFE_PRICE_TEXT;
      replyPassed = false;
    } else if (hasForbiddenWord(reply)) {
      reply = handedOff ? HANDOFF_CONFIRM_TEXT : OFF_TOPIC_SAFE_TEXT;
      replyPassed = false;
    }
  }

  // The amount comes from the tool's structured result, never from the model's text.
  const priced = replyPassed ? buybackQuotes.at(-1) : undefined;
  let quote: StoredFiksQuote | undefined = priced ? toStoredQuote(priced, nowIso) : undefined;
  // Same for the cards: the last find_devices call of the turn, only under a reply that passed.
  let products: FiksProduct[] | undefined = replyPassed
    ? sanitizeProducts((deviceFinds.at(-1) ?? []).slice(0, MAX_FIKS_PRODUCTS))
    : undefined;
  if (products && products.length === 0) products = undefined;
  if (quote || products) {
    // target.metadata already carries a handoff made in this turn.
    const metadata: Record<string, unknown> = { ...target.metadata };
    if (quote) metadata.fiks_quote = quote;
    if (products) {
      const stored: StoredFiksProducts = { items: products, at: nowIso, reply_hash: replyHash(reply) };
      metadata.fiks_products = stored;
    }
    const { error } = await supabase.from("contact_inquiries").update({ metadata }).eq("id", session.id);
    if (error) {
      // Without stored data the form cannot be prefilled and a reload loses the cards; the reply still stands.
      console.error("[fiks] metadata store failed", { code: error.code, message: error.message });
      quote = undefined;
      products = undefined;
    } else {
      target.metadata = metadata;
    }
  }

  await insertMessage(supabase, session.id, "staff", reply);
  return {
    sessionToken: session.token,
    reply,
    handoff: handedOff,
    ...(quote ? { quote } : {}),
    ...(products ? { products } : {}),
  };
}

/** The stored cards, or null if metadata has none or they do not have the expected shape. */
export function readStoredProducts(metadata: Record<string, unknown> | null | undefined): StoredFiksProducts | null {
  const p = metadata?.fiks_products as Record<string, unknown> | undefined;
  if (!p || typeof p !== "object" || typeof p.reply_hash !== "string" || typeof p.at !== "string") return null;
  const items = sanitizeProducts(p.items);
  return items.length ? { items, at: p.at, reply_hash: p.reply_hash } : null;
}

/**
 * The cards for a restored chat: only when Fiks' latest visible reply is the
 * one that produced them, so old cards never end up under an unrelated reply.
 */
export async function loadProductsForToken(
  supabase: SupabaseClient,
  token: string | null | undefined,
  latestFiksReply: string | null | undefined,
): Promise<FiksProduct[] | null> {
  if (!latestFiksReply) return null;
  const session = await findSession(supabase, token);
  const stored = session ? readStoredProducts(session.metadata) : null;
  if (!stored || stored.reply_hash !== replyHash(latestFiksReply)) return null;
  return stored.items;
}

/** The latest stored quote of an open chat session, by token. Null for unknown, malformed or closed sessions. */
export async function loadQuoteForToken(
  supabase: SupabaseClient,
  token: string | null | undefined,
): Promise<StoredFiksQuote | null> {
  const session = await findSession(supabase, token);
  return session ? readStoredQuote(session.metadata) : null;
}

export type VisibleMessage = {
  from: "visitor" | "fiks" | "staff";
  body: string;
  at: string;
};

/** Non-internal messages of an open session, for restoring the widget. Empty for unknown tokens. */
export async function loadVisibleMessages(
  supabase: SupabaseClient,
  token: string | null | undefined,
): Promise<VisibleMessage[]> {
  const session = await findSession(supabase, token);
  if (!session) return [];
  const rows = await loadHistory(supabase, session.id, 100);
  return rows
    .filter((m) => !m.is_internal)
    .map((m) => ({
      from:
        m.sender === "customer"
          ? "visitor"
          : m.staff_name === FIKS_STAFF_NAME
            ? "fiks"
            : "staff",
      body: m.body,
      at: m.created_at,
    }));
}
