import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// D2: the share of a sale paid with an opkøb only comes back as tilgodebevis.

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("location_id=L1&register_id=R1&q=V1-000123"),
}));

const order = {
  id: "o1",
  orderNumber: "POS-1",
  receiptNumber: "V1-000123",
  confirmedAt: null,
  total: 500000,
  locationId: "L1",
  customerName: null,
  opkoebPaid: 300000,
  nonVoucherRefunded: 0,
  lines: [
    {
      id: "i1",
      itemType: "free_text",
      deviceId: null,
      skuProductId: null,
      description: "Smoke",
      quantity: 1,
      unitPrice: 500000,
      totalPrice: 500000,
      discountAmount: 0,
      vatAmount: 0,
      vatScheme: "regular",
      purchasePrice: null,
      returned: { quantity: 0, total: 0, discount: 0, vat: 0 },
      remaining: 1,
      deviceStatus: null,
      lagersalg: false,
    },
  ],
};

const posJson = vi.hoisted(() => vi.fn());
vi.mock("@/lib/pos/client", () => ({ posJson, printBase64Pdf: vi.fn() }));

import ReturnPage from "../page";

afterEach(() => {
  cleanup();
  posJson.mockReset();
});

async function setup(o = order) {
  posJson.mockResolvedValue({ order: o, terminalKind: "manual" });
  render(<ReturnPage />);
  fireEvent.change(await screen.findByLabelText("Antal der returneres: Smoke"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Returårsag"), { target: { value: "Fortrudt" } });
}

describe("Returnering af et salg betalt med opkøb", () => {
  it("tells staff how much may go back as money, and caps a new cash line at it", async () => {
    await setup();
    const notice = screen.getByText(/kan betales tilbage kontant/).textContent!.replace(/\s/g, " ");
    expect(notice).toMatch(/Højst 2\.000(,00)? kr\.? kan betales tilbage kontant/);
    fireEvent.click(screen.getByRole("button", { name: "Kontant" }));
    expect((screen.getByLabelText("Beløb Kontant") as HTMLInputElement).value).toBe("2000,00");
    fireEvent.click(screen.getByRole("button", { name: "Tilgodebevis" }));
    expect((screen.getByLabelText("Beløb Tilgodebevis") as HTMLInputElement).value).toBe("3000,00");
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByRole("button", { name: "Opret kreditnota" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("refuses the whole amount in cash before submitting", async () => {
    await setup();
    fireEvent.click(screen.getByRole("button", { name: "Kontant" }));
    fireEvent.change(screen.getByLabelText("Beløb Kontant"), { target: { value: "5000" } });
    expect(screen.getByRole("alert").textContent).toBe(
      "Den del af købet, der blev betalt med et opkøb, kan kun refunderes som tilgodebevis",
    );
    expect((screen.getByRole("button", { name: "Opret kreditnota" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows no notice for a sale without opkøb", async () => {
    await setup({ ...order, opkoebPaid: 0 });
    expect(screen.queryByText(/kan kun refunderes som tilgodebevis/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Kontant" }));
    expect((screen.getByLabelText("Beløb Kontant") as HTMLInputElement).value).toBe("5000,00");
  });
});
