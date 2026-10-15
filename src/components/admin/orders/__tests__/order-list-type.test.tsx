import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { OrderList } from "../order-list";

const urls: string[] = [];

beforeEach(() => {
  urls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(url);
      return { json: async () => (url.includes("locations") ? [] : { orders: [], total: 0 }) };
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OrderList (webshop-ordrer)", () => {
  it("fetches only online orders by default and offers no POS channel", async () => {
    render(<OrderList initialOrders={[]} initialTotal={0} initialPage={1} />);
    await waitFor(() => expect(urls.some((u) => u.startsWith("/api/shipping/orders"))).toBe(true));
    for (const u of urls.filter((x) => x.startsWith("/api/shipping/orders"))) {
      expect(new URL(u, "http://x").searchParams.get("type")).toBe("online");
    }
    const channel = screen.getByDisplayValue("Webshop") as HTMLSelectElement;
    const labels = Array.from(channel.options).map((o) => o.textContent);
    expect(labels).not.toContain("POS");
    expect(labels).not.toContain("Alle");
  });
});
