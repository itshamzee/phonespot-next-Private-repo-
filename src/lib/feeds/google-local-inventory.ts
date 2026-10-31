// Rene mapping-funktioner til det lokale lagerfeed
// (src/app/feeds/google-local-inventory/route.ts). Ingen I/O her, så de kan testes.

import {
  formatPrice,
  isPublishableAccessory,
  isPublishableDeviceGroup,
  validSalePrice,
  type AccessoryRow,
  type DeviceGroup,
} from "@/lib/feeds/google-shopping";

/**
 * Butikskoder, som de skal stå i Google Business Profile (forskel på store og
 * små bogstaver). IKKE BEKRÆFTET: værdierne er pladsholdere, indtil ejeren har
 * læst koderne i Business Profile. Ret dem her, inden feedet kobles på
 * Merchant Center.
 *
 * Listen er også det eneste, der lukker en butik ind i feedet. En butik, der
 * ikke står her, kommer ikke med, selv om den findes i tabellen locations.
 */
export const GOOGLE_BUSINESS_PROFILE_STORE_CODES: Readonly<Record<string, string>> = {
  vejle: "vejle",
  slagelse: "slagelse",
};

/** Leverandørlinjer er ikke fysiske enheder i en butik og tæller aldrig som butikslager. */
const SUPPLIER_STOCK_SOURCE = "foxway";

export const LOCAL_INVENTORY_COLUMNS = [
  "store_code",
  "id",
  "availability",
  "quantity",
  "price",
  "sale_price",
] as const;

export interface LocalInventoryRow {
  store_code: string;
  id: string;
  availability: "in_stock" | "out_of_stock";
  quantity: number;
  price: string;
  sale_price: string;
}

export interface FeedLocation {
  id: string;
  slug: string | null;
}

export interface SkuStockRow {
  product_id: string;
  location_id: string;
  quantity: number | null;
}

function row(
  storeCode: string,
  id: string,
  quantity: number,
  priceOre: number,
  saleOre: number | null = null,
): LocalInventoryRow {
  return {
    store_code: storeCode,
    id,
    availability: quantity > 0 ? "in_stock" : "out_of_stock",
    quantity,
    price: formatPrice(priceOre),
    sale_price: saleOre == null ? "" : formatPrice(saleOre),
  };
}

/**
 * Én række pr. butik og vare i online-feedet, så varen også står med sandt
 * nul i de butikker, der ikke har den. Vare-id'erne er de samme som online.
 *
 * Prisen er butikkens laveste pris for varen. Står varen ikke i butikken,
 * bruges online-prisen, da en out_of_stock-række ikke har en butikspris.
 */
export function buildLocalInventoryRows(input: {
  locations: FeedLocation[];
  deviceGroups: DeviceGroup[];
  accessories: AccessoryRow[];
  skuStock: SkuStockRow[];
}): LocalInventoryRow[] {
  const stores = input.locations.flatMap((l) => {
    const code = l.slug ? GOOGLE_BUSINESS_PROFILE_STORE_CODES[l.slug] : undefined;
    return code ? [{ locationId: l.id, code }] : [];
  });

  const skuQuantity = new Map<string, number>();
  for (const s of input.skuStock) {
    skuQuantity.set(`${s.location_id}|${s.product_id}`, Math.max(0, s.quantity ?? 0));
  }

  const rows: LocalInventoryRow[] = [];
  for (const store of stores) {
    for (const group of input.deviceGroups) {
      if (!isPublishableDeviceGroup(group)) continue;
      const units = group.devices.filter(
        (d) => d.location_id === store.locationId && d.source !== SUPPLIER_STOCK_SOURCE,
      );
      const price = units.length > 0 ? Math.min(...units.map((d) => d.selling_price!)) : group.minPrice;
      rows.push(row(store.code, group.id, units.length, price));
    }
    for (const product of input.accessories) {
      if (!isPublishableAccessory(product)) continue;
      const quantity = skuQuantity.get(`${store.locationId}|${product.id}`) ?? 0;
      rows.push(
        row(
          store.code,
          product.id,
          quantity,
          product.selling_price,
          validSalePrice(product.selling_price, product.sale_price),
        ),
      );
    }
  }
  return rows;
}

/** Tabulatorsepareret med kolonnerække, som Merchant Center læser som fil. */
export function serializeLocalInventory(rows: LocalInventoryRow[]): string {
  const clean = (v: string | number) => String(v).replace(/[\t\r\n]+/g, " ");
  const lines = [
    LOCAL_INVENTORY_COLUMNS.join("\t"),
    ...rows.map((r) => LOCAL_INVENTORY_COLUMNS.map((c) => clean(r[c])).join("\t")),
  ];
  return `${lines.join("\n")}\n`;
}
