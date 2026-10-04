import { createServerClient } from "@/lib/supabase/client";
import { SCOPE_LABELS, slugForLocationId } from "@/lib/auth/store-scope";
import { loadLocationIndex } from "@/lib/auth/store-scope-server";
import { summarizeLines } from "./format";

export type PendingTransferItem = {
  id: string;
  number: number;
  status: "requested" | "sent";
  fromName: string;
  toName: string;
  /** Fx "2× USB-C kabel 1 m". */
  summary: string;
  /** Hvornår anmodningen blev oprettet / varen blev sendt. */
  at: string;
};

export type PendingTransfers = {
  /** På vej TIL butikken (anmodet eller sendt, ikke modtaget endnu). */
  incoming: {
    count: number;
    /** Sendt og venter på at butikken scanner den ind. */
    toReceive: number;
    items: PendingTransferItem[];
  };
  /** På vej FRA butikken (butikken skal pakke og sende, eller er sendt). */
  outgoing: {
    count: number;
    /** Anmodet og venter på at butikken pakker og sender. */
    toSend: number;
    items: PendingTransferItem[];
  };
};

const ITEM_LIMIT = 10;

type Header = {
  id: string;
  number: number;
  status: "requested" | "sent";
  from_location_id: string;
  to_location_id: string;
  requested_at: string;
  sent_at: string | null;
};

/**
 * Åbne overførsler til/fra en butik, til oversigten.
 *  - locationId (locations.id): incoming = åbne overførsler TIL butikken, outgoing = FRA butikken.
 *  - 'alle' (ejerens samlede overblik): incoming = alle SENDTE (venter på modtager),
 *    outgoing = alle ANMODEDE (venter på afsender). toReceive/toSend er derfor lig count.
 * Serverkode: kalderen er ansvarlig for at medarbejderen må se butikken.
 */
export async function getPendingTransfers(
  locationId: string | "alle",
  db: ReturnType<typeof createServerClient> = createServerClient(),
): Promise<PendingTransfers> {
  let query = db
    .from("stock_transfers")
    .select("id, number, status, from_location_id, to_location_id, requested_at, sent_at")
    .in("status", ["requested", "sent"])
    .order("requested_at", { ascending: false })
    .limit(200);
  if (locationId !== "alle") query = query.or(`from_location_id.eq.${locationId},to_location_id.eq.${locationId}`);
  const { data, error } = await query;
  if (error) throw new Error(`pending transfers lookup failed: ${error.message}`);
  const headers = (data ?? []) as Header[];

  const incomingHeaders = headers.filter((h) => (locationId === "alle" ? h.status === "sent" : h.to_location_id === locationId));
  const outgoingHeaders = headers.filter((h) =>
    locationId === "alle" ? h.status === "requested" : h.from_location_id === locationId,
  );

  const shown = [...incomingHeaders.slice(0, ITEM_LIMIT), ...outgoingHeaders.slice(0, ITEM_LIMIT)];
  const linesByTransfer = new Map<string, { description: string; qty: number; sentQty: number }[]>();
  if (shown.length > 0) {
    const { data: lineData } = await db
      .from("stock_transfer_lines")
      .select("transfer_id, description, qty, sent_qty")
      .in("transfer_id", [...new Set(shown.map((h) => h.id))]);
    for (const l of (lineData ?? []) as { transfer_id: string; description: string; qty: number; sent_qty: number }[]) {
      const arr = linesByTransfer.get(l.transfer_id) ?? [];
      arr.push({ description: l.description, qty: l.qty, sentQty: l.sent_qty });
      linesByTransfer.set(l.transfer_id, arr);
    }
  }

  const index = await loadLocationIndex();
  const name = (id: string) => {
    const slug = slugForLocationId(index, id);
    return slug ? SCOPE_LABELS[slug] : "Ukendt butik";
  };
  const toItem = (h: Header): PendingTransferItem => ({
    id: h.id,
    number: h.number,
    status: h.status,
    fromName: name(h.from_location_id),
    toName: name(h.to_location_id),
    summary: summarizeLines(linesByTransfer.get(h.id) ?? []),
    at: h.status === "sent" && h.sent_at ? h.sent_at : h.requested_at,
  });

  return {
    incoming: {
      count: incomingHeaders.length,
      toReceive: incomingHeaders.filter((h) => h.status === "sent").length,
      items: incomingHeaders.slice(0, ITEM_LIMIT).map(toItem),
    },
    outgoing: {
      count: outgoingHeaders.length,
      toSend: outgoingHeaders.filter((h) => h.status === "requested").length,
      items: outgoingHeaders.slice(0, ITEM_LIMIT).map(toItem),
    },
  };
}
