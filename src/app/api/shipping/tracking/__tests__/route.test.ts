// @vitest-environment node
//
// This route is the shipping-confirmation email path fired by "Opret
// forsendelse" in the admin order panel (order-status-actions.tsx ->
// /api/shipping/labels then /api/shipping/tracking). It used to call
// ShippingConfirmationEmail with no `usps` prop, which falls back to
// BRAND.usps -> unconditional "36 mdr. garanti" even for an accessory-only
// order. This test pins the fix: the route must compute usps from the
// order's actual items (same helper as fulfill/route.ts and
// refund/route.ts) and never over-claim the guarantee.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const sendMock = vi.fn().mockResolvedValue({ data: { id: "email_1" }, error: null });
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => sendMock(...args) };
  },
}));

// Mock the template component itself so the test can assert directly on the
// `usps` prop it was called with, instead of rendering full email HTML.
const templateMock = vi.fn((_props: { usps?: readonly string[] }) => "TEMPLATE_ELEMENT");
vi.mock("@/lib/email/templates/shipping-confirmation", () => ({
  default: (props: { usps?: readonly string[] }) => templateMock(props),
}));

type MockOrder = Record<string, unknown> | null;
let mockOrder: MockOrder = null;

function makeQueryBuilder(): Record<string, unknown> {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    single: () =>
      mockOrder
        ? Promise.resolve({ data: mockOrder, error: null })
        : Promise.resolve({ data: null, error: { message: "not found" } }),
  };
  return builder;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => makeQueryBuilder() }),
}));

import { POST } from "../route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/shipping/tracking", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function usedProps(): { usps?: readonly string[] } {
  expect(templateMock).toHaveBeenCalledTimes(1);
  return templateMock.mock.calls[0]![0];
}

describe("POST /api/shipping/tracking", () => {
  beforeEach(() => {
    sendMock.mockClear();
    templateMock.mockClear();
    mockOrder = null;
  });

  it("does not claim the 36-month guarantee for an accessory-only order", async () => {
    mockOrder = {
      order_number: "1001",
      tracking_number: "TRACK1",
      shipping_method: "gls",
      customer: { email: "kunde@example.com", name: "Kunde" },
      items: [{ item_type: "sku_product", sku_product: { category: "accessory" } }],
    };
    const res = await POST(makeRequest({ order_id: "order_1" }));
    expect(res.status).toBe(200);

    const props = usedProps();
    expect(props.usps).not.toContain("36 mdr. garanti");
    expect(props.usps).toContain("2 års reklamationsret");
  });

  it("claims the 36-month guarantee when the order contains a device", async () => {
    mockOrder = {
      order_number: "1002",
      tracking_number: "TRACK2",
      shipping_method: "postnord",
      customer: { email: "kunde@example.com", name: "Kunde" },
      items: [{ item_type: "device", sku_product: null }],
    };
    await POST(makeRequest({ order_id: "order_2" }));

    const props = usedProps();
    expect(props.usps).toContain("36 mdr. garanti");
  });

  it("claims the 36-month guarantee for a mixed order (device + accessory)", async () => {
    mockOrder = {
      order_number: "1003",
      tracking_number: "TRACK3",
      shipping_method: "dao",
      customer: { email: "kunde@example.com", name: "Kunde" },
      items: [
        { item_type: "device", sku_product: null },
        { item_type: "sku_product", sku_product: { category: "accessory" } },
      ],
    };
    await POST(makeRequest({ order_id: "order_3" }));

    const props = usedProps();
    expect(props.usps).toContain("36 mdr. garanti");
  });

  it("claims the 36-month guarantee when a sku_product item is itself a device category", async () => {
    mockOrder = {
      order_number: "1004",
      tracking_number: "TRACK4",
      shipping_method: "gls",
      customer: { email: "kunde@example.com", name: "Kunde" },
      items: [{ item_type: "sku_product", sku_product: { category: "smartphone" } }],
    };
    await POST(makeRequest({ order_id: "order_4" }));

    const props = usedProps();
    expect(props.usps).toContain("36 mdr. garanti");
  });

  it("falls back to the safe (reklamationsret) wording when items is missing entirely", async () => {
    mockOrder = {
      order_number: "1005",
      tracking_number: "TRACK5",
      shipping_method: "gls",
      customer: { email: "kunde@example.com", name: "Kunde" },
      // no `items` key at all — must not throw, must not over-claim
    };
    const res = await POST(makeRequest({ order_id: "order_5" }));
    expect(res.status).toBe(200);

    const props = usedProps();
    expect(props.usps).not.toContain("36 mdr. garanti");
    expect(props.usps).toContain("2 års reklamationsret");
  });

  it("falls back to the safe wording when an item's sku_product link is null (malformed data)", async () => {
    mockOrder = {
      order_number: "1006",
      tracking_number: "TRACK6",
      shipping_method: "gls",
      customer: { email: "kunde@example.com", name: "Kunde" },
      items: [{ item_type: "sku_product", sku_product: null }],
    };
    const res = await POST(makeRequest({ order_id: "order_6" }));
    expect(res.status).toBe(200);

    const props = usedProps();
    expect(props.usps).not.toContain("36 mdr. garanti");
  });

  it("returns 400 without order_id and never touches Supabase or Resend", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown order and never sends an email", async () => {
    mockOrder = null;
    const res = await POST(makeRequest({ order_id: "does-not-exist" }));
    expect(res.status).toBe(404);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the order has no tracking number", async () => {
    mockOrder = {
      order_number: "1007",
      tracking_number: null,
      shipping_method: "gls",
      customer: { email: "kunde@example.com" },
      items: [],
    };
    const res = await POST(makeRequest({ order_id: "order_7" }));
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
