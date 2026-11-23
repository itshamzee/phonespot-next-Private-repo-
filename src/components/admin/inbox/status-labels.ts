/* ---------------------- statusser på dansk ---------------------- */

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Afventer betaling",
  confirmed: "Bekræftet",
  shipped: "Afsendt",
  picked_up: "Afhentet",
  delivered: "Leveret",
  cancelled: "Annulleret",
  refunded: "Refunderet",
};

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  ny: "Ny",
  besvaret: "Besvaret",
  venter_paa_svar: "Venter på svar",
  lukket: "Lukket",
};

/** Samme ord som opkøbssiden (OFFER_STATUS_CONFIG i admin/opkoeb/[id]/page.tsx, som ikke eksporteres). */
export const OFFER_STATUS_LABELS: Record<string, string> = {
  pending: "Afventer",
  accepted: "Accepteret",
  rejected: "Afvist",
  expired: "Udløbet",
};

/** Dansk etiket, eller null for en ukendt kode (den rå kode vises aldrig). */
export function statusLabel(map: Record<string, string>, code: string | null | undefined): string | null {
  return code && Object.prototype.hasOwnProperty.call(map, code) ? map[code] : null;
}
