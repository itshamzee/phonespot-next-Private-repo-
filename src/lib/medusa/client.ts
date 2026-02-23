// ---------------------------------------------------------------------------
// Medusa.js v2 API client
// ---------------------------------------------------------------------------
// Exposes the same public API as @/lib/shopify/client so pages can switch
// imports with no other changes.

import type {
  Cart,
  CartItem,
  Collection,
  Money,
  Product,
  ProductVariant,
  ShopifyImage,
  MedusaProduct,
  MedusaVariant,
  MedusaCart,
  MedusaCartItem,
  MedusaCollection,
} from "./types";

// ---- Configuration ---------------------------------------------------------

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
  "";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

// ---- Core fetch ------------------------------------------------------------

async function medusaFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BACKEND_URL}/store${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Medusa API error: ${response.status} ${response.statusText} — ${text}`);
  }

  return response.json() as Promise<T>;
}

// ---- Reshape helpers -------------------------------------------------------
// These convert Medusa's response format into our existing Product/Cart types
// so pages and components need zero changes.

function toMoney(amount: number, currencyCode: string): Money {
  return {
    amount: (amount / 100).toFixed(2), // Medusa stores amounts in cents
    currencyCode: currencyCode.toUpperCase(),
  };
}

function reshapeMedusaImage(
  img: { id: string; url: string; rank: number },
): ShopifyImage {
  return {
    url: img.url,
    altText: null,
    width: 800,
    height: 800,
  };
}

function reshapeMedusaVariant(
  v: MedusaVariant,
  productOptions: MedusaProduct["options"],
): ProductVariant {
  // Get price — prefer calculated_price, fallback to first price
  const price = v.calculated_price
    ? toMoney(v.calculated_price.calculated_amount, v.calculated_price.currency_code)
    : v.prices.length > 0
      ? toMoney(v.prices[0].amount, v.prices[0].currency_code)
      : { amount: "0", currencyCode: "DKK" };

  const compareAtPrice = v.calculated_price &&
    v.calculated_price.original_amount > v.calculated_price.calculated_amount
    ? toMoney(v.calculated_price.original_amount, v.calculated_price.currency_code)
    : null;

  // Map variant options to { name, value } using product options
  const selectedOptions = v.options.map((vo) => {
    const productOption = productOptions.find((po) =>
      po.values.some((pov) => pov.id === vo.id),
    );
    return {
      name: productOption?.title ?? "Option",
      value: vo.value,
    };
  });

  const available = v.manage_inventory
    ? v.inventory_quantity > 0 || v.allow_backorder
    : true;

  return {
    id: v.id,
    title: v.title,
    availableForSale: available,
    selectedOptions,
    price,
    compareAtPrice,
  };
}

function reshapeMedusaProduct(raw: MedusaProduct): Product {
  const variants = raw.variants.map((v) =>
    reshapeMedusaVariant(v, raw.options),
  );

  const prices = variants
    .map((v) => parseFloat(v.price.amount))
    .filter((p) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const currencyCode = variants[0]?.price.currencyCode ?? "DKK";

  const images: ShopifyImage[] = raw.images.map(reshapeMedusaImage);
  if (images.length === 0 && raw.thumbnail) {
    images.push({
      url: raw.thumbnail,
      altText: raw.title,
      width: 800,
      height: 800,
    });
  }

  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    description: raw.description ?? "",
    descriptionHtml: raw.description ?? "",
    vendor: "",
    productType: raw.type?.value ?? "",
    tags: raw.tags.map((t) => t.value),
    availableForSale: variants.some((v) => v.availableForSale),
    priceRange: {
      minVariantPrice: { amount: minPrice.toFixed(2), currencyCode },
      maxVariantPrice: { amount: maxPrice.toFixed(2), currencyCode },
    },
    images,
    variants,
    seo: {
      title: raw.title,
      description: raw.description,
    },
  };
}

function reshapeMedusaCartItem(item: MedusaCartItem): CartItem {
  return {
    id: item.id,
    quantity: item.quantity,
    cost: {
      totalAmount: toMoney(item.total, "DKK"),
    },
    merchandise: {
      id: item.variant_id,
      title: item.variant.title,
      selectedOptions: item.variant.options.map((o) => ({
        name: "Option",
        value: o.value,
      })),
      product: {
        id: item.variant.product.id,
        handle: item.variant.product.handle,
        title: item.variant.product.title,
        featuredImage: item.thumbnail
          ? { url: item.thumbnail, altText: null, width: 400, height: 400 }
          : null,
      },
    },
  };
}

function reshapeMedusaCart(raw: MedusaCart): Cart {
  return {
    id: raw.id,
    checkoutUrl: "/checkout", // Our own checkout page!
    totalQuantity: raw.items.reduce((sum, item) => sum + item.quantity, 0),
    cost: {
      subtotalAmount: toMoney(raw.subtotal, raw.currency_code),
      totalAmount: toMoney(raw.total, raw.currency_code),
      totalTaxAmount: toMoney(raw.tax_total, raw.currency_code),
    },
    lines: raw.items.map(reshapeMedusaCartItem),
  };
}

// ---- Region helper ---------------------------------------------------------

let cachedRegionId: string | null = null;

async function getDanishRegionId(): Promise<string> {
  if (cachedRegionId) return cachedRegionId;

  const data = await medusaFetch<{ regions: { id: string; currency_code: string }[] }>(
    "/regions",
  );

  const dkRegion = data.regions.find(
    (r) => r.currency_code === "dkk",
  );

  if (!dkRegion) {
    throw new Error("Danish region (DKK) not found in Medusa. Create it in Medusa Admin.");
  }

  cachedRegionId = dkRegion.id;
  return cachedRegionId;
}

// ---- Public API (same signatures as shopify/client.ts) ---------------------

export async function getProduct(handle: string): Promise<Product | null> {
  try {
    const regionId = await getDanishRegionId();
    const data = await medusaFetch<{ products: MedusaProduct[] }>(
      `/products?handle=${encodeURIComponent(handle)}&region_id=${regionId}&fields=*variants.calculated_price`,
    );

    if (data.products.length === 0) return null;
    return reshapeMedusaProduct(data.products[0]);
  } catch {
    return null;
  }
}

export async function getCollectionProducts(
  handle: string,
  sortKey?: string,
): Promise<Collection | null> {
  try {
    const regionId = await getDanishRegionId();

    // First get the collection by handle
    const collectionData = await medusaFetch<{
      collections: MedusaCollection[];
    }>(`/collections?handle=${encodeURIComponent(handle)}`);

    if (collectionData.collections.length === 0) return null;
    const collection = collectionData.collections[0];

    // Then get products in this collection
    let sort = "";
    if (sortKey === "PRICE_ASC") sort = "&order=variants.prices.amount";
    else if (sortKey === "PRICE_DESC") sort = "&order=-variants.prices.amount";
    else if (sortKey === "TITLE_ASC") sort = "&order=title";
    else if (sortKey === "CREATED_AT") sort = "&order=-created_at";

    const productData = await medusaFetch<{ products: MedusaProduct[] }>(
      `/products?collection_id=${collection.id}&region_id=${regionId}&fields=*variants.calculated_price&limit=100${sort}`,
    );

    return {
      handle: collection.handle,
      title: collection.title,
      description: "",
      image: null,
      seo: { title: collection.title, description: null },
      products: productData.products.map(reshapeMedusaProduct),
    };
  } catch {
    return null;
  }
}

export async function getCollections(): Promise<Collection[]> {
  try {
    const data = await medusaFetch<{ collections: MedusaCollection[] }>(
      "/collections",
    );

    return data.collections.map((c) => ({
      handle: c.handle,
      title: c.title,
      description: "",
      image: null,
      seo: { title: c.title, description: null },
      products: [],
    }));
  } catch {
    return [];
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  try {
    const regionId = await getDanishRegionId();
    const data = await medusaFetch<{ products: MedusaProduct[] }>(
      `/products?q=${encodeURIComponent(query)}&region_id=${regionId}&fields=*variants.calculated_price&limit=20`,
    );

    return data.products.map(reshapeMedusaProduct);
  } catch {
    return [];
  }
}

// ---- Cart operations -------------------------------------------------------

export async function createCart(): Promise<Cart> {
  const regionId = await getDanishRegionId();

  const data = await medusaFetch<{ cart: MedusaCart }>("/carts", {
    method: "POST",
    body: JSON.stringify({ region_id: regionId }),
  });

  return reshapeMedusaCart(data.cart);
}

export async function addToCart(
  cartId: string,
  variantId: string,
  quantity = 1,
): Promise<Cart> {
  const data = await medusaFetch<{ cart: MedusaCart }>(
    `/carts/${cartId}/line-items`,
    {
      method: "POST",
      body: JSON.stringify({ variant_id: variantId, quantity }),
    },
  );

  return reshapeMedusaCart(data.cart);
}

export async function updateCartLine(
  cartId: string,
  lineId: string,
  quantity: number,
): Promise<Cart> {
  const data = await medusaFetch<{ cart: MedusaCart }>(
    `/carts/${cartId}/line-items/${lineId}`,
    {
      method: "POST",
      body: JSON.stringify({ quantity }),
    },
  );

  return reshapeMedusaCart(data.cart);
}

export async function removeFromCart(
  cartId: string,
  lineIds: string[],
): Promise<Cart> {
  // Medusa removes one line at a time
  let cart: MedusaCart | null = null;
  for (const lineId of lineIds) {
    const data = await medusaFetch<{ cart: MedusaCart }>(
      `/carts/${cartId}/line-items/${lineId}`,
      { method: "DELETE" },
    );
    cart = data.cart;
  }

  if (!cart) {
    const data = await medusaFetch<{ cart: MedusaCart }>(`/carts/${cartId}`);
    cart = data.cart;
  }

  return reshapeMedusaCart(cart);
}

export async function getCart(cartId: string): Promise<Cart | null> {
  try {
    const data = await medusaFetch<{ cart: MedusaCart }>(`/carts/${cartId}`);
    return reshapeMedusaCart(data.cart);
  } catch {
    return null;
  }
}

// ---- Checkout operations (new — not in Shopify client) ---------------------

export async function getShippingOptions(cartId: string) {
  return medusaFetch<{
    shipping_options: {
      id: string;
      name: string;
      amount: number;
      provider_id: string;
    }[];
  }>(`/shipping-options/${cartId}`);
}

export async function addShippingMethod(
  cartId: string,
  optionId: string,
) {
  return medusaFetch<{ cart: MedusaCart }>(
    `/carts/${cartId}/shipping-methods`,
    {
      method: "POST",
      body: JSON.stringify({ option_id: optionId }),
    },
  );
}

export async function initiatePaymentSession(cartId: string) {
  return medusaFetch<{ payment_collection: { id: string } }>(
    `/carts/${cartId}/payment-sessions`,
    { method: "POST" },
  );
}

export async function completeCart(cartId: string) {
  return medusaFetch<{ type: string; order: { id: string; display_id: number } }>(
    `/carts/${cartId}/complete`,
    { method: "POST" },
  );
}

export async function updateCartCustomer(
  cartId: string,
  data: {
    email: string;
    shipping_address: {
      first_name: string;
      last_name: string;
      address_1: string;
      address_2?: string;
      city: string;
      postal_code: string;
      country_code: string;
      phone?: string;
    };
    billing_address?: {
      first_name: string;
      last_name: string;
      address_1: string;
      address_2?: string;
      city: string;
      postal_code: string;
      country_code: string;
      phone?: string;
    };
  },
) {
  return medusaFetch<{ cart: MedusaCart }>(`/carts/${cartId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
