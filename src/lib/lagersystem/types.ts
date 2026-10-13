export type PartStatus = "pending" | "synced" | "failed";

/** Én række i repair_ticket_parts (se supabase/migrations/20261013_repair_ticket_parts.sql). */
export interface RepairPartRow {
  id: string;
  ticket_id: string;
  movement_type: "TAKE" | "RETURN";
  reverses_id: string | null;
  shared_sku: string;
  part_name: string;
  qty: number;
  location_code: string;
  cost_at_time_ore: number | null;
  status: PartStatus;
  movement_id: string | null;
  idempotency_key: string;
  actor_label: string;
  reference: string;
  created_by: string | null;
  created_at: string;
  voided_at: string | null;
  pending_since: string;
  attempts: number;
  last_attempt_at: string | null;
  last_error: string | null;
  synced_at: string | null;
}

export type NewRepairPartRow = Pick<
  RepairPartRow,
  | "id" | "ticket_id" | "movement_type" | "reverses_id" | "shared_sku" | "part_name" | "qty"
  | "location_code" | "cost_at_time_ore" | "idempotency_key" | "actor_label" | "reference" | "created_by"
>;

export interface TicketRef { id: string; store_id: string | null; ticket_number: string | null }

export interface RepairPartsRepo {
  getTicket(ticketId: string): Promise<TicketRef | null>;
  listForTicket(ticketId: string): Promise<RepairPartRow[]>;
  getPart(id: string): Promise<RepairPartRow | null>;
  findReturnFor(takeId: string): Promise<RepairPartRow | null>;
  /** "duplicate" ved unik-brud (idempotency_key eller en anden RETURN for samme TAKE). */
  insert(row: NewRepairPartRow, now: Date): Promise<RepairPartRow | "duplicate">;
  voidPart(id: string, now: Date): Promise<void>;
  /** Skjuler kun en række, der stadig er 'failed' og ikke allerede skjult. Returnerer om den blev skjult. */
  voidFailedPart(id: string, now: Date): Promise<boolean>;
  /** Kun fejlede rækker: tilbage til pending med nyt 24-timers vindue. */
  resetForRetry(id: string, now: Date): Promise<RepairPartRow | null>;
  /** Pending-rækker, ældste først, ikke forsøgt de sidste 30 sekunder. */
  listDue(limit: number, now: Date): Promise<RepairPartRow[]>;
  // markSynced, markAttemptFailed og markFailed virker KUN mens status='pending' (no-op ellers),
  // så en sen samtidig afsender (after() vs cron) aldrig kan vende en afsluttet række tilbage.
  markSynced(id: string, movementId: string, now: Date): Promise<void>;
  markAttemptFailed(row: RepairPartRow, error: string, now: Date): Promise<void>;
  markFailed(id: string, error: string, now: Date): Promise<void>;
}
