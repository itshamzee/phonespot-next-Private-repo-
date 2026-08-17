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
const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
const orderRow = {
  id: "order-1",
  status: "pending",
  recovery_token: null,
  order_items: [
    { id: "i-1", item_type: "device", device_id: "dev-1" },
    { id: "i-2", item_type: "sku_product", device_id: null },
  ],
};

// Enhedens herkomst styrer, om lageret skal tilbage via increment_foxway_stock
// (dropship) eller via en direkte status='listed' (egen enhed).
let deviceRows: Array<{ id: string; source: string }> = [{ id: "dev-1", source: "internal" }];

vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    rpc(fn: string, args: Record<string, unknown>) {
      rpcCalls.push({ fn, args });
      return Promise.resolve({ data: 1, error: null });
    },
    from(table: string) {
      const builder = {
        select(_cols: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                single: async () => ({ data: orderRow, error: null }),
              };
            },
            in: async (_col: string, _vals: string[]) => ({ data: deviceRows, error: null }),
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
  rpcCalls.length = 0;
  deviceRows = [{ id: "dev-1", source: "internal" }];
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

  it("clears foxway_status/foxway_order_ref so the dropship queue drops the order", async () => {
    await handleCheckoutExpired({ metadata: { order_id: "order-1" } } as never);

    const orderUpdate = updates.find((u) => u.table === "orders");
    expect(orderUpdate?.values.foxway_status).toBeNull();
    expect(orderUpdate?.values.foxway_order_ref).toBeNull();
  });

  it("restores foxway stock via RPC instead of blindly re-listing the device", async () => {
    deviceRows = [{ id: "dev-1", source: "foxway" }];
    await handleCheckoutExpired({ metadata: { order_id: "order-1" } } as never);

    expect(rpcCalls).toEqual([
      { fn: "increment_foxway_stock", args: { p_device_id: "dev-1" } },
    ]);
    // Ingen blind status='listed' paa dropship-enheden — det er RPC'ens job.
    expect(updates.find((u) => u.table === "devices")).toBeUndefined();
  });

  it("does not call the foxway RPC for own-stock devices", async () => {
    await handleCheckoutExpired({ metadata: { order_id: "order-1" } } as never);
    expect(rpcCalls).toHaveLength(0);
  });

  it("does nothing when the order has no metadata.order_id", async () => {
    await handleCheckoutExpired({ metadata: {} } as never);
    expect(updates).toHaveLength(0);
  });
});
