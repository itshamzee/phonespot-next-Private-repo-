import { describe, expect, it } from "vitest";
import {
  TransferRuleError,
  applyReceipt,
  assertTransition,
  canActFor,
  canRequest,
  canSeeTransfer,
  isDeviceSellable,
  receiptProgress,
  remaining,
  transferPermissions,
  type MathLine,
} from "../rules";

const OWNER = { role: "owner", location_slug: null };
const VEJLE = { role: "employee", location_slug: "vejle" as const };
const SLAGELSE = { role: "manager", location_slug: "slagelse" as const };
const NOBODY = { role: "employee", location_slug: null };

const sent = (id: string, qty: number): MathLine => ({ id, sentQty: qty, receivedQty: 0, returnedQty: 0 });

function code(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof TransferRuleError ? e.code : "other";
  }
}

describe("state machine", () => {
  it("only a requested transfer can be sent", () => {
    expect(code(() => assertTransition("requested", "send"))).toBeNull();
    expect(code(() => assertTransition("sent", "send"))).toBe("not_requested");
    expect(code(() => assertTransition("received", "send"))).toBe("not_requested");
    expect(code(() => assertTransition("cancelled", "send"))).toBe("not_requested");
  });

  it("cannot receive before it is sent", () => {
    expect(code(() => assertTransition("requested", "receive"))).toBe("not_sent");
    expect(code(() => assertTransition("sent", "receive"))).toBeNull();
  });

  it("cannot receive twice, or receive/cancel something finished", () => {
    expect(code(() => assertTransition("received", "receive"))).toBe("already_received");
    expect(code(() => assertTransition("received", "cancel"))).toBe("already_received");
    expect(code(() => assertTransition("cancelled", "receive"))).toBe("cancelled");
    expect(code(() => assertTransition("cancelled", "cancel"))).toBe("cancelled");
  });

  it("can cancel while requested or sent", () => {
    expect(code(() => assertTransition("requested", "cancel"))).toBeNull();
    expect(code(() => assertTransition("sent", "cancel"))).toBeNull();
  });
});

describe("applyReceipt (stock math)", () => {
  it("full receipt completes the transfer and moves the whole quantity to the receiver", () => {
    const r = applyReceipt("sent", [sent("a", 2), sent("b", 1)], [
      { lineId: "a", qty: 2 },
      { lineId: "b", qty: 1 },
    ]);
    expect(r.status).toBe("received");
    expect(r.receiverDelta).toBe(3);
    expect(r.senderDelta).toBe(0);
    expect(r.lines.every((l) => remaining(l) === 0)).toBe(true);
  });

  it("partial receipt keeps the transfer open and only moves what was scanned", () => {
    const r = applyReceipt("sent", [sent("a", 5)], [{ lineId: "a", qty: 2 }]);
    expect(r.status).toBe("sent");
    expect(r.receiverDelta).toBe(2);
    expect(remaining(r.lines[0])).toBe(3);
    expect(receiptProgress(r.lines)).toEqual({ received: 2, sent: 5 });
  });

  it("a second scan session finishes the rest, and then a third is a double receive", () => {
    const first = applyReceipt("sent", [sent("a", 5)], [{ lineId: "a", qty: 2 }]);
    const second = applyReceipt(first.status, first.lines, [{ lineId: "a", qty: 3 }]);
    expect(second.status).toBe("received");
    expect(code(() => applyReceipt(second.status, second.lines, [{ lineId: "a", qty: 1 }]))).toBe("already_received");
  });

  it("refuses to receive more than was sent", () => {
    expect(code(() => applyReceipt("sent", [sent("a", 2)], [{ lineId: "a", qty: 3 }]))).toBe("over_receive");
    const first = applyReceipt("sent", [sent("a", 2)], [{ lineId: "a", qty: 2 }]);
    // same line again in the same still-open transfer (other line open)
    const open = applyReceipt("sent", [sent("a", 2), sent("b", 1)], [{ lineId: "a", qty: 2 }]);
    expect(first.status).toBe("received");
    expect(code(() => applyReceipt(open.status, open.lines, [{ lineId: "a", qty: 1 }]))).toBe("over_receive");
  });

  it("sums repeated scans of the same line before checking the limit", () => {
    const r = applyReceipt("sent", [sent("a", 3)], [
      { lineId: "a", qty: 1 },
      { lineId: "a", qty: 1 },
    ]);
    expect(r.receiverDelta).toBe(2);
    expect(code(() => applyReceipt("sent", [sent("a", 1)], [{ lineId: "a", qty: 1 }, { lineId: "a", qty: 1 }]))).toBe(
      "over_receive",
    );
  });

  it("rejects nothing-to-receive, unknown lines and non-positive quantities", () => {
    expect(code(() => applyReceipt("sent", [sent("a", 1)], []))).toBe("nothing_to_receive");
    expect(code(() => applyReceipt("sent", [sent("a", 1)], [{ lineId: "zzz", qty: 1 }]))).toBe("line_not_found");
    expect(code(() => applyReceipt("sent", [sent("a", 1)], [{ lineId: "a", qty: 0 }]))).toBe("invalid_quantity");
  });

  it("nothing is received before it is sent", () => {
    expect(code(() => applyReceipt("requested", [sent("a", 1)], [{ lineId: "a", qty: 1 }]))).toBe("not_sent");
  });

  it("closing short returns the rest to the sender and finishes the transfer", () => {
    const r = applyReceipt("sent", [sent("a", 5), sent("b", 1)], [{ lineId: "a", qty: 2 }], true);
    expect(r.status).toBe("received");
    expect(r.closedShort).toBe(true);
    expect(r.receiverDelta).toBe(2);
    expect(r.senderDelta).toBe(4); // 3 of a + 1 of b
    // conservation: every sent unit is either received or returned
    const total = 6;
    expect(r.receiverDelta + r.senderDelta).toBe(total);
  });

  it("closing short with nothing missing is a normal full receipt", () => {
    const r = applyReceipt("sent", [sent("a", 2)], [{ lineId: "a", qty: 2 }], true);
    expect(r.closedShort).toBe(false);
    expect(r.senderDelta).toBe(0);
  });

  it("can close short without scanning anything (nothing arrived)", () => {
    const r = applyReceipt("sent", [sent("a", 2)], [], true);
    expect(r.receiverDelta).toBe(0);
    expect(r.senderDelta).toBe(2);
    expect(r.status).toBe("received");
  });

  it("does not mutate its input", () => {
    const lines = [sent("a", 2)];
    applyReceipt("sent", lines, [{ lineId: "a", qty: 1 }]);
    expect(lines[0].receivedQty).toBe(0);
  });
});

describe("store scope rules", () => {
  it("staff act only for their own store; the owner for all", () => {
    expect(canActFor(VEJLE, "vejle")).toBe(true);
    expect(canActFor(VEJLE, "slagelse")).toBe(false);
    expect(canActFor(VEJLE, "webshop")).toBe(false);
    expect(canActFor(OWNER, "slagelse")).toBe(true);
    expect(canActFor(NOBODY, "vejle")).toBe(false);
    expect(canActFor(VEJLE, null)).toBe(false);
  });

  it("you request INTO your own store, from another one", () => {
    expect(canRequest(VEJLE, "slagelse", "vejle")).toBe(true);
    expect(canRequest(VEJLE, "vejle", "slagelse")).toBe(false); // cannot request on behalf of another store
    expect(canRequest(VEJLE, "vejle", "vejle")).toBe(false);
    expect(canRequest(OWNER, "slagelse", "vejle")).toBe(true);
    expect(canRequest(NOBODY, "slagelse", "vejle")).toBe(false);
  });

  it("only the sender can send, only the receiver can receive", () => {
    const requested = { status: "requested" as const, fromSlug: "vejle", toSlug: "slagelse" };
    expect(transferPermissions(VEJLE, requested)).toMatchObject({ send: true, receive: false, cancel: true });
    expect(transferPermissions(SLAGELSE, requested)).toMatchObject({ send: false, receive: false, cancel: true });

    const inTransit = { ...requested, status: "sent" as const };
    expect(transferPermissions(VEJLE, inTransit)).toMatchObject({ send: false, receive: false, cancel: true });
    expect(transferPermissions(SLAGELSE, inTransit)).toMatchObject({ send: false, receive: true, cancel: false });
    expect(transferPermissions(OWNER, inTransit)).toMatchObject({ receive: true, cancel: true });
  });

  it("cannot cancel a sent transfer once something has been received", () => {
    const partial = { status: "sent" as const, fromSlug: "vejle", toSlug: "slagelse", hasReceipts: true };
    expect(transferPermissions(VEJLE, partial).cancel).toBe(false);
  });

  it("finished transfers allow nothing", () => {
    for (const status of ["received", "cancelled"] as const) {
      expect(transferPermissions(OWNER, { status, fromSlug: "vejle", toSlug: "slagelse" })).toEqual({
        send: false,
        receive: false,
        cancel: false,
      });
    }
  });

  it("an uninvolved store cannot even see the transfer", () => {
    expect(canSeeTransfer(VEJLE, "slagelse", "webshop")).toBe(false);
    expect(canSeeTransfer(VEJLE, "slagelse", "vejle")).toBe(true);
    expect(canSeeTransfer(OWNER, "slagelse", "webshop")).toBe(true);
  });
});

describe("devices in transit", () => {
  it("are not sellable; only listed devices are", () => {
    expect(isDeviceSellable("in_transit")).toBe(false);
    expect(isDeviceSellable("listed")).toBe(true);
    for (const s of ["intake", "graded", "reserved", "sold", "shipped", "picked_up", "returned", "delisted"]) {
      expect(isDeviceSellable(s)).toBe(false);
    }
  });
});
