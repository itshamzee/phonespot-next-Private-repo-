import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Set env vars before importing
process.env.MEDUSA_BACKEND_URL = "https://test.medusa-cloud.com";
process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_test_123";

describe("Medusa client", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("calls the correct Medusa endpoint with publishable key header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        regions: [{ id: "reg_dk", currency_code: "dkk" }],
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: [] }),
    });

    const { getProduct } = await import("../client");
    await getProduct("test-handle");

    // Should have called fetch with Medusa URL and publishable key
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://test.medusa-cloud.com/store/"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-publishable-api-key": "pk_test_123",
        }),
      }),
    );
  });

  it("throws on non-200 responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "error",
    });

    const { getCollections } = await import("../client");
    const result = await getCollections();
    expect(result).toEqual([]);
  });
});
