// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import {
  ManualTerminal,
  WorldlineTerminal,
  WORLDLINE_NOT_READY,
  captureCardPayments,
  getPaymentTerminal,
  paymentTerminalKind,
  refundCardPayments,
  terminalTransactionIds,
  type PaymentTerminal,
  type TerminalResult,
} from "../payment-terminal";
import { PosError } from "../errors";
import { terminalBodyExtras } from "../kasse-logic";

const ctx = { reference: "ref-12345678", locationSlug: "vejle" };

function fakeTerminal(results: TerminalResult[], refundResult: TerminalResult = { status: "approved" }) {
  const t = {
    kind: "worldline" as const,
    charge: vi.fn<PaymentTerminal["charge"]>(async () => results.shift() ?? { status: "error" }),
    refund: vi.fn<PaymentTerminal["refund"]>(async () => refundResult),
  };
  return t satisfies PaymentTerminal;
}

describe("provider selection", () => {
  it("defaults to manual; only an exact 'worldline' switches", () => {
    expect(paymentTerminalKind({})).toBe("manual");
    expect(paymentTerminalKind({ POS_TERMINAL_PROVIDER: "" })).toBe("manual");
    expect(paymentTerminalKind({ POS_TERMINAL_PROVIDER: "manual" })).toBe("manual");
    expect(paymentTerminalKind({ POS_TERMINAL_PROVIDER: "stripe" })).toBe("manual");
    expect(paymentTerminalKind({ POS_TERMINAL_PROVIDER: " Worldline " })).toBe("worldline");
    expect(getPaymentTerminal("vejle", {})).toBeInstanceOf(ManualTerminal);
    expect(getPaymentTerminal("vejle", { POS_TERMINAL_PROVIDER: "worldline" })).toBeInstanceOf(WorldlineTerminal);
  });
});

describe("manual terminal (today's flow)", () => {
  it("approves without a transaction id", async () => {
    const t = new ManualTerminal();
    expect(await t.charge()).toEqual({ status: "approved" });
    expect(await t.refund()).toEqual({ status: "approved" });
  });

  it("leaves the payment lines untouched (same objects, same payload)", async () => {
    const payments = [
      { type: "kontant", amountOere: 50_000 },
      { type: "kort_terminal", amountOere: 40_000 },
      { type: "kort_terminal", amountOere: 1_000, reference: "typed by hand" },
    ];
    const out = await captureCardPayments(new ManualTerminal(), payments, ctx);
    expect(out).toHaveLength(3);
    out.forEach((p, i) => expect(p).toBe(payments[i]));
    expect(out).toMatchInlineSnapshot(`
      [
        {
          "amountOere": 50000,
          "type": "kontant",
        },
        {
          "amountOere": 40000,
          "type": "kort_terminal",
        },
        {
          "amountOere": 1000,
          "reference": "typed by hand",
          "type": "kort_terminal",
        },
      ]
    `);
    expect(terminalTransactionIds(payments, out).size).toBe(0);

    const refunds = [{ type: "kort_terminal", amountOere: 9_000 }];
    const r = await refundCardPayments(new ManualTerminal(), refunds, ctx);
    expect(r[0]).toBe(refunds[0]);
  });

  it("adds nothing to the request body", () => {
    expect(terminalBodyExtras("manual", [{ type: "kort_terminal", amountOere: 100 }], "abc12345")).toEqual({});
    expect(terminalBodyExtras("worldline", [{ type: "kontant", amountOere: 100 }], "abc12345")).toEqual({});
    expect(terminalBodyExtras("worldline", [{ type: "kort_terminal", amountOere: 100 }], "abc12345")).toEqual({
      terminalReference: "abc12345",
    });
  });
});

describe("worldline stub", () => {
  it("returns a calm 'not set up' error for every operation", async () => {
    const t = new WorldlineTerminal("vejle");
    expect(await t.charge({ amountOere: 100, reference: "r", locationSlug: "vejle" })).toEqual({ status: "error", message: WORLDLINE_NOT_READY });
    expect(await t.refund({ amountOere: 100, reference: "r", locationSlug: "vejle" })).toMatchObject({ status: "error" });
    expect(await t.cancel({ reference: "r", locationSlug: "vejle" })).toMatchObject({ status: "error" });
  });

  it("makes a card sale fail with a PosError instead of approving it", async () => {
    const err = await captureCardPayments(new WorldlineTerminal("vejle"), [{ type: "kort_terminal", amountOere: 100 }], ctx).catch((e) => e);
    expect(err).toBeInstanceOf(PosError);
    expect(err.code).toBe("terminal_error");
    expect(err.status).toBe(503);
    expect(err.message).toBe("Worldline-terminal er ikke sat op endnu. Salget er ikke gemt.");
  });

  it("does not touch the terminal when there is no card line", async () => {
    const t = fakeTerminal([]);
    const payments = [{ type: "mobilepay", amountOere: 100 }];
    expect(await captureCardPayments(t, payments, ctx)).toEqual(payments);
    expect(t.charge).not.toHaveBeenCalled();
  });
});

describe("integrated terminal results", () => {
  it("saves the transaction id as the card line's reference", async () => {
    const t = fakeTerminal([{ status: "approved", transactionId: "WL-TX-1" }]);
    const payments = [
      { type: "kontant", amountOere: 500 },
      { type: "kort_terminal", amountOere: 1_500 },
    ];
    const out = await captureCardPayments(t, payments, ctx);
    expect(out).toEqual([
      { type: "kontant", amountOere: 500 },
      { type: "kort_terminal", amountOere: 1_500, reference: "WL-TX-1" },
    ]);
    expect(t.charge).toHaveBeenCalledWith({ amountOere: 1_500, reference: "ref-12345678:1", locationSlug: "vejle" });
    expect([...terminalTransactionIds(payments, out)]).toEqual(["WL-TX-1"]);
  });

  it("maps declined / cancelled to calm messages", async () => {
    const declined = await captureCardPayments(fakeTerminal([{ status: "declined" }]), [{ type: "kort_terminal", amountOere: 1 }], ctx).catch((e) => e);
    expect(declined.message).toBe("Kortet blev afvist på terminalen. Salget er ikke gemt.");
    const cancelled = await captureCardPayments(fakeTerminal([{ status: "cancelled" }]), [{ type: "kort_terminal", amountOere: 1 }], ctx).catch((e) => e);
    expect(cancelled.code).toBe("terminal_cancelled");
  });

  it("voids an earlier approved card line when a later one fails", async () => {
    const t = fakeTerminal([{ status: "approved", transactionId: "WL-A" }, { status: "declined" }]);
    const err = await captureCardPayments(
      t,
      [
        { type: "kort_terminal", amountOere: 100 },
        { type: "kort_terminal", amountOere: 200 },
      ],
      ctx,
    ).catch((e) => e);
    expect(err).toBeInstanceOf(PosError);
    expect(t.refund).toHaveBeenCalledTimes(1);
    expect(t.refund).toHaveBeenCalledWith(expect.objectContaining({ amountOere: 100, originalTransactionId: "WL-A" }));
  });

  it("refunds with the original transaction id when the sale had exactly one", async () => {
    const t = fakeTerminal([], { status: "approved", transactionId: "WL-R-9" });
    const out = await refundCardPayments(t, [{ type: "kort_terminal", amountOere: 9_000 }], { ...ctx, originalTransactionIds: ["WL-ORIG"] });
    expect(out).toEqual([{ type: "kort_terminal", amountOere: 9_000, reference: "WL-R-9" }]);
    expect(t.refund).toHaveBeenCalledWith(expect.objectContaining({ originalTransactionId: "WL-ORIG", amountOere: 9_000 }));

    const t2 = fakeTerminal([], { status: "approved" });
    await refundCardPayments(t2, [{ type: "kort_terminal", amountOere: 1 }], { ...ctx, originalTransactionIds: ["A", "B"] });
    expect(t2.refund.mock.calls[0][0]).not.toHaveProperty("originalTransactionId");
  });
});
