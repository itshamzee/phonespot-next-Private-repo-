/** Bilag A (API-kontrakt v1) — bindende. Ret ikke her uden at kontrakten ændres. */
export type MovementType = "TAKE" | "RETURN" | "RECEIVE" | "COUNT" | "WRITE_OFF";

export type Part = {
  shared_sku: string; name: string; category: string | null; quality: string | null;
  device_models: string[]; cost_price_ore: number | null; active: boolean;
};
export type Location = { code: string; name: string; type: "HUB" | "STORE"; company: string | null };
export type Balance = { shared_sku: string; qty: number; updated_at: string };
export type BalancesResponse = { location: string; as_of: string; balances: Balance[] };
export type Movement = {
  id: string; location: string; shared_sku: string; type: MovementType | "OPENING";
  /** Med fortegn, faktisk ændring. */
  qty: number; balance_after: number; company: string; reference: string | null;
  actor_label: string; created_at: string;
};

export type TransferStatus = "REQUESTED" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "REJECTED" | "CANCELLED";
export type TransferLine = {
  shared_sku: string; part_name: string; qty_requested: number; qty_sent: number | null;
  qty_received: number; qty_written_off: number; write_off_reason: string | null;
  unit_cost_ore: number | null;
};
export type Transfer = {
  id: string; from: string; to: string; requested_by_company: string; status: TransferStatus;
  reference: string | null; note: string | null; reject_reason: string | null;
  requested_by_label: string; sent_by_label: string | null; received_by_label: string | null;
  created_at: string; sent_at: string | null; received_at: string | null; lines: TransferLine[];
};
export type Availability = { location: string; location_name: string; qty: number };

export type ApiErrorCode =
  | "unauthorized" | "forbidden_location" | "unknown_part" | "unknown_location"
  | "invalid_body" | "idempotency_conflict" | "invalid_state" | "unknown_transfer" | "internal";
export type ApiError = { error: { code: ApiErrorCode; message: string } };

export type MovementInput = {
  idempotency_key: string;
  location: string;
  shared_sku: string;
  type: MovementType;
  /** Altid positiv; for COUNT det optalte antal (0–10000). */
  qty: number;
  actor_label: string;
  reference?: string | null;
  supplier?: string;
  cost_price_ore?: number;
};
export type MovementResult = { movement: Movement; replayed: boolean };

export type CreateTransferInput = {
  idempotency_key: string; from: string; to: string; lines: { shared_sku: string; qty: number }[];
  reference?: string | null; note?: string | null; actor_label: string;
};
export type SendTransferInput = { actor_label: string; lines?: { shared_sku: string; qty_sent: number }[] };
export type ReceiveTransferInput = {
  actor_label: string;
  /** Én pr. modtagelse; genbruges ved retry af samme modtagelse (Bilag A). */
  idempotency_key?: string;
  lines: { shared_sku: string; qty_received: number; qty_written_off?: number; write_off_reason?: string }[];
};
export type TransferResult = { transfer: Transfer; replayed?: boolean };
