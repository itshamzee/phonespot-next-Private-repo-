// src/lib/foneday/types.ts
// TypeScript types for Foneday API data and internal integration types

// --- Foneday API response types ---

export interface FonedayProduct {
  sku: string;
  ean: string | null;
  title: string;
  instock: "Y" | "N";
  suitable_for: string | null;
  category: string | null;
  product_brand: string | null;
  artcode: string | null;
  quality: string | null;
  model_brand: string | null;
  model_codes: string[];
  price: number; // EUR
}

export interface FonedayProductsResponse {
  products: FonedayProduct[];
}

export interface FonedaySingleProductResponse {
  product: FonedayProduct;
}

export interface FonedayCartArticle {
  sku: string;
  quantity: number;
  note?: string | null;
}

export interface FonedayCartItem {
  sku: string;
  quantity: number;
  title: string;
  price: string;
  note: string | null;
}

export interface FonedayCartResponse {
  cart: FonedayCartItem[];
}

// --- Internal DB types ---

export interface FonedayCatalogRow {
  id: string;
  foneday_sku: string;
  ean: string | null;
  title: string;
  in_stock: boolean;
  suitable_for: string | null;
  category: string | null;
  product_brand: string | null;
  artcode: string | null;
  quality: string | null;
  model_brand: string | null;
  model_codes: string[];
  price_eur: number;
  price_dkk: number | null;
  raw_data: Record<string, unknown> | null;
  missing_since: string | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface FonedayCategoryMapRow {
  id: string;
  map_type: "category" | "quality";
  foneday_value: string;
  phonespot_value: string;
  display_label: string | null;
}

export interface FonedaySkuLinkRow {
  id: string;
  foneday_catalog_id: string;
  accessory_id: string | null;
  use_type: "retail" | "repair_part";
  auto_sync_price: boolean;
  auto_sync_stock: boolean;
  markup_percentage: number;
  created_at: string;
}

export interface FonedaySettings {
  eur_dkk_rate: number; // e.g. 745 = 7.45 DKK per EUR (DKK-per-EUR * 100)
  in_stock_qty: number; // e.g. 99
}

export interface SyncStats {
  synced: number;
  new: number;
  missing: number;
  linked_updated: number;
  errors: string[];
}
