import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CartPanel } from "../_components/cart-panel";

afterEach(cleanup);

const base = {
  lines: [],
  applied: [],
  totals: { subtotal: 0, discount: 0, total: 0, vat: 0 },
  customer: null,
  discountOere: 0,
  discountReason: "",
  payChoice: { kind: "single", type: "kontant" },
  canCharge: false,
  processing: false,
  blockReason: null,
  error: "",
  hasOpenSession: true,
  onQty: vi.fn(),
  onRemove: vi.fn(),
  onPrice: vi.fn(),
  onCustomer: vi.fn(),
  onClearCustomer: vi.fn(),
  onDiscount: vi.fn(),
  onMethod: vi.fn(),
  onSplit: vi.fn(),
  onCharge: vi.fn(),
} as unknown as Parameters<typeof CartPanel>[0];

describe("CartPanel case stock", () => {
  it("shows per-line status and the amber deposit hint with a working button", () => {
    const onTakeDeposit = vi.fn();
    render(
      <CartPanel
        {...base}
        onTakeDeposit={onTakeDeposit}
        caseStock={{
          rows: [{ key: "a", name: "Skærm", status: "backorder", label: "Skal bestilles" }],
          hasBackorder: true,
          suggestDeposit: true,
        }}
      />,
    );
    expect(screen.getByText("Skal bestilles")).toBeTruthy();
    expect(screen.getByText("Del skal bestilles — overvej depositum")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tag depositum" }));
    expect(onTakeDeposit).toHaveBeenCalledTimes(1);
  });

  it("hides the hint when no deposit is suggested", () => {
    render(
      <CartPanel
        {...base}
        caseStock={{ rows: [{ key: "a", name: "Skærm", status: "reserved", label: "Reserveret" }], hasBackorder: false, suggestDeposit: false }}
      />,
    );
    expect(screen.getByText("Reserveret")).toBeTruthy();
    expect(screen.queryByText("Del skal bestilles — overvej depositum")).toBeNull();
  });
});
