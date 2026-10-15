import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SalesFilterBar, SalesPager, SalesTable, SalesTotalsCard } from "../_components/sales-list";
import { parseSalesFilters, type SaleListRow } from "@/lib/pos/sales-history";

const filters = parseSalesFilters({ periode: "uge", q: "Hansen" }, new Date("2026-10-14T10:00:00Z"));

const row: SaleListRow = {
  id: "11111111-1111-4111-8111-111111111111",
  orderNumber: "V1-000001",
  createdAt: "2026-10-14T08:15:00Z",
  customerName: null,
  customerPhone: null,
  summary: "Skærmskift",
  caseNumbers: ["PS-2026-1189"],
  payments: "Kontant, MobilePay",
  staffName: "Mette",
  total: 169800,
  refunded: 169800,
  refundState: "fuld",
};

describe("SalesTable", () => {
  it("shows a POS sale with receipt link, case, payment, staff and returned state, and no shipping UI", () => {
    const { container } = render(<SalesTable rows={[row]} empty="tom" />);
    const link = screen.getByRole("link", { name: "V1-000001" });
    expect(link.getAttribute("href")).toBe(`/admin/kasse/salg/${row.id}`);
    expect(screen.getByText("Kunde uden navn")).toBeTruthy();
    expect(screen.getByText("Sag PS-2026-1189")).toBeTruthy();
    expect(screen.getByText("Kontant, MobilePay")).toBeTruthy();
    expect(screen.getByText("Mette")).toBeTruthy();
    expect(screen.getByText("Returneret")).toBeTruthy();
    expect(within(container).queryByText(/Ikke sendt|Afsendt|Shipmondo/)).toBeNull();
  });

  it("shows the empty text", () => {
    render(<SalesTable rows={[]} empty="Ingen kassesalg i perioden" />);
    expect(screen.getByText("Ingen kassesalg i perioden")).toBeTruthy();
  });
});

describe("SalesFilterBar", () => {
  it("marks the active period, keeps search and offers every payment method", () => {
    render(<SalesFilterBar filters={filters} />);
    expect(screen.getByRole("link", { name: "Denne uge" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "I dag" }).getAttribute("aria-current")).toBeNull();
    expect((screen.getByPlaceholderText(/Bonnr/) as HTMLInputElement).value).toBe("Hansen");
    const options = within(screen.getByRole("combobox")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toContain("Kontant");
    expect(options).toContain("Tilgodebevis");
    expect(options).toContain("Gavekort");
  });

  it("shows date inputs only for a custom period", () => {
    const { container, rerender } = render(<SalesFilterBar filters={filters} />);
    expect(container.querySelector('input[name="fra"]')).toBeNull();
    rerender(<SalesFilterBar filters={parseSalesFilters({ periode: "periode", fra: "2026-10-01", til: "2026-10-02" })} />);
    expect((container.querySelector('input[name="fra"]') as HTMLInputElement).value).toBe("2026-10-01");
  });
});

describe("SalesTotalsCard and SalesPager", () => {
  it("shows the period total, returns and per-method money", () => {
    render(
      <SalesTotalsCard
        title="I dag"
        totals={{ count: 3, total: 500000, returned: 10000, byPayment: [{ label: "Kontant", amount: 500000 }] }}
      />,
    );
    expect(screen.getByText("3 salg · retur 100 kr.", { exact: false })).toBeTruthy();
    expect(screen.getByText("Kontant")).toBeTruthy();
  });

  it("paginates with filters preserved", () => {
    render(<SalesPager filters={filters} page={2} pages={3} matching={60} />);
    expect(screen.getByRole("link", { name: "Næste" }).getAttribute("href")).toBe("/admin/kasse/salg?periode=uge&q=Hansen&side=3");
    expect(screen.getByRole("link", { name: "Forrige" }).getAttribute("href")).toBe("/admin/kasse/salg?periode=uge&q=Hansen");
  });
});
