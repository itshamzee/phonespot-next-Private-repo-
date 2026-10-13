import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SparePartsStock } from "../spare-parts-stock";

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
afterEach(() => vi.unstubAllGlobals());

function api() {
  const f = vi.fn((url: string) => {
    if (url === "/api/admin/lager/locations") return json({ locations: [{ code: "vejle-hub", name: "Hovedlager Vejle" }, { code: "phonespot-slagelse", name: "PhoneSpot Slagelse" }] });
    if (url.startsWith("/api/admin/lager/balances")) {
      return json({ as_of: "2026-10-13T10:00:00Z", total: 120, rows: [
        { shared_sku: "A", name: "Batteri iPhone 12", qty: -2, updated_at: "t" },
        { shared_sku: "B", name: null, qty: 4, updated_at: "t" },
      ] });
    }
    return json({});
  });
  vi.stubGlobal("fetch", f);
  return f;
}

it("shows the hub's balances first, marks negatives, and switches location", async () => {
  const f = api();
  render(<SparePartsStock />);
  const neg = await screen.findByText("Batteri iPhone 12");
  const row = neg.closest("tr")!;
  expect(within(row).getByText("-2")).toBeVisible();
  expect(within(row).getByText("(negativ saldo)")).toBeInTheDocument();
  expect(screen.getByText("Ukendt del")).toBeVisible();
  expect(screen.getByText("Viser 2 af 120 dele. Søg for at finde en bestemt del.")).toBeVisible();
  expect(f).toHaveBeenCalledWith("/api/admin/lager/balances?location=vejle-hub&q=", expect.anything());
  fireEvent.click(screen.getByRole("button", { name: "PhoneSpot Slagelse" }));
  await waitFor(() => expect(f).toHaveBeenCalledWith("/api/admin/lager/balances?location=phonespot-slagelse&q=", expect.anything()));
});

it("opens the booking form for a row", async () => {
  api();
  render(<SparePartsStock />);
  fireEvent.click(await screen.findByRole("button", { name: "Bogfør på Batteri iPhone 12" }));
  expect(screen.getByLabelText("Handling")).toBeVisible();
});

it("shows the error when the lagersystem is down", async () => {
  vi.stubGlobal("fetch", vi.fn((url: string) =>
    url === "/api/admin/lager/locations" ? json({ error: "Lagersystemet svarer ikke lige nu. Prøv igen om lidt." }, 502) : json({})));
  render(<SparePartsStock />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Lagersystemet svarer ikke lige nu.");
});

function apiWithRole(role: string | null) {
  const f = api();
  vi.stubGlobal("fetch", vi.fn((url: string) =>
    url === "/api/admin/me" ? (role ? json({ role }) : json({ error: "x" }, 401)) : f(url)));
}

it("employees can only take stock: no receive, count or write-off, with an explanation", async () => {
  apiWithRole("staff");
  render(<SparePartsStock />);
  fireEvent.click(await screen.findByRole("button", { name: "Bogfør på Batteri iPhone 12" }));
  await waitFor(() => expect(screen.getByText(/Kun ejer eller leder kan modtage, tælle og nedskrive/)).toBeVisible());
  const options = within(screen.getByLabelText("Handling")).getAllByRole("option").map((o) => o.textContent);
  expect(options).toEqual(["Udtag"]);
});

it("managers and owners get all four actions", async () => {
  for (const role of ["manager", "owner"]) {
    apiWithRole(role);
    const { unmount } = render(<SparePartsStock />);
    fireEvent.click(await screen.findByRole("button", { name: "Bogfør på Batteri iPhone 12" }));
    await waitFor(() => expect(within(screen.getByLabelText("Handling")).getAllByRole("option")).toHaveLength(4));
    unmount();
  }
});

it("an unknown role is treated as employee", async () => {
  apiWithRole(null);
  render(<SparePartsStock />);
  fireEvent.click(await screen.findByRole("button", { name: "Bogfør på Batteri iPhone 12" }));
  expect(within(screen.getByLabelText("Handling")).getAllByRole("option")).toHaveLength(1);
});

it("opens on the Flytninger tab when asked", async () => {
  api();
  render(<SparePartsStock initialTab="flytninger" />);
  expect(await screen.findByRole("tab", { name: "Flytninger", selected: true })).toBeVisible();
});
