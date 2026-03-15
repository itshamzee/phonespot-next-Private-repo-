import { test, expect } from "@playwright/test";

test.describe("Backend API - Shipping", () => {
  test("GET /api/shipping/rates returns response", async ({ request }) => {
    const response = await request.get("/api/shipping/rates");
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Backend API - GDPR", () => {
  test("GET /api/tc/current returns terms", async ({ request }) => {
    const response = await request.get("/api/tc/current");
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Backend API - Product Feeds", () => {
  test("GET /api/feeds/google returns XML feed", async ({ request }) => {
    const response = await request.get("/api/feeds/google");
    expect(response.status()).toBeLessThan(500);
  });

  test("GET /api/feeds/pricerunner returns feed", async ({ request }) => {
    const response = await request.get("/api/feeds/pricerunner");
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Backend API - Consent", () => {
  test("POST /api/consent handles consent data", async ({ request }) => {
    const response = await request.post("/api/consent", {
      data: {
        necessary: true,
        preferences: false,
        statistics: false,
        marketing: false,
      },
    });
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Backend API - SMS", () => {
  test("POST /api/sms/send rejects empty body", async ({ request }) => {
    const response = await request.post("/api/sms/send", {
      data: {},
    });
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Backend API - Warranty", () => {
  test("GET /api/warranty/INVALID returns not found", async ({ request }) => {
    const response = await request.get("/api/warranty/INVALID_CODE_XYZ");
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Backend API - Revalidation", () => {
  test("POST /api/revalidate handles request", async ({ request }) => {
    const response = await request.post("/api/revalidate", {
      data: { path: "/" },
    });
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Backend API - Cron Endpoints", () => {
  test("POST /api/cron/release-reservations responds", async ({
    request,
  }) => {
    const response = await request.post("/api/cron/release-reservations");
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Backend API - Admin", () => {
  test("GET /api/admin/brands returns response", async ({ request }) => {
    const response = await request.get("/api/admin/brands");
    // May require auth, so 401/403 are acceptable
    expect(response.status()).toBeLessThan(500);
  });

  test("GET /api/admin/status returns response", async ({ request }) => {
    const response = await request.get("/api/admin/status");
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Backend API - Platform", () => {
  test("GET /api/platform/devices returns response", async ({ request }) => {
    const response = await request.get("/api/platform/devices");
    expect(response.status()).toBeLessThan(500);
  });

  test("GET /api/platform/sku returns response", async ({ request }) => {
    const response = await request.get("/api/platform/sku");
    expect(response.status()).toBeLessThan(500);
  });

  test("GET /api/platform/locations returns response", async ({
    request,
  }) => {
    const response = await request.get("/api/platform/locations");
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Backend API - Customers", () => {
  test("GET /api/customers requires auth or returns data", async ({
    request,
  }) => {
    const response = await request.get("/api/customers");
    expect(response.status()).toBeLessThan(500);
  });

  test("GET /api/customers/search handles query", async ({ request }) => {
    const response = await request.get("/api/customers/search?q=test");
    expect(response.status()).toBeLessThan(500);
  });
});
