// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";
import { computeFrisbiiSignature, verifyFrisbiiSignature } from "../frisbii/webhook-signature";
import { buildFrisbiiOrderLines, frisbiiHandle, sumOrderLines } from "../frisbii/checkout-session";
import { getCheckoutProvider, providerForOrder } from "../provider";
import type { ValidatedItem } from "@/lib/checkout/validate";

describe("Frisbii webhook-signatur", () => {
  const secret = "webhook_secret_test";
  const timestamp = "2026-11-03T12:00:00.000Z";
  const id = "wh_123";

  it("er hex(hmac_sha256(secret, timestamp + id))", () => {
    const expected = createHmac("sha256", secret).update(timestamp + id).digest("hex");
    expect(computeFrisbiiSignature(secret, timestamp, id)).toBe(expected);
  });

  it("accepterer korrekt signatur og afviser alt andet", () => {
    const signature = computeFrisbiiSignature(secret, timestamp, id);
    expect(verifyFrisbiiSignature({ timestamp, id, signature }, [secret])).toBe(true);
    expect(verifyFrisbiiSignature({ timestamp, id, signature }, ["forkert"])).toBe(false);
    expect(verifyFrisbiiSignature({ timestamp, id: "wh_124", signature }, [secret])).toBe(false);
    expect(verifyFrisbiiSignature({ timestamp, id, signature: "abc" }, [secret])).toBe(false);
    expect(verifyFrisbiiSignature({ timestamp, id }, [secret])).toBe(false);
    expect(verifyFrisbiiSignature({ timestamp, id, signature }, [undefined, ""])).toBe(false);
  });

  it("accepterer den forrige secret i overgangsperioden", () => {
    const signature = computeFrisbiiSignature("gammel", timestamp, id);
    expect(verifyFrisbiiSignature({ timestamp, id, signature }, [secret, "gammel"])).toBe(true);
  });
});

describe("Frisbii ordrelinjer", () => {
  const device = {
    item: {
      type: "device",
      deviceId: "d1",
      title: "iPhone 14",
      grade: "A",
      storage: "128 GB",
      color: "Sort",
      upgrades: [{ optionId: "u1", kind: "battery", label: "Nyt batteri", price: 39900 }],
    },
    serverPrice: 300000,
    available: true,
  } as unknown as ValidatedItem;
  const sku = {
    item: { type: "sku_product", skuProductId: "s1", title: "Cover", quantity: 3 },
    serverPrice: 10000,
    available: true,
  } as unknown as ValidatedItem;
  const unavailable = { ...sku, available: false } as ValidatedItem;

  it("summerer præcis til totalen med fragt, tilvalg og rabatter", () => {
    const lines = buildFrisbiiOrderLines({
      items: [device, sku, unavailable],
      shippingCost: 4900,
      discount: { code: "BLACK", type: "fixed", value: 5000, discountAmount: 5000 },
      discountAmount: 5000,
      bundleDiscountAmount: 10000,
    });
    const total = 300000 + 39900 + 3 * 10000 + 4900 - 5000 - 10000;
    expect(sumOrderLines(lines)).toBe(total);
    expect(lines.find((l) => l.ordertext === "Fragt")?.amount).toBe(4900);
    expect(lines[0].vat).toBe(0); // brugtmoms-enhed viser ikke moms
    expect(lines.at(-1)?.amount).toBe(-15000);
  });

  it("lægger ikke gratis fragt-koder ind som beløbsrabat", () => {
    const lines = buildFrisbiiOrderLines({
      items: [sku],
      shippingCost: 0,
      discount: { code: "FRAGTFRI", type: "free_shipping", value: 0, discountAmount: 0 },
      discountAmount: 999,
      bundleDiscountAmount: 0,
    });
    expect(sumOrderLines(lines)).toBe(30000);
  });

  it("bygger korte, gyldige handles", () => {
    expect(frisbiiHandle("S-1234")).toBe("S-1234");
    expect(frisbiiHandle("S-1234", "ab12")).toBe("S-1234-ab12");
    expect(frisbiiHandle("S 12/34")).toBe("S1234");
  });
});

describe("valg af udbyder", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("bruger Stripe som standard", () => {
    delete process.env.PAYMENT_PROVIDER;
    expect(getCheckoutProvider()).toBe("stripe");
  });

  it("falder tilbage til Stripe, hvis Frisbii-nøglen mangler", () => {
    process.env.PAYMENT_PROVIDER = "frisbii";
    delete process.env.FRISBII_PRIVATE_KEY;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(getCheckoutProvider()).toBe("stripe");
  });

  it("bruger Frisbii når flag og nøgle er sat", () => {
    process.env.PAYMENT_PROVIDER = "frisbii";
    process.env.FRISBII_PRIVATE_KEY = "priv_test";
    expect(getCheckoutProvider()).toBe("frisbii");
  });

  it("slår eksisterende ordrers udbyder op på payment_method", () => {
    expect(providerForOrder("frisbii")).toBe("frisbii");
    expect(providerForOrder("stripe")).toBe("stripe");
    expect(providerForOrder(null)).toBe("stripe");
  });
});

// ---------------------------------------------------------------------------
// Refundering og færdiggørelse (Frisbii-API og Supabase er mocket)
// ---------------------------------------------------------------------------

const m = vi.hoisted(() => ({
  getCharge: vi.fn(),
  cancelCharge: vi.fn(),
  createRefund: vi.fn(),
  settleCharge: vi.fn(),
  stripeRefund: vi.fn(),
  finalize: vi.fn(),
  pushover: vi.fn(async () => {}),
  order: null as Record<string, unknown> | null,
  inserted: [] as unknown[],
}));

vi.mock("../frisbii/client", async (orig) => {
  const actual = await orig<typeof import("../frisbii/client")>();
  return {
    ...actual,
    frisbii: {
      getCharge: m.getCharge,
      cancelCharge: m.cancelCharge,
      createRefund: m.createRefund,
      settleCharge: m.settleCharge,
      createChargeSession: vi.fn(),
    },
  };
});
vi.mock("@/lib/stripe/client", () => ({ stripe: { refunds: { create: m.stripeRefund } } }));
vi.mock("@/lib/checkout/finalize-order", () => ({ finalizeCheckoutOrder: m.finalize }));
vi.mock("@/lib/notifications/pushover", () => ({ sendPushover: m.pushover }));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: m.order }),
        insert: async (row: unknown) => {
          m.inserted.push(row);
          return { error: null };
        },
      };
      return q;
    },
  }),
}));

const charge = (over: Record<string, unknown> = {}) => ({
  handle: "S-1001",
  state: "settled",
  customer: "c1",
  amount: 50000,
  currency: "DKK",
  refunded_amount: 0,
  created: "",
  ...over,
});

describe("refundOrderPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refunderer Stripe-ordrer hos Stripe", async () => {
    const { refundOrderPayment } = await import("../refund");
    m.stripeRefund.mockResolvedValue({ id: "re_1", status: "succeeded", amount: 1000 });
    const r = await refundOrderPayment({ id: "o", total: 5000, payment_method: "stripe", stripe_payment_id: "pi_1" }, 1000);
    expect(m.stripeRefund).toHaveBeenCalledWith(expect.objectContaining({ payment_intent: "pi_1", amount: 1000 }), undefined);
    expect(r).toMatchObject({ provider: "stripe", refundId: "re_1" });
    expect(m.getCharge).not.toHaveBeenCalled();
  });

  it("annullerer en kun reserveret Frisbii-betaling ved fuld refundering", async () => {
    const { refundOrderPayment } = await import("../refund");
    m.getCharge.mockResolvedValue(charge({ state: "authorized", authorized_amount: 50000 }));
    const r = await refundOrderPayment({ id: "o", total: 50000, payment_method: "frisbii", stripe_payment_id: "S-1001" }, 50000);
    expect(m.cancelCharge).toHaveBeenCalledWith("S-1001");
    expect(m.createRefund).not.toHaveBeenCalled();
    expect(r).toMatchObject({ provider: "frisbii", amount: 50000 });
  });

  it("afviser delvis refundering af en reserveret Frisbii-betaling", async () => {
    const { refundOrderPayment, RefundError } = await import("../refund");
    m.getCharge.mockResolvedValue(charge({ state: "authorized", authorized_amount: 50000 }));
    await expect(
      refundOrderPayment({ id: "o", total: 50000, payment_method: "frisbii", stripe_payment_id: "S-1001" }, 1000),
    ).rejects.toBeInstanceOf(RefundError);
    expect(m.cancelCharge).not.toHaveBeenCalled();
  });

  it("refunderer en hævet Frisbii-betaling og fejler ved afvisning", async () => {
    const { refundOrderPayment, RefundError } = await import("../refund");
    m.getCharge.mockResolvedValue(charge());
    m.createRefund.mockResolvedValueOnce({ id: "rf_1", state: "refunded", amount: 1000 });
    const r = await refundOrderPayment({ id: "o", total: 50000, payment_method: "frisbii", stripe_payment_id: "S-1001" }, 1000);
    expect(m.createRefund).toHaveBeenCalledWith(expect.objectContaining({ invoice: "S-1001", amount: 1000 }));
    expect(r).toMatchObject({ refundId: "rf_1", pending: false });

    m.createRefund.mockResolvedValueOnce({ id: "rf_2", state: "failed", error: "declined" });
    await expect(
      refundOrderPayment({ id: "o", total: 50000, payment_method: "frisbii", stripe_payment_id: "S-1001" }, 1000),
    ).rejects.toBeInstanceOf(RefundError);
  });
});

describe("completeFrisbiiOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.order = {
      id: "order-1",
      order_number: "S-1001",
      status: "pending",
      total: 50000,
      payment_method: "frisbii",
      stripe_checkout_session_id: "cs_abc",
      stripe_payment_id: "S-1001",
    };
  });

  it("færdiggør ordren, når Frisbii bekræfter beløbet", async () => {
    const { completeFrisbiiOrder } = await import("../frisbii/order-payment");
    m.getCharge.mockResolvedValue(charge({ state: "authorized", authorized_amount: 50000 }));
    await expect(completeFrisbiiOrder("S-1001")).resolves.toBe("completed");
    expect(m.finalize).toHaveBeenCalledWith({ orderId: "order-1", sessionId: "cs_abc", paymentId: "S-1001" });
  });

  it("bekræfter ikke, hvis betalingen ikke er gennemført", async () => {
    const { completeFrisbiiOrder } = await import("../frisbii/order-payment");
    m.getCharge.mockResolvedValue(charge({ state: "failed" }));
    await expect(completeFrisbiiOrder("S-1001")).resolves.toBe("not_paid");
    m.getCharge.mockResolvedValue(null);
    await expect(completeFrisbiiOrder("S-1001")).resolves.toBe("not_paid");
    expect(m.finalize).not.toHaveBeenCalled();
  });

  it("bekræfter ikke og alarmerer, hvis beløbet ikke matcher ordren", async () => {
    const { completeFrisbiiOrder } = await import("../frisbii/order-payment");
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.getCharge.mockResolvedValue(charge({ amount: 100 }));
    await expect(completeFrisbiiOrder("S-1001")).resolves.toBe("amount_mismatch");
    expect(m.finalize).not.toHaveBeenCalled();
    expect(m.pushover).toHaveBeenCalled();
  });

  it("ignorerer ukendte handles", async () => {
    const { completeFrisbiiOrder } = await import("../frisbii/order-payment");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    m.order = null;
    await expect(completeFrisbiiOrder("R-1")).resolves.toBe("not_found");
    expect(m.getCharge).not.toHaveBeenCalled();
  });
});

describe("settleOrderPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.inserted = [];
    m.order = {
      id: "order-1",
      order_number: "S-1001",
      status: "shipped",
      total: 50000,
      payment_method: "frisbii",
      stripe_checkout_session_id: "cs_abc",
      stripe_payment_id: "S-1001",
    };
  });

  it("gør intet for Stripe-ordrer", async () => {
    const { settleOrderPayment } = await import("../frisbii/order-payment");
    m.order = { ...m.order, payment_method: "stripe", stripe_payment_id: "pi_1" };
    await expect(settleOrderPayment("order-1")).resolves.toEqual({ status: "skipped", reason: "not_frisbii" });
    expect(m.getCharge).not.toHaveBeenCalled();
  });

  it("hæver en reserveret betaling med idempotensnøgle", async () => {
    const { settleOrderPayment } = await import("../frisbii/order-payment");
    m.getCharge.mockResolvedValue(charge({ state: "authorized" }));
    m.settleCharge.mockResolvedValue(charge({ state: "settled" }));
    await expect(settleOrderPayment("order-1")).resolves.toEqual({ status: "settled" });
    expect(m.settleCharge).toHaveBeenCalledWith("S-1001", { key: "settle-S-1001" });
    expect(m.inserted).toHaveLength(1);
  });

  it("springer over, hvis den allerede er hævet", async () => {
    const { settleOrderPayment } = await import("../frisbii/order-payment");
    m.getCharge.mockResolvedValue(charge({ state: "settled" }));
    await expect(settleOrderPayment("order-1")).resolves.toMatchObject({ status: "skipped" });
    expect(m.settleCharge).not.toHaveBeenCalled();
  });

  it("kaster aldrig, men alarmerer ved afvisning", async () => {
    const { settleOrderPayment } = await import("../frisbii/order-payment");
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.getCharge.mockResolvedValue(charge({ state: "authorized" }));
    m.settleCharge.mockResolvedValue(charge({ state: "failed", error_state: "hard_declined" }));
    await expect(settleOrderPayment("order-1")).resolves.toMatchObject({ status: "failed" });
    m.getCharge.mockRejectedValue(new Error("netværk"));
    await expect(settleOrderPayment("order-1")).resolves.toMatchObject({ status: "failed" });
    expect(m.pushover).toHaveBeenCalledTimes(2);
  });
});
