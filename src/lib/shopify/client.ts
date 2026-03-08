// ---------------------------------------------------------------------------
// Shopify Storefront API client
// ---------------------------------------------------------------------------

import type {
  Cart,
  Collection,
  Product,
  ShopifyCartRaw,
  ShopifyCollectionRaw,
  ShopifyConnection,
  ShopifyPageInfo,
  ShopifyProductRaw,
} from "./types";

import {
  GET_COLLECTIONS,
  GET_PRODUCT_BY_HANDLE,
  GET_PRODUCTS_BY_COLLECTION,
  GET_COLLECTION_PRODUCTS_PAGINATED,
  SEARCH_PRODUCTS,
} from "./queries";

import {
  ADD_TO_CART,
  CREATE_CART,
  GET_CART,
  REMOVE_FROM_CART,
  UPDATE_CART_LINE,
} from "./mutations";

// ---- Configuration ---------------------------------------------------------

const domain =
  process.env.SHOPIFY_STORE_DOMAIN ??
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ??
  "";

const storefrontAccessToken =
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ??
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN ??
  "";

const API_VERSION = "2024-10";
const endpoint = `https://${domain}/api/${API_VERSION}/graphql.json`;

// ---- Core fetch ------------------------------------------------------------

interface ShopifyFetchOptions {
  query: string;
  variables?: Record<string, unknown>;
}

export async function shopifyFetch<T>({
  query,
  variables,
}: ShopifyFetchOptions): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(
      `Shopify API error: ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as { data: T; errors?: unknown[] };

  if (json.errors) {
    throw new Error(
      `Shopify GraphQL error: ${JSON.stringify(json.errors)}`,
    );
  }

  return json.data;
}

// ---- Reshape helpers -------------------------------------------------------

function reshapeProduct(raw: ShopifyProductRaw): Product {
  return {
    ...raw,
    images: raw.images.nodes,
    variants: raw.variants.nodes.map((v) => ({
      ...v,
      storeAvailability: v.storeAvailability?.nodes,
    })),
  };
}

function reshapeCollection(raw: ShopifyCollectionRaw): Collection {
  return {
    ...raw,
    products: raw.products.nodes.map(reshapeProduct),
  };
}

function reshapeCart(raw: ShopifyCartRaw): Cart {
  return {
    ...raw,
    lines: raw.lines.nodes,
  };
}

// ---- Public API ------------------------------------------------------------

export async function getProduct(handle: string): Promise<Product | null> {
  const data = await shopifyFetch<{ product: ShopifyProductRaw | null }>({
    query: GET_PRODUCT_BY_HANDLE,
    variables: { handle },
  });

  return data.product ? reshapeProduct(data.product) : null;
}

export async function getCollectionProducts(
  handle: string,
  sortKey?: string,
): Promise<Collection | null> {
  const data = await shopifyFetch<{
    collection: ShopifyCollectionRaw | null;
  }>({
    query: GET_PRODUCTS_BY_COLLECTION,
    variables: { handle, ...(sortKey ? { sortKey } : {}) },
  });

  return data.collection ? reshapeCollection(data.collection) : null;
}

/**
 * Fetch ALL products from a Shopify collection using cursor pagination.
 * Fetches in batches of 250 (Shopify max) until no more pages.
 */
export async function getAllCollectionProducts(
  handle: string,
  sortKey?: string,
): Promise<Product[]> {
  const allProducts: Product[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const data = await shopifyFetch<{
      collection: {
        products: {
          nodes: ShopifyProductRaw[];
          pageInfo: ShopifyPageInfo;
        };
      } | null;
    }>({
      query: GET_COLLECTION_PRODUCTS_PAGINATED,
      variables: {
        handle,
        first: 250,
        after: cursor,
        ...(sortKey ? { sortKey } : {}),
      },
    });

    if (!data.collection) break;

    const products = data.collection.products.nodes.map(reshapeProduct);
    allProducts.push(...products);

    hasNextPage = data.collection.products.pageInfo.hasNextPage;
    cursor = data.collection.products.pageInfo.endCursor;
  }

  return allProducts;
}

export async function getCollections(): Promise<Collection[]> {
  const data = await shopifyFetch<{
    collections: ShopifyConnection<
      Omit<ShopifyCollectionRaw, "products"> & {
        products?: ShopifyConnection<ShopifyProductRaw>;
      }
    >;
  }>({
    query: GET_COLLECTIONS,
  });

  // GET_COLLECTIONS does not fetch products — return empty arrays.
  return data.collections.nodes.map((c) => ({
    ...c,
    products: c.products ? c.products.nodes.map(reshapeProduct) : [],
  }));
}

export async function searchProducts(query: string): Promise<Product[]> {
  const data = await shopifyFetch<{
    search: ShopifyConnection<ShopifyProductRaw>;
  }>({
    query: SEARCH_PRODUCTS,
    variables: { query },
  });

  return data.search.nodes.map(reshapeProduct);
}

// ---- Cart operations -------------------------------------------------------

export async function createCart(): Promise<Cart> {
  const data = await shopifyFetch<{
    cartCreate: { cart: ShopifyCartRaw };
  }>({
    query: CREATE_CART,
  });

  return reshapeCart(data.cartCreate.cart);
}

export async function addToCart(
  cartId: string,
  variantId: string,
  quantity = 1,
): Promise<Cart> {
  const data = await shopifyFetch<{
    cartLinesAdd: { cart: ShopifyCartRaw };
  }>({
    query: ADD_TO_CART,
    variables: {
      cartId,
      lines: [{ merchandiseId: variantId, quantity }],
    },
  });

  return reshapeCart(data.cartLinesAdd.cart);
}

export async function updateCartLine(
  cartId: string,
  lineId: string,
  quantity: number,
): Promise<Cart> {
  const data = await shopifyFetch<{
    cartLinesUpdate: { cart: ShopifyCartRaw };
  }>({
    query: UPDATE_CART_LINE,
    variables: {
      cartId,
      lines: [{ id: lineId, quantity }],
    },
  });

  return reshapeCart(data.cartLinesUpdate.cart);
}

export async function removeFromCart(
  cartId: string,
  lineIds: string[],
): Promise<Cart> {
  const data = await shopifyFetch<{
    cartLinesRemove: { cart: ShopifyCartRaw };
  }>({
    query: REMOVE_FROM_CART,
    variables: { cartId, lineIds },
  });

  return reshapeCart(data.cartLinesRemove.cart);
}

export async function getCart(cartId: string): Promise<Cart | null> {
  const data = await shopifyFetch<{ cart: ShopifyCartRaw | null }>({
    query: GET_CART,
    variables: { cartId },
  });

  return data.cart ? reshapeCart(data.cart) : null;
}
