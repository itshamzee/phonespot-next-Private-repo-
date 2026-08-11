import { describe, it, expect } from "vitest";
import {
  buildPartnerFeedRows,
  PARTNER_FEED_WARRANTY_MONTHS,
  type PartnerFeedDeviceRow,
  type PartnerFeedTemplate,
} from "../partner-data";

const TEMPLATE: PartnerFeedTemplate = {
  id: "t1",
  display_name: "iPhone 13 128GB",
  brand: "Apple",
  category: "iphone",
  slug: "iphone-13",
  status: "published",
  images: ["https://cdn.phonespot.dk/iphone-13-default.jpg"],
  default_attributes: {
    gtin: "0194252709000",
    gtins_by_variant: {
      "128GB|Sort": "0194252709099",
    },
    images_by_color: {
      Sort: ["https://cdn.phonespot.dk/iphone-13-sort-1.jpg", "https://cdn.phonespot.dk/iphone-13-sort-2.jpg"],
    },
  },
};

function device(overrides: Partial<PartnerFeedDeviceRow> = {}): PartnerFeedDeviceRow {
  return {
    id: "d-default",
    grade: "A",
    storage: "128GB",
    color: "Sort",
    selling_price: 350000,
    vat_scheme: "regular",
    source: "inhouse",
    source_stock: 0,
    battery_health: null,
    condition_notes: null,
    barcode: null,
    template: TEMPLATE,
    ...overrides,
  };
}

describe("buildPartnerFeedRows — Foxway vs in-house quantity", () => {
  it("sums Foxway quantity from source_stock across multiple stock lines, not counting rows as 1 each", () => {
    const rows = buildPartnerFeedRows([
      device({ id: "d1", source: "foxway", source_stock: 7, barcode: null }),
      device({ id: "d2", source: "foxway", source_stock: 3, barcode: null }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(10); // 7 + 3, NOT 2 (row count)
  });

  it("counts in-house devices as one physical unit per row", () => {
    const rows = buildPartnerFeedRows([
      device({ id: "d1", source: "inhouse", barcode: "PS0001" }),
      device({ id: "d2", source: "inhouse", barcode: "PS0002" }),
      device({ id: "d3", source: "inhouse", barcode: "PS0003" }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(3);
  });

  it("never emits a barcode for a Foxway quantity line, even if barcode happens to be set", () => {
    const rows = buildPartnerFeedRows([
      device({ id: "d1", source: "foxway", source_stock: 5, barcode: "SHOULD-NOT-APPEAR" }),
    ]);

    expect(rows[0].barcodes).toEqual([]);
  });

  it("collects real per-unit barcodes for in-house rows", () => {
    const rows = buildPartnerFeedRows([
      device({ id: "d1", source: "inhouse", barcode: "PS0001" }),
      device({ id: "d2", source: "inhouse", barcode: "PS0002" }),
      device({ id: "d3", source: "inhouse", barcode: null }), // in-house but no barcode yet
    ]);

    expect(rows[0].barcodes.sort()).toEqual(["PS0001", "PS0002"]);
  });

  it("excludes a variant whose computed quantity is zero (Foxway line with source_stock 0)", () => {
    const rows = buildPartnerFeedRows([
      device({ id: "d1", source: "foxway", source_stock: 0, barcode: null }),
    ]);

    expect(rows).toHaveLength(0);
  });

  it("treats a null source_stock on a Foxway row as zero, not NaN or 1", () => {
    const rows = buildPartnerFeedRows([
      device({ id: "d1", source: "foxway", source_stock: null, barcode: null }),
    ]);

    expect(rows).toHaveLength(0);
  });
});

describe("buildPartnerFeedRows — row shape", () => {
  it("includes vatScheme on every row", () => {
    const rows = buildPartnerFeedRows([device({ vat_scheme: "brugtmoms" })]);
    expect(rows[0].vatScheme).toBe("brugtmoms");
  });

  it("resolves gtin from the per-variant map first", () => {
    const rows = buildPartnerFeedRows([device({ storage: "128GB", color: "Sort" })]);
    expect(rows[0].gtin).toBe("0194252709099");
  });

  it("falls back to the template-wide gtin when no per-variant entry exists", () => {
    const rows = buildPartnerFeedRows([device({ storage: "256GB", color: "Blå" })]);
    expect(rows[0].gtin).toBe("0194252709000");
  });

  it("emits null gtin rather than inventing one when neither is present", () => {
    const bareTemplate: PartnerFeedTemplate = { ...TEMPLATE, default_attributes: {} };
    const rows = buildPartnerFeedRows([device({ template: bareTemplate })]);
    expect(rows[0].gtin).toBeNull();
  });

  it("uses the Danish PDP grade label — Fabriksny for grade N, never an English label", () => {
    const rows = buildPartnerFeedRows([device({ grade: "N" })]);
    expect(rows[0].gradeLabel).toBe("Fabriksny");
    expect(rows[0].gradeLabel).not.toMatch(/refurbished/i);
  });

  it("emits warrantyMonths as the explicit constant", () => {
    const rows = buildPartnerFeedRows([device()]);
    expect(rows[0].warrantyMonths).toBe(PARTNER_FEED_WARRANTY_MONTHS);
    expect(rows[0].warrantyMonths).toBe(36);
  });

  it("computes priceDkk from selling_price (øre) incl. VAT, taking the min across the variant's units", () => {
    const rows = buildPartnerFeedRows([
      device({ id: "d1", selling_price: 355000 }),
      device({ id: "d2", selling_price: 349900 }),
    ]);
    expect(rows[0].priceDkk).toBe(3499);
    expect(rows[0].currency).toBe("DKK");
  });

  it("takes the minimum battery_health across the variant's units, ignoring nulls", () => {
    const rows = buildPartnerFeedRows([
      device({ id: "d1", battery_health: 91 }),
      device({ id: "d2", battery_health: 87 }),
      device({ id: "d3", battery_health: null }),
    ]);
    expect(rows[0].batteryHealth).toBe(87);
  });

  it("returns null batteryHealth when no unit in the variant has one", () => {
    const rows = buildPartnerFeedRows([device({ battery_health: null })]);
    expect(rows[0].batteryHealth).toBeNull();
  });

  it("collects distinct non-empty conditionNotes across the variant's units", () => {
    const rows = buildPartnerFeedRows([
      device({ id: "d1", condition_notes: "Ridser på skærm" }),
      device({ id: "d2", condition_notes: "  " }), // blank after trim -> ignored
      device({ id: "d3", condition_notes: null }),
    ]);
    expect(rows[0].conditionNotes).toEqual(["Ridser på skærm"]);
  });

  it("returns null conditionNotes when no unit has one", () => {
    const rows = buildPartnerFeedRows([device({ condition_notes: null })]);
    expect(rows[0].conditionNotes).toBeNull();
  });

  it("prefers the colour-specific image, falling back to the template default", () => {
    const rowsSort = buildPartnerFeedRows([device({ color: "Sort" })]);
    expect(rowsSort[0].imageUrl).toBe("https://cdn.phonespot.dk/iphone-13-sort-1.jpg");

    const rowsBlaa = buildPartnerFeedRows([device({ color: "Blå" })]);
    expect(rowsBlaa[0].imageUrl).toBe("https://cdn.phonespot.dk/iphone-13-default.jpg");
  });

  it("builds a stable variantKey from slug|storage|colour|grade", () => {
    const rows = buildPartnerFeedRows([device({ storage: "128GB", color: "Sort", grade: "A" })]);
    expect(rows[0].variantKey).toBe("iphone-13|128GB|Sort|A");
  });
});

describe("buildPartnerFeedRows — filtering", () => {
  it("excludes devices with no selling_price", () => {
    const rows = buildPartnerFeedRows([device({ selling_price: null })]);
    expect(rows).toHaveLength(0);
  });

  it("excludes devices with a zero or negative selling_price", () => {
    const rows = buildPartnerFeedRows([device({ selling_price: 0 })]);
    expect(rows).toHaveLength(0);
  });

  it("excludes devices whose template is not published", () => {
    const draftTemplate: PartnerFeedTemplate = { ...TEMPLATE, status: "draft" };
    const rows = buildPartnerFeedRows([device({ template: draftTemplate })]);
    expect(rows).toHaveLength(0);
  });

  it("excludes devices with no template", () => {
    const rows = buildPartnerFeedRows([device({ template: null })]);
    expect(rows).toHaveLength(0);
  });

  it("keeps distinct grades of the same template/storage/colour as separate rows", () => {
    const rows = buildPartnerFeedRows([
      device({ id: "d1", grade: "A" }),
      device({ id: "d2", grade: "B" }),
    ]);
    expect(rows).toHaveLength(2);
  });
});
