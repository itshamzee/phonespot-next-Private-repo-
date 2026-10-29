// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/stripe/client", () => ({ stripe: { coupons: { create } } }));

import { buildDiscountCoupons } from "../checkout-session";

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue({ id: "cp_1" });
});

describe("buildDiscountCoupons", () => {
  it("lægger rabatkode og 3 for 2 i én kupon med amount_off", async () => {
    const ids = await buildDiscountCoupons(
      { code: "TI", type: "percentage", value: 10, discountAmount: 3000 },
      3000,
      10000,
    );
    expect(ids).toHaveLength(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount_off: 13000,
        currency: "dkk",
        name: "Rabatkode: TI + Lagersalg 3 for 2",
        metadata: { discount_code: "TI", bundle_discount: "lagersalg_3for2" },
      }),
    );
    expect(create.mock.calls[0][0]).not.toHaveProperty("percent_off");
  });
  it("kun rabatkode", async () => {
    await buildDiscountCoupons({ code: "TI", type: "fixed", value: 500, discountAmount: 500 }, 500, 0);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ amount_off: 500, name: "Rabatkode: TI", metadata: { discount_code: "TI" } }),
    );
  });
  it("kun 3 for 2", async () => {
    await buildDiscountCoupons(null, 0, 5900);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ amount_off: 5900, name: "Lagersalg 3 for 2", metadata: { bundle_discount: "lagersalg_3for2" } }),
    );
  });
  it("gratis fragt giver ingen kupon", async () => {
    expect(await buildDiscountCoupons({ code: "F", type: "free_shipping", value: 0, discountAmount: 0 }, 0, 0)).toEqual([]);
    expect(create).not.toHaveBeenCalled();
  });
  it("laver ingen kupon uden rabat", async () => {
    expect(await buildDiscountCoupons(null, 0, 0)).toEqual([]);
    expect(create).not.toHaveBeenCalled();
  });
});
