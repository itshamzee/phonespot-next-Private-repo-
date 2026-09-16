// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: state.redirect }));
vi.mock("@/lib/stripe/client", () => ({
  stripe: { checkout: { sessions: { create: state.create } } },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: state.rpc,
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        update: (values: unknown) => {
          state.update(table, values);
          return q;
        },
        single: async () => ({
          data: {
            id: "order",
            order_number: "S-1001",
            status: "abandoned",
            total: 100,
            shipping_cost: 0,
            customer: { email: "fixture@example.invalid" },
            order_items: [],
          },
          error: null,
        }),
      };
      return q;
    },
  }),
}));
import RecoverCheckoutPage from "../[token]/page";
beforeEach(() => {
  vi.clearAllMocks();
  state.rpc.mockResolvedValue({ data: { status: "reserved" }, error: null });
  state.create.mockResolvedValue({
    id: "cs_recovered",
    url: "https://example.invalid/pay",
  });
});
it("verifies recovery token atomically before creating a session", async () => {
  await RecoverCheckoutPage({
    params: Promise.resolve({ token: "recovery-token" }),
  });
  expect(state.rpc).toHaveBeenCalledExactlyOnceWith("reserve_recovery_order", {
    p_order_id: "order",
    p_recovery_token: "recovery-token",
  });
  expect(state.create).toHaveBeenCalledTimes(1);
  expect(state.update).toHaveBeenCalledExactlyOnceWith(
    "orders",
    expect.objectContaining({
      stripe_checkout_session_id: "cs_recovered",
      status: "pending",
    }),
  );
  expect(state.redirect).toHaveBeenCalledWith("https://example.invalid/pay");
});
it.each([
  { data: { status: "unavailable" }, error: null },
  { data: null, error: { message: "offline" } },
])(
  "shows unavailable and creates no session when atomic reserve fails",
  async (result) => {
    state.rpc.mockResolvedValue(result);
    const page = await RecoverCheckoutPage({
      params: Promise.resolve({ token: "token" }),
    });
    expect(JSON.stringify(page)).toContain("ikke længere tilgængelig");
    expect(state.create).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
  },
);
