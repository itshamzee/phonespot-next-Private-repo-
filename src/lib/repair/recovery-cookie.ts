/** Gendannelsesnøglen efter afbrudt Stripe-betaling ligger i en HttpOnly-cookie, ikke i adressen. */
export const RECOVERY_COOKIE = "ps_repair_recovery";

export function encodeRecoveryCookie(ticketId: string, token: string): string {
  return `${ticketId}.${token}`;
}

/** Nøglen til netop denne sag, eller undefined hvis cookien mangler eller gælder en anden sag. */
export function recoveryTokenFromCookie(value: string | undefined, ticketId: unknown): string | undefined {
  if (!value || typeof ticketId !== "string" || !ticketId) return undefined;
  const dot = value.indexOf(".");
  if (dot <= 0) return undefined;
  return value.slice(0, dot) === ticketId ? value.slice(dot + 1) : undefined;
}
