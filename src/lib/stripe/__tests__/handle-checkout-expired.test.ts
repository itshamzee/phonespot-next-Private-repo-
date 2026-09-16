// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state }));
vi.mock("@/lib/stripe/client", () => ({ stripe: {} }));
vi.mock("@/lib/email/order-confirmation", () => ({
  sendOrderConfirmation: vi.fn(),
}));
vi.mock("@/lib/warranty/generate", () => ({
  generateWarrantiesForOrder: vi.fn(),
}));
vi.mock("@/lib/draft-orders/convert", () => ({ convertDraftToOrder: vi.fn() }));
vi.mock("@/lib/notifications/pushover", () => ({ notifyNewOrder: vi.fn() }));
vi.mock("@/lib/email/staff-order-notification", () => ({
  sendStaffOrderNotification: vi.fn(),
}));
import { handleCheckoutExpired } from "../webhook";
const session = { id: "cs_expired", metadata: { order_id: "order" } } as never;
beforeEach(() => {
  vi.clearAllMocks();
  state.rpc.mockResolvedValue({ data: { status: "expired" }, error: null });
});
it("delegates expiry and stock release to one session-bound transaction", async () => {
  await handleCheckoutExpired(session);
  expect(state.rpc).toHaveBeenCalledExactlyOnceWith("expire_checkout_order", {
    p_order_id: "order",
    p_session_id: "cs_expired",
  });
  expect(state.from).not.toHaveBeenCalled();
});
it("does not release stock when the database ignores a paid or stale session", async () => {
  state.rpc.mockResolvedValue({ data: { status: "ignored" }, error: null });
  await handleCheckoutExpired(session);
  expect(state.rpc).toHaveBeenCalledTimes(1);
  expect(state.from).not.toHaveBeenCalled();
});
it("throws transaction errors for webhook retry", async () => {
  state.rpc.mockResolvedValue({ data: null, error: { message: "offline" } });
  await expect(handleCheckoutExpired(session)).rejects.toThrow(
    "expiry transaction",
  );
});
it("ignores sessions outside the order flow", async () => {
  await handleCheckoutExpired({ metadata: {} } as never);
  expect(state.rpc).not.toHaveBeenCalled();
});
