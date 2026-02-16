import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Set environment variables BEFORE importing the client so the module-level
// constants pick them up.
// ---------------------------------------------------------------------------
const TEST_DOMAIN = "test-store.myshopify.com";
const TEST_TOKEN = "test-storefront-token";

vi.stubEnv("SHOPIFY_STORE_DOMAIN", TEST_DOMAIN);
vi.stubEnv("SHOPIFY_STOREFRONT_ACCESS_TOKEN", TEST_TOKEN);

// Dynamic import so env vars are in place when the module initialises.
// We reset modules between tests to guarantee a fresh import each time.
const clientModule = () => import("../client");

// ---- Helpers ---------------------------------------------------------------

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Internal Server Error",
    json: () => Promise.resolve({ data }),
  });
}

function mockFetchErrorResponse(errors: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve({ data: null, errors }),
  });
}

// ---- Fixtures --------------------------------------------------------------

const RAW_PRODUCT = {
  id: "gid://shopify/Product/1",
  handle: "test-product",
  title: "Test Product",
  description: "A test product",
  descriptionHtml: "<p>A test product</p>",
  vendor: "TestVendor",
  productType: "Phone",
  tags: ["test"],
  availableForSale: true,
  priceRange: {
    minVariantPrice: { amount: "99.00", currencyCode: "DKK" },
    maxVariantPrice: { amount: "99.00", currencyCode: "DKK" },
  },
  images: {
    nodes: [
      { url: "https://cdn.shopify.com/img.jpg", altText: "photo", width: 800, height: 600 },
    ],
  },
  variants: {
    nodes: [
      {
        id: "gid://shopify/ProductVariant/1",
        title: "Default",
        availableForSale: true,
        selectedOptions: [{ name: "Title", value: "Default" }],
        price: { amount: "99.00", currencyCode: "DKK" },
        compareAtPrice: null,
      },
    ],
  },
  seo: { title: "Test Product", description: "A test product" },
};

// ---- Tests -----------------------------------------------------------------

describe("shopifyFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct headers and URL", async () => {
    const fetchSpy = mockFetchResponse({ product: RAW_PRODUCT });
    vi.stubGlobal("fetch", fetchSpy);

    const { shopifyFetch } = await clientModule();
    await shopifyFetch({ query: "query { shop { name } }" });

    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://${TEST_DOMAIN}/api/2024-10/graphql.json`,
    );
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(
      (options.headers as Record<string, string>)[
        "X-Shopify-Storefront-Access-Token"
      ],
    ).toBe(TEST_TOKEN);
  });

  it("throws on non-200 response", async () => {
    vi.stubGlobal("fetch", mockFetchResponse(null, false, 500));

    const { shopifyFetch } = await clientModule();

    await expect(
      shopifyFetch({ query: "query { shop { name } }" }),
    ).rejects.toThrow("Shopify API error: 500");
  });

  it("throws on GraphQL errors", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchErrorResponse([{ message: "Field not found" }]),
    );

    const { shopifyFetch } = await clientModule();

    await expect(
      shopifyFetch({ query: "query { bad }" }),
    ).rejects.toThrow("Shopify GraphQL error");
  });
});

describe("getProduct", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a reshaped product with flat images and variants arrays", async () => {
    vi.stubGlobal("fetch", mockFetchResponse({ product: RAW_PRODUCT }));

    const { getProduct } = await clientModule();
    const product = await getProduct("test-product");

    expect(product).not.toBeNull();
    // Images should be a flat array, not { nodes: [...] }
    expect(Array.isArray(product!.images)).toBe(true);
    expect(product!.images).toHaveLength(1);
    expect(product!.images[0].url).toBe("https://cdn.shopify.com/img.jpg");

    // Variants should be a flat array
    expect(Array.isArray(product!.variants)).toBe(true);
    expect(product!.variants).toHaveLength(1);
    expect(product!.variants[0].id).toBe("gid://shopify/ProductVariant/1");

    // Other fields pass through
    expect(product!.handle).toBe("test-product");
    expect(product!.title).toBe("Test Product");
  });

  it("returns null when product does not exist", async () => {
    vi.stubGlobal("fetch", mockFetchResponse({ product: null }));

    const { getProduct } = await clientModule();
    const product = await getProduct("nonexistent");

    expect(product).toBeNull();
  });
});
