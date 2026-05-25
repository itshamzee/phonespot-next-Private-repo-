import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all top-level imports that have side effects or external dependencies
vi.mock("@/lib/email/order-confirmation", () => ({
  sendOrderConfirmation: vi.fn(),
}));
vi.mock("@/lib/warranty/generate", () => ({
  generateWarrantiesForOrder: vi.fn(),
}));
vi.mock("@/lib/draft-orders/convert", () => ({
  convertDraftToOrder: vi.fn(),
}));
vi.mock("@/lib/notifications/pushover", () => ({
  notifyNewOrder: vi.fn(),
}));
vi.mock("@/lib/email/staff-order-notification", () => ({
  sendStaffOrderNotification: vi.fn(),
}));

const updates: Array<{ table: string; values: Record<string, unknown>; eq?: [string, unknown] }> = [];
const orderRow = {
  id: "order-1",
  status: "pending",
  recovery_token: null,
  order_items: [
    { id: "i-1", item_type: "device", device_id: "dev-1" },
    { id: "i-2", item_type: "sku_product", device_id: null },
  ],
};

vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from(table: string) {
      const builder = {
        select(_cols: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                single: async () => ({ data: orderRow, error: null }),
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          return {
            eq(col: string, val: unknown) {
              updates.push({ table, values, eq: [col, val] });
              return { error: null };
            },
            in(col: string, val: unknown) {
              updates.push({ table, values, eq: [col, val] });
              return { error: null };
            },
          };
        },
      };
      return builder;
    },
  }),
}));

import { handleCheckoutExpired } from "../webhook";

beforeEach(() => {
  updates.length = 0;
});

describe("handleCheckoutExpired", () => {
  it("marks the order abandoned (not cancelled) and sets a recovery_token", async () => {
    await handleCheckoutExpired({ metadata: { order_id: "order-1" } } as never);

    const orderUpdate = updates.find((u) => u.table === "orders");
    expect(orderUpdate).toBeDefined();
    expect(orderUpdate?.values.status).toBe("abandoned");
    expect(orderUpdate?.values.abandoned_at).toBeTypeOf("string");
    expect(orderUpdate?.values.recovery_token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("still releases device reservations", async () => {
    await handleCheckoutExpired({ metadata: { order_id: "order-1" } } as never);

    const deviceUpdate = updates.find((u) => u.table === "devices");
    expect(deviceUpdate).toBeDefined();
    expect(deviceUpdate?.values).toMatchObject({
      status: "listed",
      reservation_expires_at: null,
    });
  });

  it("does nothing when the order has no metadata.order_id", async () => {
    await handleCheckoutExpired({ metadata: {} } as never);
    expect(updates).toHaveLength(0);
  });
});
