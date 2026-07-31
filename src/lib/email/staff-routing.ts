import { STORES } from "@/lib/store-config";
import { normalizeStoreId } from "@/lib/stores";

export const CENTRAL_INBOX = "info@phonespot.dk";

export interface StaffRecipients {
  to: string;
  bcc?: string[];
}

/**
 * Which mailbox a customer enquiry belongs in.
 *
 * A known store gets its own mailbox as `to` with the central inbox as `bcc` —
 * BCC rather than a second `to` so the primary delivery still lands if the
 * central inbox is blocked at the provider. (info@phonespot.dk has been
 * suppressed at Resend since a hard bounce on 2026-04-17, which silently drops
 * the copy until it is cleared in the dashboard. The store mailbox is
 * unaffected.)
 *
 * No store, or one we do not recognise, goes to the central inbox alone —
 * copying it to itself would just duplicate the mail.
 */
export function getStaffRecipients(storeId?: string | null): StaffRecipients {
  const slug = normalizeStoreId(storeId);
  const to = slug ? STORES[slug].email : CENTRAL_INBOX;
  return to === CENTRAL_INBOX ? { to } : { to, bcc: [CENTRAL_INBOX] };
}
