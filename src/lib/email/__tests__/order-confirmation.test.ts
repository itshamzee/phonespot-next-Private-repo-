import { describe, it, expect, vi, beforeEach } from "vitest";

// Never hit the network / send a real email from a test — capture the
// rendered HTML instead so we can assert on the guarantee wording.
const sendMock = vi.fn().mockResolvedValue({ data: { id: "test" }, error: null });
vi.mock("@/lib/email/resend", () => ({
  resend: { emails: { send: (...args: unknown[]) => sendMock(...args) } },
  EMAIL_FROM: "PhoneSpot <info@phonespot.dk>",
}));

import {
  sendOrderConfirmation,
  type OrderConfirmationItem,
} from "@/lib/email/order-confirmation";

function baseParams(items: OrderConfirmationItem[]) {
  return {
    orderId: "order_1",
    orderNumber: "1001",
    customer: { email: "kunde@example.com", name: "Test Kunde" },
    items,
    subtotal: 10000,
    discountAmount: 0,
    shippingCost: 0,
    total: 10000,
    withdrawalToken: "token123",
  };
}

const accessoryItem: OrderConfirmationItem = {
  id: "item_1",
  itemType: "sku_product",
  deviceId: null,
  skuProductId: "sku_1",
  quantity: 1,
  unitPrice: 10000,
  totalPrice: 10000,
  title: "Læder cover",
  category: "accessory",
};

const deviceItem: OrderConfirmationItem = {
  id: "item_2",
  itemType: "device",
  deviceId: "device_1",
  skuProductId: null,
  quantity: 1,
  unitPrice: 500000,
  totalPrice: 500000,
  title: "iPhone 14 · 128GB",
};

// A sku_product that is itself a graded device (e.g. sold outside the
// dedicated device flow) — category is one of DEVICE_CATEGORIES.
const deviceCategorySkuItem: OrderConfirmationItem = {
  id: "item_3",
  itemType: "sku_product",
  deviceId: null,
  skuProductId: "sku_2",
  quantity: 1,
  unitPrice: 300000,
  totalPrice: 300000,
  title: "OnePlus 10 Pro 5G 256GB",
  category: "smartphone",
};

async function sentHtml(items: OrderConfirmationItem[]): Promise<string> {
  sendMock.mockClear();
  await sendOrderConfirmation(baseParams(items));
  const call = sendMock.mock.calls[0]![0] as { html: string };
  return call.html;
}

describe("sendOrderConfirmation — order-aware guarantee wording", () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  it("does NOT claim the 36-month guarantee for an accessory-only order", async () => {
    const html = await sentHtml([accessoryItem]);
    expect(html).not.toContain("36 mdr. garanti");
    expect(html).toContain("2 års reklamationsret");
  });

  it("claims the 36-month guarantee for a mixed order (device + accessory)", async () => {
    const html = await sentHtml([deviceItem, accessoryItem]);
    expect(html).toContain("36 mdr. garanti");
  });

  it("claims the 36-month guarantee when a sku_product is a device-category item", async () => {
    const html = await sentHtml([deviceCategorySkuItem]);
    expect(html).toContain("36 mdr. garanti");
  });

  it("falls back to the SAFE (reklamationsret) wording when items is empty", async () => {
    const html = await sentHtml([]);
    expect(html).not.toContain("36 mdr. garanti");
    expect(html).toContain("2 års reklamationsret");
  });
});
