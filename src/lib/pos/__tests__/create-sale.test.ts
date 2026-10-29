// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleItem } from "../schemas";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

type SkuRow = {
  id: string;
  selling_price: number;
  sale_price: number | null;
  subcategory: string | null;
  attributes: Record<string, string> | null;
};

const s = vi.hoisted(() => ({
  skus: [] as SkuRow[],
  rpc: vi.fn(),
  selected: "" as string,
}));

vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      const q = {
        select: (cols: string) => {
          s.selected = cols;
          return q;
        },
        in: async (_col: string, ids: string[]) => ({
          data: table === "sku_products" ? s.skus.filter((r) => ids.includes(r.id)) : [],
          error: null,
        }),
      };
      return q;
    },
    rpc: s.rpc,
  }),
}));
vi.mock("@/lib/warranty/generate", () => ({ generateWarrantiesForOrder: vi.fn() }));
vi.mock("../receipt-data", () => ({ renderReceiptPdf: vi.fn(async () => Buffer.from("%PDF")) }));

import { createPosSale, expectedBundle } from "../create-sale";

const udsalg = { udsalg: "Ja" };

function sale(items: SaleItem[]) {
  return {
    items,
    payments: [{ type: "kontant", amountOere: 1 }],
    staffId: U(90),
    locationId: U(91),
    registerId: U(92),
  };
}

beforeEach(() => {
  s.rpc.mockReset();
  s.rpc.mockResolvedValue({
    data: {
      order_id: U(100),
      order_number: "POS-1",
      receipt_number: "V1-000001",
      total: 17800,
      vat_total: 3560,
      brugtmoms_total: 0,
      bundle_discount: 5900,
    },
    error: null,
  });
  // To covers udsalg=Ja à 5900 og 7900 + ét à 9900 (også udsalg).
  s.skus = [
    { id: U(1), selling_price: 5900, sale_price: null, subcategory: "case", attributes: udsalg },
    { id: U(2), selling_price: 7900, sale_price: null, subcategory: "case", attributes: udsalg },
    { id: U(3), selling_price: 12900, sale_price: 9900, subcategory: "case", attributes: udsalg },
    { id: U(4), selling_price: 9900, sale_price: null, subcategory: "screen_protector", attributes: udsalg },
  ];
});

describe("createPosSale: lagersalg 3 for 2", () => {
  it("afviser et salg hvor klientens 3 for 2-beløb ikke matcher databasen", async () => {
    const items: SaleItem[] = [
      { type: "sku_product", skuProductId: U(1), quantity: 1 },
      { type: "sku_product", skuProductId: U(2), quantity: 1, bundleDiscountOere: 7900 },
      { type: "sku_product", skuProductId: U(3), quantity: 1 },
    ];
    await expect(createPosSale(sale(items))).rejects.toMatchObject({ code: "bundle_mismatch", status: 409 });
    expect(s.rpc).not.toHaveBeenCalled();
  });

  it("accepterer et salg hvor beløbene matcher og sender bundle_discount_oere", async () => {
    const items: SaleItem[] = [
      { type: "sku_product", skuProductId: U(1), quantity: 1, bundleDiscountOere: 5900 },
      { type: "sku_product", skuProductId: U(2), quantity: 1 },
      { type: "sku_product", skuProductId: U(3), quantity: 1 },
    ];
    const res = await createPosSale(sale(items));
    expect(s.selected).toContain("subcategory");
    expect(s.selected).toContain("attributes");
    expect(s.rpc).toHaveBeenCalledWith(
      "pos_create_sale",
      expect.objectContaining({
        p_items: expect.arrayContaining([expect.objectContaining({ sku_product_id: U(1), bundle_discount_oere: 5900 })]),
      }),
    );
    expect(res.bundleDiscount).toBe(5900);
  });

  it("afviser når klienten udelader en rabat databasen giver", async () => {
    const items: SaleItem[] = [
      { type: "sku_product", skuProductId: U(1), quantity: 1 },
      { type: "sku_product", skuProductId: U(2), quantity: 1 },
      { type: "sku_product", skuProductId: U(3), quantity: 1 },
    ];
    await expect(createPosSale(sale(items))).rejects.toMatchObject({ code: "bundle_mismatch" });
  });

  it("afviser rabat på beskyttelsesglas (aldrig lagersalg), selv med udsalg=Ja", async () => {
    const items: SaleItem[] = [
      { type: "sku_product", skuProductId: U(1), quantity: 1 },
      { type: "sku_product", skuProductId: U(2), quantity: 1 },
      { type: "sku_product", skuProductId: U(4), quantity: 1, bundleDiscountOere: 9900 },
    ];
    await expect(createPosSale(sale(items))).rejects.toMatchObject({ code: "bundle_mismatch" });
  });

  it("accepterer den gratis enhed som egen linje uanset rækkefølgen af to ens linjer", async () => {
    const items: SaleItem[] = [
      { type: "sku_product", skuProductId: U(1), quantity: 1, bundleDiscountOere: 5900 },
      { type: "sku_product", skuProductId: U(1), quantity: 1 },
      { type: "sku_product", skuProductId: U(2), quantity: 1 },
    ];
    await createPosSale(sale(items));
    expect(s.rpc).toHaveBeenCalled();
  });

  it("afviser en delvis rabat på en linje (gratis enheder skal være deres egen linje)", async () => {
    const items: SaleItem[] = [
      { type: "sku_product", skuProductId: U(1), quantity: 2, bundleDiscountOere: 5900 },
      { type: "sku_product", skuProductId: U(2), quantity: 1 },
    ];
    await expect(createPosSale(sale(items))).rejects.toMatchObject({ code: "bundle_mismatch" });
  });

  it("varer fra en reparationssag indgår ikke og må ikke få rabat", async () => {
    const items: SaleItem[] = [
      { type: "sku_product", skuProductId: U(1), quantity: 1 },
      { type: "sku_product", skuProductId: U(2), quantity: 1 },
      { type: "sku_product", skuProductId: U(3), quantity: 1, repairTicketItemId: U(50), bundleDiscountOere: 0 },
    ];
    await createPosSale(sale(items));
    expect(s.rpc).toHaveBeenCalled();
    const sent = s.rpc.mock.calls[0][1].p_items as Array<Record<string, unknown>>;
    expect(sent.every((i) => !i.bundle_discount_oere)).toBe(true);
  });

  it("expectedBundle regner på salgsprisen fra databasen", async () => {
    const items: SaleItem[] = [
      { type: "free_text", description: "Diverse", unitPriceOere: 1000, quantity: 1 },
      { type: "sku_product", skuProductId: U(3), quantity: 2 },
      { type: "sku_product", skuProductId: U(2), quantity: 1 },
    ];
    // 9900, 9900, 7900: den billigste (7900) er gratis.
    expect(await expectedBundle(items)).toEqual({ 2: 7900 });
  });
});
