import type { ScopeSlug } from "@/lib/auth/store-scope";

export type TransferStatus = "requested" | "sent" | "received" | "cancelled";

export type TransferLine = {
  id: string;
  skuProductId: string | null;
  deviceId: string | null;
  /** Anmodet enhedsgruppe (løses til konkrete enheder ved afsendelse). */
  templateId: string | null;
  storage: string | null;
  grade: string | null;
  description: string;
  qty: number;
  sentQty: number;
  receivedQty: number;
  returnedQty: number;
  /** Koder man kan scanne ved modtagelse: IMEI, stregkode, serienummer, EAN. */
  codes: string[];
  imei: string | null;
};

export type TransferLocation = { id: string; slug: ScopeSlug | null; name: string };

export type Transfer = {
  id: string;
  number: number;
  status: TransferStatus;
  from: TransferLocation;
  to: TransferLocation;
  note: string | null;
  requestedAt: string;
  requestedByName: string | null;
  sentAt: string | null;
  sentByName: string | null;
  receivedAt: string | null;
  receivedByName: string | null;
  cancelledAt: string | null;
  closedShort: boolean;
  lines: TransferLine[];
  /** Hvad den aktuelle medarbejder må gøre; beregnes på serveren. */
  can: { send: boolean; receive: boolean; cancel: boolean };
};

/** Linje i en ny anmodning. */
export type RequestLineInput =
  | { skuProductId: string; qty: number }
  | { deviceId: string }
  | { templateId: string; storage: string | null; grade: string; qty: number };
