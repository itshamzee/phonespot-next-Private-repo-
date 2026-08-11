// @vitest-environment node
//
// Route-level integration test: exercises auth wiring (503/401/200) and the
// json/csv response formats through the real GET handler, with Supabase
// mocked out. Grouping/quantity edge cases are covered in the pure-function
// tests at src/lib/feeds/__tests__/partner-data.test.ts — this file is about
// the HTTP contract, not the data shaping.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

type MockDevice = Record<string, unknown>;

const mockDevices: MockDevice[] = [];

function makeQueryBuilder() {
  const builder: PromiseLike<{ data: MockDevice[]; error: null }> & Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    not: () => builder,
    gt: () => builder,
    in: () => builder,
    then: (resolve: (value: { data: MockDevice[]; error: null }) => unknown) =>
      resolve({ data: mockDevices, error: null }),
  } as never;
  return builder;
}

vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: () => makeQueryBuilder(),
  }),
}));

import { GET } from "../route";

const TEMPLATE = {
  id: "t1",
  display_name: "iPhone 13 128GB",
  brand: "Apple",
  category: "iphone",
  slug: "iphone-13",
  status: "published",
  images: ["https://cdn.phonespot.dk/iphone-13.jpg"],
  default_attributes: {},
};

let originalToken: string | undefined;

beforeEach(() => {
  originalToken = process.env.PARTNER_FEED_TOKEN;
  mockDevices.length = 0;
  mockDevices.push({
    id: "d1",
    grade: "A",
    storage: "128GB",
    color: "Sort",
    selling_price: 350000,
    vat_scheme: "regular",
    source: "inhouse",
    source_stock: 0,
    battery_health: 95,
    barcode: "PS0001",
    template: TEMPLATE,
  });
});

afterEach(() => {
  if (originalToken === undefined) delete process.env.PARTNER_FEED_TOKEN;
  else process.env.PARTNER_FEED_TOKEN = originalToken;
});

function makeRequest(query = "", headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/feeds/partner${query}`, { headers });
}

describe("GET /api/feeds/partner", () => {
  it("returns 503 when no token is configured server-side, regardless of what the caller sends", async () => {
    delete process.env.PARTNER_FEED_TOKEN;
    const res = await GET(makeRequest("", { "x-api-key": "whatever" }));
    expect(res.status).toBe(503);
  });

  it("returns 401 for a wrong token", async () => {
    process.env.PARTNER_FEED_TOKEN = "correct-token";
    const res = await GET(makeRequest("", { "x-api-key": "wrong-token" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 with feed rows for a correct token", async () => {
    process.env.PARTNER_FEED_TOKEN = "correct-token";
    const res = await GET(makeRequest("", { "x-api-key": "correct-token" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.rows[0].brand).toBe("Apple");
    expect(body.rows[0].vatScheme).toBe("regular");
    expect(body.rows[0].quantity).toBe(1);
  });

  it("never sets a public/CDN cache header", async () => {
    process.env.PARTNER_FEED_TOKEN = "correct-token";
    const res = await GET(makeRequest("", { "x-api-key": "correct-token" }));
    const cacheControl = res.headers.get("cache-control") ?? "";
    expect(cacheControl).toMatch(/private/);
    expect(cacheControl).not.toMatch(/public/);
  });

  it("returns CSV with a header row when format=csv", async () => {
    process.env.PARTNER_FEED_TOKEN = "correct-token";
    const res = await GET(makeRequest("?format=csv", { "x-api-key": "correct-token" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);

    const text = await res.text();
    const [header, firstRow] = text.trim().split("\r\n");
    expect(header).toBe(
      "variant_key,barcodes,gtin,brand,display_name,category,storage,colour,grade,grade_label,product_url,image_url,price_dkk,currency,vat_scheme,quantity,battery_health,warranty_months",
    );
    expect(firstRow).toContain("Apple");
    expect(firstRow).toContain("regular");
  });

  it("authenticates via Bearer token as well as X-Api-Key", async () => {
    process.env.PARTNER_FEED_TOKEN = "correct-token";
    const res = await GET(makeRequest("", { authorization: "Bearer correct-token" }));
    expect(res.status).toBe(200);
  });
});
