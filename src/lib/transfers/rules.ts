import { isOwner, normalizeScopeSlug, type ScopedStaff } from "@/lib/auth/store-scope";
import type { TransferStatus } from "./types";

/**
 * Overførslernes tilstandsmaskine og lagerregnskab som rene funktioner.
 * Postgres-funktionerne (20261004400100_stock_transfer_functions.sql) er sandheden
 * og håndhæver de samme regler atomisk; denne fil bruges til hurtige, pæne
 * fejlbeskeder i API'et, til scan-dialogen i UI'et og som eksekverbar spec i tests.
 */

export class TransferRuleError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 409,
  ) {
    super(message);
    this.name = "TransferRuleError";
  }
}

export type TransferAction = "send" | "receive" | "cancel";

export type LineCounts = { sentQty: number; receivedQty: number; returnedQty: number };

/** Antal der stadig er på vej for en linje. */
export function remaining(line: LineCounts): number {
  return line.sentQty - line.receivedQty - line.returnedQty;
}

/** Må handlingen udføres i den aktuelle status? Samme koder som SQL's transfer_fail. */
export function assertTransition(status: TransferStatus, action: TransferAction): void {
  if (action === "send") {
    if (status !== "requested") throw new TransferRuleError("not_requested", "Overførslen er ikke længere en åben anmodning.");
    return;
  }
  if (status === "received") throw new TransferRuleError("already_received", "Overførslen er allerede modtaget.");
  if (status === "cancelled") throw new TransferRuleError("cancelled", "Overførslen er annulleret.");
  if (action === "receive" && status !== "sent") {
    throw new TransferRuleError("not_sent", "Varerne er ikke sendt endnu. Afsenderen skal først pakke og sende.");
  }
}

/* ---------------------- butiksafgrænsning ---------------------- */

/** Må medarbejderen handle på vegne af butikken? Ejer: alle; ellers kun egen butik. */
export function canActFor(staff: ScopedStaff, slug: string | null | undefined): boolean {
  if (isOwner(staff)) return true;
  const own = normalizeScopeSlug(staff.location_slug);
  const target = normalizeScopeSlug(slug ?? null);
  return own !== null && own === target;
}

export type TransferSides = {
  status: TransferStatus;
  fromSlug: string | null;
  toSlug: string | null;
  hasReceipts?: boolean;
};

/** Man anmoder altid TIL sin egen butik (fra en anden). */
export function canRequest(staff: ScopedStaff, fromSlug: string | null, toSlug: string | null): boolean {
  if (!fromSlug || !toSlug || fromSlug === toSlug) return false;
  return canActFor(staff, toSlug);
}

export function transferPermissions(staff: ScopedStaff, t: TransferSides) {
  const sender = canActFor(staff, t.fromSlug);
  const receiver = canActFor(staff, t.toSlug);
  return {
    send: t.status === "requested" && sender,
    receive: t.status === "sent" && receiver,
    cancel: (t.status === "requested" && (sender || receiver)) || (t.status === "sent" && sender && !t.hasReceipts),
  };
}

/** Kan medarbejderen overhovedet se overførslen? (ejer: alle; ellers kun hvis egen butik er afsender/modtager) */
export function canSeeTransfer(staff: ScopedStaff, fromSlug: string | null, toSlug: string | null): boolean {
  return canActFor(staff, fromSlug) || canActFor(staff, toSlug);
}

/* ---------------------- modtagelse og lagerregnskab ---------------------- */

export type MathLine = LineCounts & { id: string };

export type ReceiveResult = {
  lines: MathLine[];
  status: TransferStatus;
  /** Lagerændring hos modtageren (antal enheder/stk. lagt til). */
  receiverDelta: number;
  /** Lagerændring hos afsenderen ved lukning med mangler (tilbage på lager). */
  senderDelta: number;
  closedShort: boolean;
};

/**
 * Anvend en (del)modtagelse. Spejler transfer_receive:
 *  - kun status 'sent', ingen overmodtagelse, qty > 0
 *  - lager flytter først nu; delmodtagelse lader overførslen stå som 'sent'
 *  - closeShort sender resten tilbage til afsenderen og lukker overførslen
 */
export function applyReceipt(
  status: TransferStatus,
  lines: MathLine[],
  scans: { lineId: string; qty: number }[],
  closeShort = false,
): ReceiveResult {
  assertTransition(status, "receive");
  if (scans.length === 0 && !closeShort) throw new TransferRuleError("nothing_to_receive", "Scan mindst én vare.", 400);

  const out = lines.map((l) => ({ ...l }));
  const totals = new Map<string, number>();
  for (const s of scans) totals.set(s.lineId, (totals.get(s.lineId) ?? 0) + s.qty);

  let receiverDelta = 0;
  for (const [lineId, qty] of totals) {
    const line = out.find((l) => l.id === lineId);
    if (!line) throw new TransferRuleError("line_not_found", "Varelinjen findes ikke på overførslen.", 404);
    if (!Number.isInteger(qty) || qty <= 0) throw new TransferRuleError("invalid_quantity", "Ugyldigt antal.", 400);
    if (line.receivedQty + line.returnedQty + qty > line.sentQty) {
      throw new TransferRuleError("over_receive", "Der er scannet flere end der er sendt.");
    }
    line.receivedQty += qty;
    receiverDelta += qty;
  }

  let senderDelta = 0;
  let closedShort = false;
  if (closeShort) {
    for (const line of out) {
      const rem = remaining(line);
      if (rem > 0) {
        line.returnedQty += rem;
        senderDelta += rem;
        closedShort = true;
      }
    }
  }
  const open = out.some((l) => remaining(l) > 0);
  return { lines: out, status: open ? "sent" : "received", receiverDelta, senderDelta, closedShort };
}

/** Samlet fremdrift til kortet, fx "2 af 5 modtaget". */
export function receiptProgress(lines: LineCounts[]): { received: number; sent: number } {
  return {
    received: lines.reduce((a, l) => a + l.receivedQty, 0),
    sent: lines.reduce((a, l) => a + l.sentQty, 0),
  };
}

/**
 * Må en enhed i den status sælges? Kun 'listed' (som pos_create_sale og
 * webshoppens reservation kræver). 'in_transit' kan hverken sælges eller reserveres.
 */
export function isDeviceSellable(status: string): boolean {
  return status === "listed";
}
