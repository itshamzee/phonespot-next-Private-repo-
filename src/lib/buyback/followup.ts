/**
 * When does a buyback offer get a follow-up, and which one.
 *
 * Pure: the runner (followup-run.ts) loads the rows and sends; this file only
 * decides. One follow-up per offer per run, and never the same kind twice. A
 * later step supersedes an earlier one that was never sent, so an offer that
 * has been silent for five days gets the 72-hour reminder, not both.
 *
 * Measured from the moment the offer was sent (created_at) and the moment the
 * customer accepted (responded_at).
 */

export type FollowupKind =
  | "reminder_24h"
  | "reminder_72h"
  | "expired"
  | "ship_3d"
  | "ship_7d";

export interface FollowupOffer {
  status: string; // pending | accepted | rejected | expired
  createdAt: Date;
  tokenExpiresAt: Date | null;
  respondedAt: Date | null;
  receivedAt: Date | null;
  /** The parcel is moving or has arrived; nobody needs reminding to send it. */
  parcelMoving: boolean;
  /** The customer wrote to us after the offer went out. A person answers that. */
  customerRepliedAfterOffer: boolean;
  alreadySent: ReadonlySet<FollowupKind>;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Expired longer ago than this when we first see it: close quietly, no mail. */
export const EXPIRED_MAIL_WINDOW_MS = 3 * DAY;

export interface FollowupDecision {
  kind: FollowupKind;
  /** pending → expired is a status change, made whether or not a mail goes out. */
  markExpired?: boolean;
  /** false = record the step but do not contact the customer (old backlog). */
  contact: boolean;
}

export function decideFollowup(offer: FollowupOffer, now: Date): FollowupDecision | null {
  const sent = offer.alreadySent;
  const t = now.getTime();

  if (offer.status === "pending") {
    const expiresAt = offer.tokenExpiresAt?.getTime() ?? offer.createdAt.getTime() + 7 * DAY;

    if (t >= expiresAt) {
      if (sent.has("expired")) return null;
      const recentlyExpired = t - expiresAt <= EXPIRED_MAIL_WINDOW_MS;
      return {
        kind: "expired",
        markExpired: true,
        contact: recentlyExpired && !offer.customerRepliedAfterOffer,
      };
    }

    if (offer.customerRepliedAfterOffer) return null;

    const age = t - offer.createdAt.getTime();
    const left = expiresAt - t;

    // The second reminder says "udløber [dag]", so it needs a day left to be true.
    if (age >= 72 * HOUR && left >= 12 * HOUR && !sent.has("reminder_72h")) {
      return { kind: "reminder_72h", contact: true };
    }
    if (
      age >= 24 * HOUR &&
      left >= 12 * HOUR &&
      !sent.has("reminder_24h") &&
      !sent.has("reminder_72h")
    ) {
      return { kind: "reminder_24h", contact: true };
    }
    return null;
  }

  if (offer.status === "accepted") {
    if (offer.receivedAt || offer.parcelMoving || !offer.respondedAt) return null;
    if (offer.customerRepliedAfterOffer) return null;

    const sinceAccept = t - offer.respondedAt.getTime();
    if (sinceAccept >= 7 * DAY && !sent.has("ship_7d")) {
      return { kind: "ship_7d", contact: true };
    }
    if (sinceAccept >= 3 * DAY && !sent.has("ship_3d") && !sent.has("ship_7d")) {
      return { kind: "ship_3d", contact: true };
    }
    return null;
  }

  return null;
}

/**
 * Customers are contacted between 9 and 20 Danish time. A reminder at 3 am is
 * worse than one six hours late.
 */
export function insideSendWindow(now: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("da-DK", {
      timeZone: "Europe/Copenhagen",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  return hour >= 9 && hour < 20;
}

/** "fredag d. 14. november" */
export function formatDanishDay(d: Date): string {
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(d)
    .replace(/^(\p{L}+) (\d+)\./u, "$1 d. $2.");
}
