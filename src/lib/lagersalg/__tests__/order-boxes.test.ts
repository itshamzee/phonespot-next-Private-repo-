// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  stores: [] as { id: string; name: string; type: string }[],
  idBySlug: {} as Record<string, string>,
  boxNumbersFor: vi.fn(),
  picksForOrder: vi.fn(),
}));
vi.mock("@/lib/accessory-intake/candidates", () => ({ storeLocations: async () => m.stores }));
vi.mock("@/lib/auth/store-scope-server", () => ({
  loadLocationIndex: async () => ({ idBySlug: m.idBySlug, slugById: {} }),
}));
vi.mock("@/lib/lagersalg/boxes", () => ({ boxNumbersFor: m.boxNumbersFor, picksForOrder: m.picksForOrder }));

import { boxesForOrderSkus } from "../order-boxes";

const db = {} as never;
const skus: { id: string; subcategory: string | null; attributes: Record<string, string> }[] = [
  { id: "A", subcategory: "cover", attributes: { udsalg: "Ja" } },
  { id: "G", subcategory: "screen_protector", attributes: { udsalg: "Ja" } },
  { id: "N", subcategory: "cover", attributes: {} },
];

beforeEach(() => {
  m.stores = [
    { id: "L-v", name: "PhoneSpot Vejle", type: "store" },
    { id: "L-s", name: "PhoneSpot Slagelse", type: "store" },
  ];
  m.idBySlug = { vejle: "L-v", slagelse: "L-s" };
  m.boxNumbersFor.mockReset();
  m.boxNumbersFor.mockResolvedValue(new Map([["A", [2]]]));
  m.picksForOrder.mockReset();
  m.picksForOrder.mockResolvedValue(new Map());
});

describe("boxesForOrderSkus", () => {
  it("bruger ordrens location når den er en butik", async () => {
    const r = await boxesForOrderSkus(db, { orderId: "o1", orderLocationId: "L-s", skus });
    expect(r.locationId).toBe("L-s");
    expect(m.boxNumbersFor).toHaveBeenCalledWith(db, ["A"], "L-s");
    expect(r.boxes).toEqual({ A: [2] });
    expect(r.lagersalg).toEqual({ A: true, G: false, N: false });
  });

  it("falder tilbage til Vejle (slug) for null eller ikke-butik", async () => {
    expect((await boxesForOrderSkus(db, { orderId: null, orderLocationId: null, skus })).locationId).toBe("L-v");
    expect((await boxesForOrderSkus(db, { orderId: null, orderLocationId: "warehouse", skus })).locationId).toBe(
      "L-v",
    );
  });

  it("en anden butik med Vejle i navnet bliver ikke fallback", async () => {
    m.stores = [{ id: "L-v4", name: "PhoneSpot Vejle Gågade", type: "store" }, ...m.stores];
    const r = await boxesForOrderSkus(db, { orderId: null, orderLocationId: null, skus });
    expect(r.locationId).toBe("L-v");
  });

  it("uden Vejle: null og ingen kasser", async () => {
    m.stores = [{ id: "L-s", name: "PhoneSpot Slagelse", type: "store" }];
    m.idBySlug = { slagelse: "L-s" };
    const r = await boxesForOrderSkus(db, { orderId: null, orderLocationId: null, skus });
    expect(r.locationId).toBeNull();
    expect(r.boxes).toEqual({});
    expect(m.boxNumbersFor).not.toHaveBeenCalled();
  });

  it("bruger salgets pluk, selv når kassebeholdningen er trukket ned til 0", async () => {
    const two = [
      { id: "A", subcategory: "cover", attributes: { udsalg: "Ja" } },
      { id: "B", subcategory: "cover", attributes: { udsalg: "Ja" } },
    ];
    m.picksForOrder.mockResolvedValue(new Map([["A", [1]]]));
    m.boxNumbersFor.mockResolvedValue(new Map([["B", [4]]]));
    const r = await boxesForOrderSkus(db, { orderId: "o1", orderLocationId: "L-v", skus: two });
    expect(m.picksForOrder).toHaveBeenCalledWith(db, "o1");
    expect(r.boxes).toEqual({ A: [1], B: [4] });
    // Kun varen uden pluk slås op i den nuværende beholdning.
    expect(m.boxNumbersFor).toHaveBeenCalledWith(db, ["B"], "L-v");
  });

  it("uden ordre-id læses ingen pluk", async () => {
    await boxesForOrderSkus(db, { orderId: null, orderLocationId: "L-v", skus });
    expect(m.picksForOrder).not.toHaveBeenCalled();
  });
});
