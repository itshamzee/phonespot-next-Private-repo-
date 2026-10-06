import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

const LOC = "00000000-0000-4000-8000-000000000030";
const REG = "00000000-0000-4000-8000-000000000031";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(`location_id=${LOC}&register_id=${REG}`),
}));

const api = vi.hoisted(() => ({ calls: [] as Array<{ url: string; body?: Record<string, unknown> }> }));

vi.mock("@/lib/pos/client", () => ({
  posJson: vi.fn(async (url: string, init?: { body?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    api.calls.push({ url, body });
    if (init?.body) {
      return { sessionId: "s1", expectedCash: 0, countedCash: 0, difference: 0, expectedCard: 150000, countedCard: 150000, cardDifference: 0 };
    }
    return {
      registers: [
        {
          id: REG, name: "Kasse 1", code: "V1", locationId: LOC,
          openSession: { id: "s1", openedAt: "2026-10-06T08:00:00Z", openedByName: "Mikkel", openingFloat: 0, netCashPayments: 0, expectedCash: 0, netCardPayments: 150000 },
        },
      ],
      history: [
        {
          id: "h1", openedAt: "2026-10-05T08:00:00Z", closedAt: "2026-10-05T17:00:00Z", openingFloat: 0, countedCash: 1000, expectedCash: 1000,
          difference: 0, cashToBank: 0, locked: true, expenses: [], adjustments: [], finalDifference: 0, notes: null,
          expectedCard: 189900, countedCard: 198900, cardDifference: 9000, cardNote: "Slåfejl på bon 12",
        },
      ],
    };
  }),
}));

import SessionPage from "../page";

beforeEach(() => {
  api.calls = [];
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(cleanup);

describe("Kassesession card reconciliation", () => {
  it("shows card sales, history card figures, and gates closing on the terminal total and note", async () => {
    render(<SessionPage />);
    expect(await screen.findByText("Kortsalg i kassen")).toBeTruthy();
    expect(screen.getByText(/Slåfejl på bon 12/)).toBeTruthy();

    const closeBtn = screen.getByRole("button", { name: "Luk og lås kassen" }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText("Optalt kontant (kr)"), { target: { value: "0" } });
    expect(closeBtn.disabled).toBe(true); // terminal total missing

    const terminal = screen.getByLabelText("Total fra terminalens dagsrapport (kr)");
    fireEvent.change(terminal, { target: { value: "1.989" } });
    expect(screen.getByText("Tjek bonerne for slåfejl", { exact: false })).toBeTruthy();
    expect(closeBtn.disabled).toBe(true); // difference needs a note

    fireEvent.change(screen.getByLabelText("Note til kortdifferencen"), { target: { value: "Slåfejl" } });
    expect(closeBtn.disabled).toBe(false);

    fireEvent.change(terminal, { target: { value: "1500" } });
    expect(screen.queryByText("Tjek bonerne for slåfejl", { exact: false })).toBeNull();
    expect(closeBtn.disabled).toBe(false);

    fireEvent.click(closeBtn);
    await waitFor(() => expect(api.calls.some((c) => c.body?.action === "close")).toBe(true));
    const close = api.calls.find((c) => c.body?.action === "close")!.body!;
    expect(close.countedCard).toBe(150000);
    expect(close.cardNote).toBe("Slåfejl");
  });
});
