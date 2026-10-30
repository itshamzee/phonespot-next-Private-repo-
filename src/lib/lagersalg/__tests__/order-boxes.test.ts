// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ stores: [] as { id: string; name: string; type: string }[], boxNumbersFor: vi.fn() }));
vi.mock("@/lib/accessory-intake/candidates", () => ({ storeLocations: async () => m.stores }));
vi.mock("@/lib/lagersalg/boxes", () => ({ boxNumbersFor: m.boxNumbersFor }));

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
  m.boxNumbersFor.mockReset();
  m.boxNumbersFor.mockResolvedValue(new Map([["A", [2]]]));
});

describe("boxesForOrderSkus", () => {
  it("bruger ordrens location når den er en butik", async () => {
    const r = await boxesForOrderSkus(db, { orderLocationId: "L-s", skus });
    expect(r.locationId).toBe("L-s");
    expect(m.boxNumbersFor).toHaveBeenCalledWith(db, ["A"], "L-s");
    expect(r.boxes).toEqual({ A: [2] });
    expect(r.lagersalg).toEqual({ A: true, G: false, N: false });
  });

  it("falder tilbage til Vejle for null eller ikke-butik", async () => {
    expect((await boxesForOrderSkus(db, { orderLocationId: null, skus })).locationId).toBe("L-v");
    expect((await boxesForOrderSkus(db, { orderLocationId: "warehouse", skus })).locationId).toBe("L-v");
  });

  it("uden Vejle: null og ingen kasser", async () => {
    m.stores = [{ id: "L-s", name: "PhoneSpot Slagelse", type: "store" }];
    const r = await boxesForOrderSkus(db, { orderLocationId: null, skus });
    expect(r.locationId).toBeNull();
    expect(r.boxes).toEqual({});
    expect(m.boxNumbersFor).not.toHaveBeenCalled();
  });
});
