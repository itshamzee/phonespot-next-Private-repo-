import { describe, it, expect } from "vitest";
import {
  decideFollowup,
  insideSendWindow,
  formatDanishDay,
  type FollowupOffer,
  type FollowupKind,
} from "../followup";

const H = 60 * 60 * 1000;
const D = 24 * H;
const sent0 = new Date("2026-11-10T10:00:00Z");

function offer(over: Partial<FollowupOffer> = {}): FollowupOffer {
  return {
    status: "pending",
    createdAt: sent0,
    tokenExpiresAt: new Date(sent0.getTime() + 7 * D),
    respondedAt: null,
    receivedAt: null,
    parcelMoving: false,
    customerRepliedAfterOffer: false,
    alreadySent: new Set<FollowupKind>(),
    ...over,
  };
}
const at = (ms: number) => new Date(sent0.getTime() + ms);

describe("decideFollowup — pending", () => {
  it("does nothing in the first 24 hours", () => {
    expect(decideFollowup(offer(), at(23 * H))).toBeNull();
  });

  it("sends the 24-hour reminder after a day", () => {
    expect(decideFollowup(offer(), at(25 * H))).toEqual({ kind: "reminder_24h", contact: true });
  });

  it("does not repeat the 24-hour reminder", () => {
    const o = offer({ alreadySent: new Set(["reminder_24h"]) });
    expect(decideFollowup(o, at(30 * H))).toBeNull();
  });

  it("sends the 72-hour reminder after three days", () => {
    const o = offer({ alreadySent: new Set(["reminder_24h"]) });
    expect(decideFollowup(o, at(73 * H))?.kind).toBe("reminder_72h");
  });

  it("skips straight to the 72-hour reminder for an offer found late", () => {
    expect(decideFollowup(offer(), at(4 * D))?.kind).toBe("reminder_72h");
    const o = offer({ alreadySent: new Set(["reminder_72h"]) });
    expect(decideFollowup(o, at(5 * D))).toBeNull();
  });

  it("does not remind when less than 12 hours are left", () => {
    expect(decideFollowup(offer(), at(7 * D - 6 * H))).toBeNull();
  });

  it("stops reminding once the customer has written to us", () => {
    expect(decideFollowup(offer({ customerRepliedAfterOffer: true }), at(4 * D))).toBeNull();
  });

  it("expires and offers a new bid right after the deadline", () => {
    expect(decideFollowup(offer(), at(7 * D + H))).toEqual({
      kind: "expired",
      markExpired: true,
      contact: true,
    });
  });

  it("closes long-expired backlog quietly", () => {
    expect(decideFollowup(offer(), at(20 * D))).toEqual({
      kind: "expired",
      markExpired: true,
      contact: false,
    });
  });

  it("expires without mail when the customer is already talking to us", () => {
    const d = decideFollowup(offer({ customerRepliedAfterOffer: true }), at(7 * D + H));
    expect(d).toEqual({ kind: "expired", markExpired: true, contact: false });
  });
});

describe("decideFollowup — accepted, not received", () => {
  const accepted = (over: Partial<FollowupOffer> = {}) =>
    offer({ status: "accepted", respondedAt: sent0, ...over });

  it("waits three days before nudging", () => {
    expect(decideFollowup(accepted(), at(2 * D))).toBeNull();
    expect(decideFollowup(accepted(), at(3 * D + H))?.kind).toBe("ship_3d");
  });

  it("nudges again after a week", () => {
    const o = accepted({ alreadySent: new Set(["ship_3d"]) });
    expect(decideFollowup(o, at(7 * D + H))?.kind).toBe("ship_7d");
    const done = accepted({ alreadySent: new Set(["ship_3d", "ship_7d"]) });
    expect(decideFollowup(done, at(20 * D))).toBeNull();
  });

  it("sends only the one-week nudge to an acceptance found late", () => {
    const o = accepted({ alreadySent: new Set(["ship_7d"]) });
    expect(decideFollowup(accepted(), at(10 * D))?.kind).toBe("ship_7d");
    expect(decideFollowup(o, at(11 * D))).toBeNull();
  });

  it("stays quiet once the parcel moves or the device has arrived", () => {
    expect(decideFollowup(accepted({ parcelMoving: true }), at(5 * D))).toBeNull();
    expect(decideFollowup(accepted({ receivedAt: at(D) }), at(5 * D))).toBeNull();
  });
});

describe("decideFollowup — closed offers", () => {
  it("ignores rejected and expired offers", () => {
    expect(decideFollowup(offer({ status: "rejected" }), at(4 * D))).toBeNull();
    expect(decideFollowup(offer({ status: "expired" }), at(4 * D))).toBeNull();
  });
});

describe("insideSendWindow", () => {
  it("is open 9–20 Copenhagen time", () => {
    // November: Copenhagen = UTC+1
    expect(insideSendWindow(new Date("2026-11-11T07:59:00Z"))).toBe(false); // 08:59
    expect(insideSendWindow(new Date("2026-11-11T08:00:00Z"))).toBe(true); // 09:00
    expect(insideSendWindow(new Date("2026-11-11T18:59:00Z"))).toBe(true); // 19:59
    expect(insideSendWindow(new Date("2026-11-11T19:00:00Z"))).toBe(false); // 20:00
  });
});

describe("formatDanishDay", () => {
  it("reads like Danish", () => {
    expect(formatDanishDay(new Date("2026-11-14T12:00:00Z"))).toBe("lørdag d. 14. november");
  });
});
