// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { validateCart, toServerItems, type ValidatedItem } from "../validate";
import { calcBundleDiscounts } from "@/lib/cart/utils";
import type { CartItem } from "@/lib/cart/types";
const s = vi.hoisted(() => ({
  owner: "a".repeat(64),
  ownerRead: vi.fn(),
  stock: 1,
  error: false,
  always: false,
  active: true,
  category: null as string | null,
  subcategory: null as string | null,
  attributes: null as Record<string, string> | null,
  sale: null as number | null,
  devices: [] as Record<string, unknown>[],
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "a".repeat(64) }) }),
}));
vi.mock("@/lib/cart/reservation-owner", () => ({
  readReservationOwner: async () => {
    s.ownerRead();
    return s.owner;
  },
}));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      const data =
        table === "devices"
          ? s.devices
          : table === "sku_stock"
            ? [{ product_id: "sku", quantity: s.stock }]
            : [
                {
                  id: "sku",
                  is_active: s.active,
                  selling_price: 100,
                  sale_price: s.sale,
                  attributes: s.attributes,
                  always_in_stock: s.always,
                  total_stock: s.stock,
                  category: s.category,
                  subcategory: s.subcategory,
                },
              ];
      const q = {
        select: () => q,
        in: async () => ({
          data: s.error ? null : data,
          error: s.error ? {} : null,
        }),
      };
      return q;
    },
  }),
}));
const sku = (quantity = 1, variantLabel = "Sort") =>
  ({
    type: "sku_product",
    skuProductId: "sku",
    title: "Cover",
    quantity,
    variantLabel,
    price: 100,
    image: null,
  }) as CartItem;
const device = {
  type: "device",
  deviceId: "device",
  title: "Phone",
  upgrades: [],
} as unknown as CartItem;
beforeEach(() => {
  s.owner = "a".repeat(64);
  s.stock = 1;
  s.error = false;
  s.always = false;
  s.active = true;
  s.category = null;
  s.subcategory = null;
  s.attributes = null;
  s.sale = null;
  s.devices = [
    {
      id: "device",
      selling_price: 100,
      status: "reserved",
      reservation_expires_at: new Date(Date.now() + 600000).toISOString(),
      reservation_id: "generation",
      reservation_owner_hash: s.owner,
      reservation_order_id: null,
    },
  ];
});
it("aggregates SKU demand across variant labels", async () => {
  const r = await validateCart([sku(), sku(1, "Hvid")]);
  expect(r.valid).toBe(false);
  expect(r.items.every((i) => !i.available)).toBe(true);
});
it("preserves separate variants when total stock suffices", async () => {
  s.stock = 2;
  const r = await validateCart([sku(), sku(1, "Hvid")]);
  expect(r.valid).toBe(true);
  expect(r.items).toHaveLength(2);
});
it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  "rejects invalid quantity %s",
  async (n) => {
    expect((await validateCart([sku(n)])).valid).toBe(false);
  },
);
it("rejects sum overflow", async () => {
  s.always = true;
  expect(
    (await validateCart([sku(Number.MAX_SAFE_INTEGER), sku()])).valid,
  ).toBe(false);
});
it("allows always in stock but fails closed on DB error", async () => {
  s.always = true;
  s.stock = 0;
  expect((await validateCart([sku()])).valid).toBe(true);
  s.error = true;
  expect((await validateCart([sku()])).valid).toBe(false);
});
it("returns server reservation identity", async () => {
  expect((await validateCart([device])).items[0]).toMatchObject({
    available: true,
    reservationId: "generation",
  });
});
it.each([
  { reservation_owner_hash: "b" },
  { reservation_id: null },
  { reservation_expires_at: null },
  { reservation_expires_at: new Date(0).toISOString() },
  { reservation_order_id: "other" },
])("rejects invalid physical reservation %j", async (patch) => {
  Object.assign(s.devices[0], patch);
  expect((await validateCart([device])).valid).toBe(false);
});
it("rejects duplicate device", async () => {
  expect((await validateCart([device, device])).valid).toBe(false);
});
it("rejects absent owner", async () => {
  s.owner = "";
  expect((await validateCart([device])).valid).toBe(false);
});
it("SKU-only carts never read a reservation cookie", async () => {
  s.ownerRead.mockClear();
  await validateCart([sku()]);
  expect(s.ownerRead).not.toHaveBeenCalled();
});
it("expiry at the current instant is already expired", async () => {
  vi.spyOn(Date, "now").mockReturnValue(1000000);
  s.devices[0].reservation_expires_at = new Date(1000000).toISOString();
  try {
    expect((await validateCart([device])).valid).toBe(false);
  } finally {
    vi.restoreAllMocks();
  }
});
it("missing inventory is not treated as an available product", async () => {
  expect(
    (await validateCart([{ ...sku(), skuProductId: "unknown" } as CartItem]))
      .valid,
  ).toBe(false);
});
it("non-numeric inventory fails closed", async () => {
  s.stock = NaN;
  expect((await validateCart([sku()])).valid).toBe(false);
});
it("rejects a deactivated spare part even when it is always in stock", async () => {
  s.active = false;
  s.always = true;
  const r = await validateCart([sku()]);
  expect(r.valid).toBe(false);
  expect(r.items[0].available).toBe(false);
});
it.each([
  { category: "accessory", subcategory: "spare-part" },
  { category: "spare-part", subcategory: null },
])("afviser aktiv, publiceret reservedel selv med always_in_stock %j", async (p) => {
  s.always = true;
  s.category = p.category;
  s.subcategory = p.subcategory;
  const r = await validateCart([sku()]);
  expect(r.valid).toBe(false);
  expect(r.items[0].available).toBe(false);
});
it("tilbehør med subcategory null er upåvirket", async () => {
  s.category = "accessory";
  expect((await validateCart([sku()])).valid).toBe(true);
});
it("markerer lagersalgsvarer fra databasen, ikke fra klienten", async () => {
  s.subcategory = "cover";
  s.attributes = { udsalg: "Ja" };
  s.sale = 5900;
  const r = await validateCart([sku()]);
  expect(r.items[0].lagersalg).toBe(true);
  expect(r.items[0].serverPrice).toBe(5900);
});
it("ignorerer klientens lagersalg-flag for varer der ikke er lagersalg", async () => {
  const forged = { ...sku(), lagersalg: true } as CartItem;
  const r = await validateCart([forged]);
  expect(r.items[0].lagersalg).toBeFalsy();
});
it("beskyttelsesglas er aldrig lagersalg", async () => {
  s.subcategory = "screen_protector";
  s.attributes = { udsalg: "Ja" };
  expect((await validateCart([sku()])).items[0].lagersalg).toBeFalsy();
});

const forgedLine = (n: number, lagersalg: boolean): ValidatedItem => ({
  item: { ...sku(1, `v${n}`), lagersalg: true } as CartItem,
  serverPrice: 5900,
  available: true,
  lagersalg,
});
it("toServerItems fjerner forfalsket klient-flag, så 3 for 2 giver 0 rabat", () => {
  const out = toServerItems([forgedLine(1, false), forgedLine(2, false), forgedLine(3, false)]);
  expect(out.every((i) => !("lagersalg" in i))).toBe(true);
  expect(calcBundleDiscounts(out).total).toBe(0);
});
it("toServerItems sætter lagersalg fra databasen", () => {
  const out = toServerItems([forgedLine(1, true), forgedLine(2, true), forgedLine(3, true)]);
  expect(out.every((i) => (i as { lagersalg?: true }).lagersalg === true)).toBe(true);
  expect(calcBundleDiscounts(out).total).toBe(5900);
});
