// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const s = vi.hoisted(() => ({
  result: "stock_failed",
  error: false,
  missing: false,
  readError: false,
  orderStatus: "pending",
  rpc: vi.fn(),
  update: vi.fn(),
  mail: vi.fn(),
  warranty: vi.fn(),
  notify: vi.fn(),
  staff: vi.fn(),
  draft: vi.fn(),
  lineItems: vi.fn(),
  items: [] as Array<Record<string, unknown>>,
}));
vi.mock("@/lib/stripe/client", () => ({
  stripe: { checkout: { sessions: { listLineItems: s.lineItems } } },
}));
vi.mock("@/lib/email/order-confirmation", () => ({
  sendOrderConfirmation: s.mail,
}));
vi.mock("@/lib/warranty/generate", () => ({
  generateWarrantiesForOrder: s.warranty,
}));
vi.mock("@/lib/draft-orders/convert", () => ({ convertDraftToOrder: s.draft }));
vi.mock("@/lib/notifications/pushover", () => ({ notifyNewOrder: s.notify }));
vi.mock("@/lib/email/staff-order-notification", () => ({
  sendStaffOrderNotification: s.staff,
}));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    rpc: s.rpc,
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        in: async () => ({ data: [] }),
        update: s.update,
        single: async () => ({
          data: s.missing
            ? null
            : table === "orders"
              ? {
                  id: "order",
                  order_number: "S-1001",
                  status: s.orderStatus,
                  order_items: s.items,
                  total: 100,
                }
              : table === "customers"
                ? { name: "Fixture", email: "fixture@example.invalid" }
                : null,
          error: s.readError ? { message: "offline" } : null,
        }),
      };
      s.update.mockReturnValue(q);
      return q;
    },
  }),
}));
import { handleCheckoutCompleted } from "../webhook";
const session = {
  id: "cs_test",
  payment_intent: "pi_test",
  metadata: { order_id: "order" },
} as never;
beforeEach(() => {
  vi.clearAllMocks();
  s.result = "stock_failed";
  s.error = false;
  s.missing = false;
  s.readError = false;
  s.orderStatus = "pending";
  s.items = [
    {
      id: "line-device",
      item_type: "device",
      device_id: "device",
      quantity: 1,
      unit_price: 30000,
    },
  ];
  s.lineItems.mockResolvedValue({ data: [] });
  s.rpc.mockImplementation(async () => ({
    data: { status: s.result, code: "insufficient_stock" },
    error: s.error ? {} : null,
  }));
});
function noSuccess() {
  for (const fn of [s.mail, s.notify, s.warranty, s.staff, s.update])
    expect(fn).not.toHaveBeenCalled();
}
it("stock failure rejects without confirmation, warranty or success notifications", async () => {
  await expect(handleCheckoutCompleted(session)).rejects.toThrow();
  noSuccess();
});
it.each(["already_completed", "already_finalized"])(
  "database-authorized replay skips side effects: %s",
  async (result) => {
    s.result = result;
    s.orderStatus = "confirmed";
    await handleCheckoutCompleted(session);
    expect(s.rpc).toHaveBeenCalledTimes(1);
    noSuccess();
  },
);
it("only the winning completion runs downstream once", async () => {
  s.result = "completed";
  await handleCheckoutCompleted(session);
  for (const fn of [s.notify, s.mail, s.staff, s.warranty])
    expect(fn).toHaveBeenCalledTimes(1);
  expect(s.rpc).toHaveBeenCalledExactlyOnceWith(
    "complete_checkout_order",
    expect.objectContaining({
      p_order_id: "order",
      p_session_id: "cs_test",
      p_payment_id: "pi_test",
    }),
  );
  expect(s.update).not.toHaveBeenCalled();
  s.result = "already_completed";
  await handleCheckoutCompleted(session);
  for (const fn of [s.notify, s.mail, s.staff, s.warranty])
    expect(fn).toHaveBeenCalledTimes(1);
});
it.each(["missing", "readError"] as const)(
  "order read failure is retriable: %s",
  async (field) => {
    s[field] = true;
    await expect(handleCheckoutCompleted(session)).rejects.toThrow();
    noSuccess();
  },
);
it("RPC error is retriable", async () => {
  s.error = true;
  await expect(handleCheckoutCompleted(session)).rejects.toThrow();
  noSuccess();
});
it("passes verified battery line IDs to the stock transaction before finalization", async () => {
  s.result = "completed";
  s.lineItems.mockResolvedValue({
    data: [
      {
        price: {
          product: {
            metadata: {
              kind: "battery-upgrade",
              parent_item_key: "device:device",
            },
          },
        },
      },
    ],
  });
  await handleCheckoutCompleted(session);
  expect(s.rpc).toHaveBeenCalledWith(
    "complete_checkout_order",
    expect.objectContaining({ p_battery_item_ids: ["line-device"] }),
  );
  expect(s.mail.mock.calls[0][0].items[0].batteryUpgrade).toBe(true);
  expect(s.update).not.toHaveBeenCalled();
});
it("multiple SKU lines use one stock transaction and no old decrement RPC", async () => {
  s.result = "completed";
  s.items = [1, 2].map((n) => ({
    id: `line-${n}`,
    item_type: "sku_product",
    sku_product_id: "sku",
    quantity: 1,
    unit_price: 100,
  }));
  await handleCheckoutCompleted(session);
  expect(s.rpc).toHaveBeenCalledTimes(1);
  expect(s.rpc.mock.calls[0][0]).toBe("complete_checkout_order");
});
it("preserves the draft conversion branch", async () => {
  await handleCheckoutCompleted({
    metadata: { draft_order_id: "draft" },
  } as never);
  expect(s.draft).toHaveBeenCalledExactlyOnceWith("draft");
  expect(s.rpc).not.toHaveBeenCalled();
  expect(s.lineItems).not.toHaveBeenCalled();
  noSuccess();
});
