import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("location_id=L1"),
}));

const net = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock("@/lib/pos/client", () => ({
  posFetch: vi.fn(async () => ({ ok: true, json: async () => ({ permissions: net.permissions }) })),
  posJson: vi.fn(async (url: string) => {
    if (url.startsWith("/api/pos/session")) return { registers: [] };
    return { summary: null };
  }),
}));

import CashupPage from "../page";

beforeEach(() => {
  net.permissions = [];
});
afterEach(cleanup);

describe("Dagsopgørelse eksport", () => {
  it("skjuler PDF/CSV uden tilladelsen Eksportere", async () => {
    render(<CashupPage />);
    expect(await screen.findByText(/Eksport kræver tilladelsen Eksportere/)).toBeTruthy();
    expect(screen.queryByText("Hent PDF")).toBeNull();
    expect(screen.queryByText(/Hent CSV/)).toBeNull();
  });

  it("viser PDF/CSV med tilladelsen", async () => {
    net.permissions = ["eksportere"];
    render(<CashupPage />);
    await waitFor(() => expect(screen.getByText("Hent PDF")).toBeTruthy());
    expect(screen.getByText(/Hent CSV/)).toBeTruthy();
  });
});
