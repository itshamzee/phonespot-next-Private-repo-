/**
 * Historik på en sag: statuslog, SMS, kommentarer, interne noter, tilbud og
 * depositum samlet i én tidslinje (nyeste øverst).
 */
import type { CaseDeposit } from "@/lib/pos/deposits";
import { formatKrShort, methodLabel } from "@/lib/repairs/case-money";
import { STATUS_LABELS } from "@/lib/repairs/status-labels";

export type TimelineKind =
  | "oprettet"
  | "status"
  | "sms"
  | "kommentar"
  | "note"
  | "tilbud"
  | "depositum"
  | "betaling"
  | "linjer";

/** En række fra activity_log om sagens linjer (repair__log), med medarbejderens navn slået op. */
export type CaseActivity = {
  id: string;
  action: string;
  created_at: string;
  actor_name?: string | null;
  details: Record<string, unknown> | null;
};

/** Handlinger i activity_log der vises på tidslinjen. */
export const TIMELINE_ACTIONS = [
  "repair_case_item_added",
  "repair_case_item_removed",
  "repair_case_price_changed",
  "repair_case_part_swapped",
] as const;

export type TimelineItem = {
  id: string;
  at: string;
  kind: TimelineKind;
  text: string;
  actor?: string | null;
};

type Source = {
  ticket: {
    id: string;
    created_at: string;
    paid?: boolean | null;
    paid_at?: string | null;
    internal_notes?: { text: string; author?: string; timestamp: string }[] | null;
  };
  logs?: { id: string; old_status: string | null; new_status: string; note: string | null; created_at: string }[];
  sms?: { id: string; message: string; status: string; created_at: string }[];
  comments?: { id: string; author: string; message: string; visibility: string; created_at: string }[];
  quotes?: {
    id: string;
    price_dkk: number;
    sent_at: string | null;
    accepted_at: string | null;
    declined_at: string | null;
    created_at: string;
  }[];
  deposits?: CaseDeposit[];
  activity?: CaseActivity[];
};

function clip(s: string, n = 90): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;
}

function kr(oere: unknown): string {
  return typeof oere === "number" && Number.isFinite(oere) ? formatKrShort(oere) : "ukendt pris";
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Dansk tekst for en linjehandling fra activity_log, eller null for en handling vi ikke viser. */
export function activityText(a: Pick<CaseActivity, "action" | "details">): string | null {
  const d = a.details ?? {};
  const name = str(d.description) || "linjen";
  const reason = str(d.reason);
  if (a.action === "repair_case_price_changed") {
    const base = `Pris rettet på ${name}: ${kr(d.old_unit_oere)} til ${kr(d.new_unit_oere)}`;
    const list = typeof d.list_oere === "number" && d.list_oere !== d.new_unit_oere && d.kind !== "free_text" ? ` (listepris ${kr(d.list_oere)})` : "";
    return `${base}${list}${reason ? `. Begrundelse: ${reason}` : ""}`;
  }
  if (a.action === "repair_case_item_removed") {
    const used = Array.isArray(d.used_parts) && d.used_parts.length > 0;
    const base = `${name} fjernet fra sagen (${kr(d.unit_oere)})`;
    const note = used ? ". Delen var allerede brugt, lageret er ikke rettet" : "";
    return `${base}${note}${reason ? `. Begrundelse: ${reason}` : ""}`;
  }
  if (a.action === "repair_case_item_added") return `${name} tilføjet (${kr(d.unit_oere)})`;
  if (a.action === "repair_case_part_swapped") return "Del skiftet";
  return null;
}

export function buildTimeline(src: Source): TimelineItem[] {
  const items: TimelineItem[] = [];

  items.push({ id: "created", at: src.ticket.created_at, kind: "oprettet", text: "Sag oprettet" });

  for (const l of src.logs ?? []) {
    const text = l.old_status
      ? `Status: ${statusLabel(l.old_status).toLowerCase()} til ${statusLabel(l.new_status).toLowerCase()}`
      : `Status: ${statusLabel(l.new_status).toLowerCase()}`;
    items.push({ id: `log-${l.id}`, at: l.created_at, kind: "status", text: l.note ? `${text} (${l.note})` : text });
  }

  for (const s of src.sms ?? []) {
    items.push({
      id: `sms-${s.id}`,
      at: s.created_at,
      kind: "sms",
      text: s.status === "failed" ? `SMS kunne ikke sendes: ${clip(s.message)}` : `SMS sendt: ${clip(s.message)}`,
    });
  }

  for (const c of src.comments ?? []) {
    items.push({
      id: `comment-${c.id}`,
      at: c.created_at,
      kind: "kommentar",
      text: `${c.visibility === "kunde" ? "Kommentar til kunden" : "Intern kommentar"}: ${clip(c.message)}`,
      actor: c.author,
    });
  }

  (src.ticket.internal_notes ?? []).forEach((n, i) => {
    items.push({ id: `note-${i}`, at: n.timestamp, kind: "note", text: `Note: ${clip(n.text)}`, actor: n.author });
  });

  for (const q of src.quotes ?? []) {
    items.push({
      id: `quote-${q.id}-sent`,
      at: q.sent_at ?? q.created_at,
      kind: "tilbud",
      text: `Tilbud sendt: ${formatKrShort(Math.round(Number(q.price_dkk) * 100))}`,
    });
    if (q.accepted_at) items.push({ id: `quote-${q.id}-ok`, at: q.accepted_at, kind: "tilbud", text: "Tilbud godkendt af kunden" });
    if (q.declined_at) items.push({ id: `quote-${q.id}-no`, at: q.declined_at, kind: "tilbud", text: "Tilbud afslået af kunden" });
  }

  (src.deposits ?? []).forEach((d, i) => {
    items.push({
      id: `deposit-${i}`,
      at: d.paid_at,
      kind: "depositum",
      text: `Depositum ${formatKrShort(d.amount_oere)} betalt med ${methodLabel(d.method)}${d.receipt_no ? `, bon ${d.receipt_no}` : ""}`,
    });
  });

  for (const a of src.activity ?? []) {
    const text = activityText(a);
    if (!text) continue;
    items.push({ id: `activity-${a.id}`, at: a.created_at, kind: "linjer", text, actor: a.actor_name ?? null });
  }

  if (src.ticket.paid && src.ticket.paid_at) {
    items.push({ id: "paid", at: src.ticket.paid_at, kind: "betaling", text: "Sagen er betalt" });
  }

  return items
    .filter((i) => i.at && !Number.isNaN(new Date(i.at).getTime()))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id < b.id ? 1 : -1));
}
