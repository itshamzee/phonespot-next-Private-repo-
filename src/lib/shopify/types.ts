// ---------------------------------------------------------------------------
// Shopify Storefront API - TypeScript types
// ---------------------------------------------------------------------------

/** Monetary value returned by the Storefront API. */
export interface Money {
  amount: string;
  currencyCode: string;
}

/** Image node from Shopify. */
export interface ShopifyImage {
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

/** A single product variant (size, colour, etc.). */
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
// Raw Shopify API response wrappers (edges/nodes pattern)
// ---------------------------------------------------------------------------

export interface ShopifyConnection<T> {
  nodes: T[];
}

export interface ShopifyProductRaw extends Omit<Product, "images" | "variants"> {
  images: ShopifyConnection<ShopifyImage>;
  variants: ShopifyConnection<ProductVariant>;
}

export interface ShopifyCollectionRaw extends Omit<Collection, "products"> {
  products: ShopifyConnection<ShopifyProductRaw>;
}

export interface ShopifyCartRaw extends Omit<Cart, "lines"> {
  lines: ShopifyConnection<CartItem>;
}
