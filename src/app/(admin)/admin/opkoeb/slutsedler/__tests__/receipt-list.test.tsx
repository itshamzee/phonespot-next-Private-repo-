import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const json = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

const rows = [
  { id: "r1", receipt_number: "SS-2026-0001", status: "confirmed", total_amount: 1000, location_id: "l1", seller_name: "Anna", seller_type: "private", created_at: "2026-11-09T08:00:00Z", created_by: "s1", created_by_name: "Vibeke Vejle", suspected_at: "2026-11-09T09:00:00Z", has_signed_scan: false, has_invoice: false, item_count: 1 },
  { id: "r2", receipt_number: "SS-2026-0002", status: "paid", total_amount: 2000, location_id: "l1", seller_name: "Bo", seller_type: "private", created_at: "2026-11-09T08:00:00Z", created_by: "s1", created_by_name: null, suspected_at: null, has_signed_scan: true, has_invoice: false, item_count: 2 },
];

vi.mock("@/lib/buyback/admin-fetch", () => ({
  staffFetch: vi.fn(async (url: string) => {
    if (url.startsWith("/api/trade-in/receipts")) return json(200, rows);
    if (url === "/api/pos/locations") return json(200, { locations: [{ id: "l1", slug: "vejle", name: "Vejle" }] });
    return json(404, {});
  }),
}));

import ReceiptsPage from "../page";

afterEach(cleanup);

describe("slutseddel-listen", () => {
  it("viser Mistanke-mærket kun på den mistænkte række, og medarbejdernavnet fra serveren", async () => {
    render(<ReceiptsPage />);
    const row1 = (await screen.findByText("SS-2026-0001")).closest("tr")!;
    const row2 = screen.getByText("SS-2026-0002").closest("tr")!;
    expect(within(row1).getByText("Mistanke")).toBeTruthy();
    expect(within(row2).queryByText("Mistanke")).toBeNull();
    expect(within(row1).getByText("Vibeke Vejle")).toBeTruthy();
    expect(screen.queryByText("Kollega")).toBeNull();
  });

  it("forklarer, at Mangler scan kun dækker de seneste 100", async () => {
    render(<ReceiptsPage />);
    await screen.findByText("SS-2026-0001");
    expect(screen.getByText(/kun de seneste 100 slutsedler/i)).toBeTruthy();
  });
});
