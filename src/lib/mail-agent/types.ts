export const MAIL_CATEGORIES = [
  "ordre",
  "reparation",
  "opkoeb",
  "retur_reklamation",
  "produkt",
  "butik_aabningstider",
  "leverandoer_b2b",
  "nyhedsbrev_spam",
  "system_notifikation",
  "andet",
] as const;
export type MailCategory = (typeof MAIL_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<MailCategory, string> = {
  ordre: "Ordre",
  reparation: "Reparation",
  opkoeb: "Opkøb",
  retur_reklamation: "Retur og reklamation",
  produkt: "Produktspørgsmål",
  butik_aabningstider: "Butik og åbningstider",
  leverandoer_b2b: "Leverandør og B2B",
  nyhedsbrev_spam: "Nyhedsbrev og spam",
  system_notifikation: "Systemnotifikation",
  andet: "Andet",
};

/** What the model hands back through submit_assessment, after validation. */
export interface Assessment {
  category: MailCategory;
  needs_human: boolean;
  reason: string;
  summary: string;
  confidence: number;
  draft: { subject: string; body: string } | null;
}

/** One mail fetched over IMAP, already parsed. */
export interface InboundMail {
  mailbox: string;
  uid: number;
  messageId: string;
  fromEmail: string;
  fromName: string | null;
  to: string[];
  subject: string;
  text: string;
  date: Date;
  inReplyTo: string | null;
  references: string[];
  attachments: string[];
  /** List-Unsubscribe header present: a newsletter or marketing list. */
  listUnsubscribe: boolean;
}

export interface LookupLog {
  tool: string;
  input: Record<string, unknown>;
  hits: number;
}

export type AiDraftStatus = "pending" | "sent" | "auto_sent" | "discarded";

export interface AiDraftRow {
  id: string;
  inquiry_id: string;
  trigger_message_id: string | null;
  category: MailCategory;
  needs_human: boolean;
  reason: string;
  summary: string;
  draft_subject: string | null;
  draft_body: string | null;
  lookups: LookupLog[];
  confidence: number;
  model: string;
  input_tokens: number;
  output_tokens: number;
  status: AiDraftStatus;
  final_body: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface MailAgentSettings {
  enabled: boolean;
  autoSendCategories: MailCategory[];
  minConfidence: number;
}
