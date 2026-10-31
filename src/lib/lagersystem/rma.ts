import type { RmaItem, RmaStatus } from "./api-types";

/** Reklamationer til leverandør (spec §3.6). Ren modul — må bruges i klientkomponenter. */
export const RMA_STATUS_LABELS: Record<RmaStatus, string> = {
  REGISTERED: "Registreret",
  SENT: "Sendt til leverandør",
  CREDITED: "Krediteret",
  REPLACED: "Erstattet",
  REJECTED: "Afvist",
};
export const OPEN_RMA_STATUSES: RmaStatus[] = ["REGISTERED", "SENT"];
export const RMA_INVALID_STATE_TEXT = "Reklamationen har ændret status. Genindlæs siden og prøv igen.";

export function isRmaStatus(v: unknown): v is RmaStatus {
  return typeof v === "string" && v in RMA_STATUS_LABELS;
}

/** Spec §3.6: alle lister viser "Fundet af: …" (firma, og for PhoneSpot butikken). */
export function foundByText(item: Pick<RmaItem, "found_by_label">): string {
  return `Fundet af: ${item.found_by_label}`;
}

/** REGISTERED → SENT → afsluttet; REGISTERED kan også afsluttes direkte. */
export function rmaActions(status: RmaStatus): { send: boolean; resolve: boolean } {
  return { send: status === "REGISTERED", resolve: status === "REGISTERED" || status === "SENT" };
}

/** Én reklamation pr. del på en sag — et dobbeltklik giver replay, ikke to reklamationer. */
export const rmaKeyForTicketPart = (ticketId: string, partId: string) => `repair:${ticketId}:defect:${partId}`;
