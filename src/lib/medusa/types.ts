// ---------------------------------------------------------------------------
// Medusa.js v2 - TypeScript types
// ---------------------------------------------------------------------------
// These types mirror the existing @/lib/shopify/types interface so
// pages & components can switch imports with no other changes.

/** Monetary value. */
export interface Money {
  amount: string;
  currencyCode: string;
}

/** Image representation. */
export interface ShopifyImage {
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

/** A single product variant. */
export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
  price: Money;
  compareAtPrice: Money | null;
}

/** Full product representation used throughout the storefront. */
export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  images: ShopifyImage[];
  variants: ProductVariant[];
  seo: {
    title: string | null;
    description: string | null;
  };
}

/** Collection of products. */
export interface Collection {
  handle: string;
  title: string;
  description: string;
  image: ShopifyImage | null;
  seo: {
    title: string | null;
    description: string | null;
  };
  products: Product[];
}

/** A single line item inside a cart. */
export interface CartItem {
  id: string;
  quantity: number;
  cost: {
    totalAmount: Money;
  };
  merchandise: {
    id: string;
    title: string;
    selectedOptions: { name: string; value: string }[];
    product: {
      id: string;
      handle: string;
      title: string;
      featuredImage: ShopifyImage | null;
    };
  };
}

/** Shopping cart state. */
export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money | null;
  };
  lines: CartItem[];
}

// ---------------------------------------------------------------------------
// Medusa raw types (used internally by client.ts)
// ---------------------------------------------------------------------------

export interface MedusaProduct {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  subtitle: string | null;
  thumbnail: string | null;
  status: string;
  collection_id: string | null;
  collection: { id: string; handle: string; title: string } | null;
  tags: { id: string; value: string }[];
  type: { id: string; value: string } | null;
  images: { id: string; url: string; rank: number }[];
  options: { id: string; title: string; values: { id: string; value: string }[] }[];
  variants: MedusaVariant[];
  metadata: Record<string, unknown> | null;
}

export interface MedusaVariant {
  id: string;
  title: string;
  sku: string | null;
  manage_inventory: boolean;
  inventory_quantity: number;
  allow_backorder: boolean;
  options: { id: string; value: string; option_id: string }[];
  calculated_price?: {
    calculated_amount: number;
    original_amount: number;
    currency_code: string;
  };
  prices: {
    id: string;
    amount: number;
    currency_code: string;
  }[];
}

export interface MedusaCollection {
  id: string;
  handle: string;
  title: string;
  metadata: Record<string, unknown> | null;
}

export interface MedusaCart {
  id: string;
  region_id: string;
  items: MedusaCartItem[];
  total: number;
  subtotal: number;
  tax_total: number;
  item_total: number;
  shipping_total: number;
  currency_code: string;
  payment_collection?: {
    id: string;
    status: string;
  } | null;
  shipping_methods?: {
    id: string;
    name: string;
    amount: number;
    shipping_option_id: string;
  }[];
}

export interface MedusaCartItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  total: number;
  thumbnail: string | null;
  variant_id: string;
  variant: {
    id: string;
    title: string;
    product: {
      id: string;
      handle: string;
      title: string;
      thumbnail: string | null;
    };
    options: { id: string; value: string }[];
  };
}
