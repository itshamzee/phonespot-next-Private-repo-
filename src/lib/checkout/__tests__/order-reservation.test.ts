// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  stripe: vi.fn(),
  owner: vi.fn(),
  validation: vi.fn(),
  inserts: vi.fn(),
}));
vi.mock("@/lib/cart/reservation-owner", () => ({
  readReservationOwner: state.owner,
}));
vi.mock("@/lib/checkout/validate", () => ({
  validateCart: state.validation,
  hasFoxwayDevice: () => false,
}));
vi.mock("@/lib/checkout/discount", () => ({ validateDiscountCode: vi.fn() }));
vi.mock("@/lib/stripe/checkout-session", () => ({
  createCheckoutSession: state.stripe,
}));
vi.mock("@/lib/shipping", () => ({
  getShippingPrice: () => 0,
  getShippingOption: () => ({}),
  FREE_SHIPPING_THRESHOLD: 50000,
}));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    rpc: state.rpc,
    from: (table: string) => {
      let inserting = false;
      const q = {
        select: () => q,
        eq: () => q,
        like: () => q,
        order: () => q,
        limit: () => q,
        update: () => q,
        insert: (data: unknown) => {
          inserting = true;
          state.inserts(table, data);
          return q;
        },
        single: async () => ({
          data:
            table === "customers"
              ? { id: "customer" }
              : inserting
                ? { id: "order", order_number: "S-1001" }
                : null,
          error: null,
        }),
      };
      return q;
    },
  }),
}));
import { createOrder, type CreateOrderParams } from "../order";
import { POST } from "@/app/api/checkout/session/route";
const item = {
  type: "device" as const,
  deviceId: "device",
  templateId: "template",
  title: "Phone",
  grade: "A" as const,
  color: "Black",
  storage: "128GB",
  image: null,
  reservedAt: "",
  price: 100,
  reservationId: "client-forged",
  reservation_owner_hash: "client-forged",
};
const verified = {
  item,
  available: true,
  serverPrice: 30000,
  reservationId: "server-generation",
};
const customer = {
  name: "Fixture",
  email: "fixture@example.invalid",
  phone: "",
  address: { line1: "Test", city: "Test", postal_code: "1000", country: "DK" },
};
const params = {
  items: [verified],
  customer,
  discount: null,
  discountCodeId: null,
  shippingMethod: "pickup",
  shippingCost: 0,
  subtotal: 30000,
  discountAmount: 0,
  bundleDiscountAmount: 0,
  total: 30000,
  stripeCheckoutSessionId: "pending",
  foxwayPending: false,
} as CreateOrderParams;
beforeEach(() => {
  vi.clearAllMocks();
  state.owner.mockResolvedValue("cookie-hash");
  state.rpc.mockResolvedValue({ error: null });
  state.validation.mockResolvedValue({
    valid: true,
    items: [verified],
    errors: [],
  });
});
it("attaches only server-validated generation and cookie owner, never client fields", async () => {
  await createOrder(params);
  expect(state.rpc).toHaveBeenCalledWith(
    "attach_checkout_order_items",
    expect.objectContaining({
      p_owner_hash: "cookie-hash",
      p_items: [
        expect.objectContaining({
          reservation_id: "server-generation",
          unit_price: 30000,
        }),
      ],
    }),
  );
  expect(
    state.inserts.mock.calls.some(([table]) => table === "order_items"),
  ).toBe(false);
  expect(JSON.stringify(state.rpc.mock.calls)).not.toContain("client-forged");
});
it("does not manufacture reservation identity from a client item", async () => {
  await createOrder({
    ...params,
    items: [{ ...verified, reservationId: undefined }],
  } as CreateOrderParams);
  expect(state.rpc).toHaveBeenCalledWith(
    "attach_checkout_order_items",
    expect.objectContaining({
      p_owner_hash: null,
      p_items: [expect.objectContaining({ reservation_id: null })],
    }),
  );
});
it("fails order creation when binding loses a race", async () => {
  state.rpc.mockResolvedValue({ error: { message: "reservation conflict" } });
  await expect(createOrder(params)).rejects.toThrow("reservation conflict");
});
it("the unchanged session route never creates Stripe after attach failure", async () => {
  state.rpc.mockResolvedValue({ error: { message: "reservation conflict" } });
  const response = await POST(
    new NextRequest("https://example.invalid/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({
        items: [item],
        customer,
        shippingMethod: "pickup",
      }),
    }),
  );
  expect(response.status).toBe(500);
  expect(state.stripe).not.toHaveBeenCalled();
});
