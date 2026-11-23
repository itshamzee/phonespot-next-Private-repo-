import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

// Ekspedientskiftet og stregkodescanneren: mens dialogen er åben, har ingen knap fokus
// (en scanners Enter må ikke lukke eller vælge noget), og når den lukker, står fokus i
// scanfeltet som efter alle kassens andre dialoger (ikke på "Ekspedient"-knappen).

const LOC = "00000000-0000-4000-8000-000000000030";
const REG = "00000000-0000-4000-8000-000000000031";
const MADS = "00000000-0000-4000-8000-000000000041";
const LISE = "00000000-0000-4000-8000-000000000042";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("@/components/admin/shell/store-scope-context", () => ({
  useStoreScope: () => ({ scope: "vejle", ownSlug: "vejle", isOwner: false, loading: false }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    from: () => {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "or", "limit"]) b[m] = () => b;
      b.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [{ id: LOC, name: "PhoneSpot Vejle", slug: "vejle" }], error: null }).then(resolve);
      return b;
    },
  }),
}));

const op = vi.hoisted(() => ({ current: { id: "", name: "Lise" } }));

function res(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

vi.mock("@/lib/pos/client", () => ({
  printBase64Pdf: vi.fn(),
  posFetch: vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/admin/me") return res(200, { id: LISE, name: "Lise" });
    if (url.startsWith("/api/pos/operator") && (!init?.method || init.method === "GET")) {
      return res(200, {
        current: op.current,
        staff: [
          { id: MADS, name: "Mads", hasPin: true },
          { id: LISE, name: "Lise", hasPin: true },
        ],
      });
    }
    if (url === "/api/pos/operator" && init?.method === "POST") {
      op.current = { id: MADS, name: "Mads" };
      return res(200, { current: op.current });
    }
    return res(200, { devices: [], skuProducts: [] });
  }),
  posJson: vi.fn(async (url: string) => {
    if (url === "/api/pos/locations") return { locations: [{ id: LOC, slug: "vejle", name: "PhoneSpot Vejle", registers: [] }] };
    if (url.startsWith("/api/pos/session")) {
      return {
        registers: [
          {
            id: REG,
            name: "Kasse 1",
            code: "V1",
            locationId: LOC,
            openSession: { id: "s1", openedAt: "2026-10-04T08:02:00Z", openedByName: "Mikkel", openingFloat: 0, netCashPayments: 0, expectedCash: 0 },
          },
        ],
      };
    }
    if (url.startsWith("/api/pos/quick-tiles")) return { tiles: [], categories: [] };
    return {};
  }),
}));

import { KasseScreen } from "../_components/kasse-screen";

beforeEach(() => {
  op.current = { id: LISE, name: "Lise" };
});
afterEach(cleanup);

async function openSwitch() {
  render(<KasseScreen />);
  const scan = await screen.findByLabelText("Scan eller søg");
  await waitFor(() => expect(document.activeElement).toBe(scan));
  const chip = await screen.findByRole("button", { name: "Ekspedient: Lise" });
  chip.focus();
  fireEvent.click(chip);
  return { scan, chip, dialog: screen.getByRole("dialog", { name: "Skift ekspedient" }) };
}

describe("Kasse: ekspedientskift og scanneren", () => {
  it("åben: fokus på selve dialogen, ingen knap; Enter lukker ikke", async () => {
    const { dialog } = await openSwitch();
    expect(document.activeElement).toBe(dialog);
    expect(document.activeElement).not.toBeInstanceOf(HTMLButtonElement);
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });
    expect(screen.getByRole("dialog", { name: "Skift ekspedient" })).toBeInTheDocument();
  });

  it("efter valg og godkendt pinkode står fokus i scanfeltet", async () => {
    const { scan, chip } = await openSwitch();
    fireEvent.click(screen.getByRole("button", { name: "Mads" }));
    for (const ch of "1234") fireEvent.keyDown(window, { key: ch });
    fireEvent.keyDown(window, { key: "Enter" });
    await screen.findByRole("button", { name: "Ekspedient: Mads" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(scan));
    expect(chip).not.toHaveFocus();
  });

  it("efter Esc står fokus i scanfeltet", async () => {
    const { scan } = await openSwitch();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(scan));
  });

  it("efter klik på baggrunden står fokus i scanfeltet", async () => {
    const { scan, dialog } = await openSwitch();
    fireEvent.mouseDown(dialog);
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(scan));
  });
});
