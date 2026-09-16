import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { assessMessage, type AssessOutput } from "./agent";
import { displayNameFor, loadMailboxes, type MailboxConfig } from "./config";
import { insertDraft, markDraft } from "./drafts";
import { folderByRules, folderForCategory, folderPath, type FolderKey } from "./folders";
import { fetchUnseen, markSeen, moveToFolder } from "./imap";
import { ingestInboundEmail } from "./ingest";
import { notifyNeedsHuman } from "./notify";
import { handlingFor } from "./schema";
import { loadMailAgentSettings } from "./settings";
import type { AiDraftRow, Assessment, InboundMail, MailAgentSettings } from "./types";

export interface RunReport {
  runId: string | null;
  fetched: number;
  processed: number;
  drafted: number;
  autoSent: number;
  skipped: number;
  filed: number;
  errors: { mailbox: string; messageId: string; error: string }[];
}

/** Folder moves collected during a run and executed after \Seen, per mailbox. */
type PendingMoves = Map<FolderKey, number[]>;

function queueMove(moves: PendingMoves, key: FolderKey, uid: number): void {
  const list = moves.get(key) ?? [];
  list.push(uid);
  moves.set(key, list);
}

/** Rule-matched folders map onto the agent's categories for the audit column. */
const RULE_CLASSIFICATION: Partial<Record<FolderKey, string>> = {
  nyhedsbreve: "nyhedsbrev_spam",
  leverandoerer: "leverandoer_b2b",
  fragt: "leverandoer_b2b",
  platforme: "leverandoer_b2b",
  oekonomi: "leverandoer_b2b",
  ansoegninger: "andet",
};

/**
 * Move the inbox copy of an inquiry's mails into the customer folder for its
 * category. Called when a draft is approved or discarded, so customer mail
 * stays in INBOX while it is unanswered.
 */
export async function fileInquiryMail(sb: SupabaseClient, inquiryId: string, category: string): Promise<number> {
  const { data: rows } = await sb
    .from("mail_inbound")
    .select("id, mailbox, imap_uid")
    .eq("inquiry_id", inquiryId)
    .is("folder", null)
    .not("imap_uid", "is", null);
  const list = (rows ?? []) as { id: string; mailbox: string; imap_uid: number }[];
  if (!list.length) return 0;
  const key = folderForCategory(category as Parameters<typeof folderForCategory>[0]);
  const boxes = loadMailboxes();
  let moved = 0;
  for (const box of boxes) {
    const mine = list.filter((r) => r.mailbox === box.address);
    if (!mine.length) continue;
    await moveToFolder(box, mine.map((r) => r.imap_uid), folderPath(key));
    await sb.from("mail_inbound").update({ folder: folderPath(key).join("/") }).in("id", mine.map((r) => r.id));
    moved += mine.length;
  }
  return moved;
}

/** Phase 2 switch: only categories the owner has enabled, and only clean, confident drafts. */
export function decideAutoSend(a: Assessment, s: MailAgentSettings): boolean {
  return (
    s.enabled &&
    !a.needs_human &&
    a.draft !== null &&
    a.confidence >= s.minConfidence &&
    s.autoSendCategories.includes(a.category)
  );
}

type ThreadMessage = { sender: "customer" | "staff"; body: string; created_at: string };

async function storeDraft(
  sb: SupabaseClient,
  inquiryId: string,
  inquiryMessageId: string,
  out: AssessOutput,
): Promise<AiDraftRow> {
  await sb.from("contact_inquiries").update({ category: out.assessment.category }).eq("id", inquiryId);
  return insertDraft(sb, {
    inquiry_id: inquiryId,
    trigger_message_id: inquiryMessageId,
    category: out.assessment.category,
    needs_human: out.assessment.needs_human,
    reason: out.assessment.reason,
    summary: out.assessment.summary,
    draft_subject: out.assessment.draft?.subject ?? null,
    draft_body: out.assessment.draft?.body ?? null,
    lookups: out.lookups,
    confidence: out.assessment.confidence,
    model: out.model,
    input_tokens: out.usage.input,
    output_tokens: out.usage.output,
  });
}

/**
 * Assess the latest customer message on an existing inquiry thread and store a
 * draft. Used by the Resend webhook and by the poller for replies on known threads.
 */
export async function assessAndDraft(
  sb: SupabaseClient,
  args: {
    inquiryId: string;
    inquiryMessageId: string;
    senderEmail: string;
    senderName: string | null;
    mailbox: string;
    subject: string;
  },
  anthropic?: Anthropic,
): Promise<{ draft: AiDraftRow; assessment: Assessment }> {
  const { data: msgs } = await sb
    .from("inquiry_messages")
    .select("sender, body, created_at")
    .eq("inquiry_id", args.inquiryId)
    .order("created_at", { ascending: true });
  const thread = (msgs ?? []) as ThreadMessage[];
  const latest = thread.length ? thread[thread.length - 1].body : "";
  const out = await assessMessage(
    {
      supabase: sb,
      senderEmail: args.senderEmail,
      senderName: args.senderName,
      mailbox: args.mailbox,
      displayName: displayNameFor(args.mailbox),
      subject: args.subject,
      thread: thread.slice(0, -1),
      latest,
    },
    anthropic,
  );
  const draft = await storeDraft(sb, args.inquiryId, args.inquiryMessageId, out);
  return { draft, assessment: out.assessment };
}

async function assessRaw(sb: SupabaseClient, mail: InboundMail, box: MailboxConfig, anthropic?: Anthropic): Promise<AssessOutput> {
  return assessMessage(
    {
      supabase: sb,
      senderEmail: mail.fromEmail,
      senderName: mail.fromName,
      mailbox: box.address,
      displayName: box.displayName,
      subject: mail.subject,
      thread: [],
      latest: mail.text + (mail.attachments.length ? `\n\n[Bilag: ${mail.attachments.join(", ")}]` : ""),
    },
    anthropic,
  );
}

async function finishInbound(sb: SupabaseClient, id: string, patch: Record<string, unknown>): Promise<void> {
  await sb
    .from("mail_inbound")
    .update({ ...patch, processed_at: new Date().toISOString(), error: null })
    .eq("id", id);
}

async function afterAssessment(
  sb: SupabaseClient,
  box: MailboxConfig,
  mail: InboundMail,
  inquiryId: string,
  draft: AiDraftRow,
  assessment: Assessment,
  settings: MailAgentSettings,
  report: RunReport,
): Promise<void> {
  if (draft.draft_body) report.drafted++;
  if (decideAutoSend(assessment, settings) && draft.draft_body) {
    // Lazy: send-reply pulls in Resend and React Email, which the poll path rarely needs.
    const { sendInquiryReply } = await import("@/lib/inquiries/send-reply");
    await sendInquiryReply(sb, {
      inquiryId,
      body: draft.draft_body,
      staffName: "PhoneSpot assistent",
      subjectOverride: draft.draft_subject ?? undefined,
    });
    await markDraft(sb, draft.id, {
      status: "auto_sent",
      final_body: draft.draft_body,
      sent_at: new Date().toISOString(),
      reviewed_by: "auto",
    });
    report.autoSent++;
  } else if (assessment.needs_human) {
    await notifyNeedsHuman({ inquiryId, summary: assessment.summary, mailbox: box.address, from: mail.fromEmail });
  }
}

async function processMail(
  sb: SupabaseClient,
  box: MailboxConfig,
  mail: InboundMail,
  settings: MailAgentSettings,
  report: RunReport,
  moves: PendingMoves,
  anthropic?: Anthropic,
): Promise<void> {
  const { data: existing } = await sb
    .from("mail_inbound")
    .select("id, processed_at, inquiry_id, inquiry_message_id")
    .eq("message_id", mail.messageId)
    .maybeSingle();
  if (existing?.processed_at) {
    report.skipped++;
    return;
  }

  let inboundId = existing?.id as string | undefined;
  if (!inboundId) {
    const { data, error } = await sb
      .from("mail_inbound")
      .insert({
        mailbox: box.address,
        imap_uid: mail.uid,
        message_id: mail.messageId,
        from_email: mail.fromEmail,
        from_name: mail.fromName,
        subject: mail.subject,
        received_at: mail.date.toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`mail_inbound: ${error?.message ?? "insert fejlede"}`);
    inboundId = data.id as string;
  }

  // Ingested on an earlier run but the agent step failed: resume there, no second message row.
  if (existing?.inquiry_id && existing?.inquiry_message_id) {
    const r = await assessAndDraft(
      sb,
      {
        inquiryId: existing.inquiry_id as string,
        inquiryMessageId: existing.inquiry_message_id as string,
        senderEmail: mail.fromEmail,
        senderName: mail.fromName,
        mailbox: box.address,
        subject: mail.subject,
      },
      anthropic,
    );
    await afterAssessment(sb, box, mail, existing.inquiry_id as string, r.draft, r.assessment, settings, report);
    await finishInbound(sb, inboundId, { classification: r.assessment.category });
    report.processed++;
    return;
  }

  // Cheap filing first: our own notifications, shipping, suppliers, platforms,
  // newsletters and applications never reach Claude and go straight to a folder.
  const ruleFolder = folderByRules({ fromEmail: mail.fromEmail, subject: mail.subject, listUnsubscribe: mail.listUnsubscribe });
  if (ruleFolder) {
    const classification = mail.fromEmail.endsWith("@phonespot.dk") ? "system_notifikation" : (RULE_CLASSIFICATION[ruleFolder] ?? "system_notifikation");
    await finishInbound(sb, inboundId, { classification, folder: folderPath(ruleFolder).join("/") });
    queueMove(moves, ruleFolder, mail.uid);
    report.processed++;
    return;
  }

  // First pass on the raw mail decides whether it becomes an inquiry at all.
  const first = await assessRaw(sb, mail, box, anthropic);
  if (!handlingFor(first.assessment.category).createInquiry) {
    const key = folderForCategory(first.assessment.category);
    await finishInbound(sb, inboundId, { classification: first.assessment.category, folder: folderPath(key).join("/") });
    queueMove(moves, key, mail.uid);
    report.processed++;
    return;
  }

  const ingest = await ingestInboundEmail(sb, {
    fromEmail: mail.fromEmail,
    fromName: mail.fromName,
    subject: mail.subject,
    text: mail.text + (mail.attachments.length ? `\n\n[Bilag: ${mail.attachments.join(", ")}]` : ""),
    inReplyTo: mail.inReplyTo,
    messageId: mail.messageId,
    mailbox: box.address,
    storeId: box.storeId,
  });
  await sb
    .from("mail_inbound")
    .update({ inquiry_id: ingest.inquiryId, inquiry_message_id: ingest.inquiryMessageId })
    .eq("id", inboundId);

  // A fresh thread reuses the first assessment (it already saw the whole mail and did its lookups).
  // A reply on a known thread is assessed again with the thread as context.
  let assessment = first.assessment;
  let draft: AiDraftRow;
  if (ingest.created) {
    draft = await storeDraft(sb, ingest.inquiryId, ingest.inquiryMessageId, first);
  } else {
    const r = await assessAndDraft(
      sb,
      {
        inquiryId: ingest.inquiryId,
        inquiryMessageId: ingest.inquiryMessageId,
        senderEmail: mail.fromEmail,
        senderName: mail.fromName,
        mailbox: box.address,
        subject: mail.subject,
      },
      anthropic,
    );
    assessment = r.assessment;
    draft = r.draft;
  }

  await afterAssessment(sb, box, mail, ingest.inquiryId, draft, assessment, settings, report);
  await finishInbound(sb, inboundId, { classification: assessment.category });
  report.processed++;
}

function isStopWorthy(message: string): boolean {
  return /\b(401|429)\b|authentication|rate limit|invalid x-api-key/i.test(message);
}

/**
 * One poll of every configured mailbox. Marks a mail \Seen only after it has
 * been processed, so anything that fails is picked up again on the next run.
 */
export async function runMailAgent(
  opts: { maxMails?: number; timeBudgetMs?: number; dryRun?: boolean; supabase?: SupabaseClient; anthropic?: Anthropic } = {},
): Promise<RunReport> {
  const started = Date.now();
  const maxMails = opts.maxMails ?? 15;
  const budget = opts.timeBudgetMs ?? 240_000;
  const sb = opts.supabase ?? createAdminClient();
  const report: RunReport = { runId: null, fetched: 0, processed: 0, drafted: 0, autoSent: 0, skipped: 0, filed: 0, errors: [] };
  const boxes = loadMailboxes();
  const settings = await loadMailAgentSettings(sb);

  if (!settings.enabled && !opts.dryRun) return report;

  if (!opts.dryRun) {
    const { data } = await sb
      .from("mail_agent_runs")
      .insert({ mailboxes: boxes.map((b) => b.address) })
      .select("id")
      .single();
    report.runId = (data?.id as string) ?? null;
  }

  let remaining = maxMails;
  outer: for (const box of boxes) {
    if (remaining <= 0 || Date.now() - started > budget) break;

    let mails: InboundMail[] = [];
    try {
      mails = await fetchUnseen(box, remaining);
    } catch (err) {
      report.errors.push({ mailbox: box.address, messageId: "-", error: `IMAP: ${(err as Error).message}` });
      continue;
    }
    report.fetched += mails.length;

    const seen: number[] = [];
    const moves: PendingMoves = new Map();
    for (const mail of mails) {
      if (Date.now() - started > budget) break;
      try {
        if (opts.dryRun) {
          const out = await assessRaw(sb, mail, box, opts.anthropic);
          const a = out.assessment;
          console.log(
            `\n[${box.address}] ${mail.fromEmail} · ${mail.subject}\n  → ${a.category} · needs_human=${a.needs_human} · ${a.confidence}\n  ${a.summary}\n  ${a.reason}\n  opslag: ${out.lookups.map((l) => `${l.tool}=${l.hits}`).join(", ") || "ingen"}\n${a.draft ? `\n${a.draft.body}\n` : ""}`,
          );
        } else {
          await processMail(sb, box, mail, settings, report, moves, opts.anthropic);
          seen.push(mail.uid);
        }
        remaining--;
      } catch (err) {
        const message = (err as Error).message;
        report.errors.push({ mailbox: box.address, messageId: mail.messageId, error: message });
        if (!opts.dryRun) {
          await sb.from("mail_inbound").update({ error: message }).eq("message_id", mail.messageId);
        }
        if (isStopWorthy(message)) {
          console.error(`[mail-agent] stopper koerslen: ${message}`);
          if (!opts.dryRun && seen.length) await markSeenSafely(box, seen, report);
          if (!opts.dryRun) await applyMoves(box, moves, report);
          break outer;
        }
      }
    }
    if (!opts.dryRun && seen.length) await markSeenSafely(box, seen, report);
    if (!opts.dryRun) await applyMoves(box, moves, report);
  }

  if (report.runId) {
    await sb
      .from("mail_agent_runs")
      .update({
        finished_at: new Date().toISOString(),
        fetched: report.fetched,
        processed: report.processed,
        drafted: report.drafted,
        auto_sent: report.autoSent,
        errors: report.errors,
      })
      .eq("id", report.runId);
  }
  return report;
}

async function applyMoves(box: MailboxConfig, moves: PendingMoves, report: RunReport): Promise<void> {
  for (const [key, uids] of moves) {
    try {
      await moveToFolder(box, uids, folderPath(key));
      report.filed += uids.length;
    } catch (err) {
      report.errors.push({ mailbox: box.address, messageId: "-", error: `move ${key}: ${(err as Error).message}` });
    }
  }
  moves.clear();
}

async function markSeenSafely(box: MailboxConfig, uids: number[], report: RunReport): Promise<void> {
  try {
    await markSeen(box, uids);
  } catch (err) {
    report.errors.push({ mailbox: box.address, messageId: "-", error: `markSeen: ${(err as Error).message}` });
  }
}
