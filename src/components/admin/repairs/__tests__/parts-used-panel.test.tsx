import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PartsUsedPanel } from "../parts-used-panel";

const TID = "11111111-1111-4111-8111-111111111111";
const row = (over: Record<string, unknown> = {}) => ({
  id: "p1", ticket_id: TID, movement_type: "TAKE", reverses_id: null, shared_sku: "SCR-IP13-OLED", part_name: "Skærm iPhone 13",
  qty: 1, location_code: "vejle-hub", status: "synced", voided_at: null, last_error: null, ...over,
});
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

function api(state: Record<string, unknown>) {
  const f = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (url.startsWith("/api/admin/lager/parts")) return json({ parts: [{ shared_sku: "SCR-IP13-OLED", name: "Skærm iPhone 13", quality: "OLED", cost_price_ore: 41500 }] });
    if (method === "GET") return json(state);
    return json({ part: {} }, method === "POST" ? 201 : 200);
  });
  vi.stubGlobal("fetch", f);
  return f;
}
afterEach(() => vi.unstubAllGlobals());

describe("PartsUsedPanel", () => {
  it("renders nothing while the lagersystem is off", async () => {
    const f = api({ enabled: false });
    const { container } = render(<PartsUsedPanel ticketId={TID} storeId="vejle" />);
    await waitFor(() => expect(f).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("asks for a store on a Generel ticket and hides the search", async () => {
    api({ enabled: true, location: null, parts: [] });
    render(<PartsUsedPanel ticketId={TID} storeId={null} />);
    expect(await screen.findByText("Vælg butik på sagen, før du registrerer dele.")).toBeVisible();
    expect(screen.queryByLabelText("Søg i reservedelskataloget")).toBeNull();
  });

  it("searches the catalog, adds a part with a quantity, and shows the source location", async () => {
    const f = api({ enabled: true, location: "vejle-hub", parts: [] });
    render(<PartsUsedPanel ticketId={TID} storeId="vejle" />);
    expect(await screen.findByText("Trækkes fra: Hovedlager Vejle")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Søg i reservedelskataloget"), { target: { value: "iphone 13" } });
    fireEvent.click(await screen.findByRole("button", { name: /Skærm iPhone 13/ }));
    fireEvent.change(screen.getByLabelText("Antal"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Tilføj" }));
    await waitFor(() => expect(f).toHaveBeenCalledWith(`/api/admin/lager/repair-parts/${TID}`, expect.objectContaining({ method: "POST" })));
    const body = JSON.parse((f.mock.calls.find((c) => c[1]?.method === "POST")![1] as RequestInit).body as string);
    expect(body).toEqual({ shared_sku: "SCR-IP13-OLED", qty: 2 });
  });

  it("removes an active part with DELETE", async () => {
    const f = api({ enabled: true, location: "vejle-hub", parts: [row()] });
    render(<PartsUsedPanel ticketId={TID} storeId="vejle" />);
    fireEvent.click(await screen.findByRole("button", { name: "Fjern Skærm iPhone 13" }));
    await waitFor(() => expect(f).toHaveBeenCalledWith(`/api/admin/lager/repair-parts/${TID}/p1`, expect.objectContaining({ method: "DELETE" })));
  });

  it("warns about rows that were not booked and offers a retry", async () => {
    const f = api({ enabled: true, location: "vejle-hub", parts: [row({ status: "failed", last_error: "unauthorized (401)" })] });
    render(<PartsUsedPanel ticketId={TID} storeId="vejle" />);
    expect(await screen.findByText("1 bevægelse blev ikke bogført i lagersystemet")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Prøv igen" }));
    await waitFor(() => expect(f).toHaveBeenCalledWith(`/api/admin/lager/repair-parts/${TID}/p1`, expect.objectContaining({ method: "PATCH" })));
  });

  it("hides voided parts and does not warn about a failed part that was removed", async () => {
    api({ enabled: true, location: "vejle-hub", parts: [row({ status: "failed", voided_at: "2026-10-13T10:00:00Z" })] });
    render(<PartsUsedPanel ticketId={TID} storeId="vejle" />);
    expect(await screen.findByText("Ingen dele registreret.")).toBeVisible();
    expect(screen.queryByText(/blev ikke bogført/)).toBeNull();
  });

  it("shows what must be ordered and marks the ticket as ordered", async () => {
    const onChange = vi.fn();
    const f = api({ enabled: true, location: "vejle-hub", parts: [], parts_status: "needs_order",
      parts_shortage: [{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", needed: 1, available: 0 }] });
    render(<PartsUsedPanel ticketId={TID} storeId="vejle" onPartsStatusChange={onChange} />);
    expect(await screen.findByText("Skal bestilles")).toBeVisible();
    expect(screen.getByText("Skærm iPhone 13: skal bruge 1, ledigt 0")).toBeVisible();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("needs_order"));
    fireEvent.click(screen.getByRole("button", { name: "Markér som bestilt" }));
    await waitFor(() => expect(f).toHaveBeenCalledWith(`/api/admin/lager/parts-status/${TID}`, expect.objectContaining({ method: "PATCH" })));
  });

  it("reloads the panel after a 409 on Markér som bestilt", async () => {
    const state = { enabled: true, location: "vejle-hub", parts: [], parts_status: "needs_order",
      parts_shortage: [{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", needed: 1, available: 0 }] };
    const f = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") return json({ error: "Sagen mangler ikke dele" }, 409);
      return json(state);
    });
    vi.stubGlobal("fetch", f);
    render(<PartsUsedPanel ticketId={TID} storeId="vejle" />);
    fireEvent.click(await screen.findByRole("button", { name: "Markér som bestilt" }));
    expect(await screen.findByText("Sagen mangler ikke dele")).toBeVisible();
    const gets = () => f.mock.calls.filter((c) => (c[1]?.method ?? "GET") === "GET" && String(c[0]).startsWith("/api/admin/lager/repair-parts")).length;
    await waitFor(() => expect(gets()).toBe(2));
  });

  it("lists where the missing part exists elsewhere and requests it to the ticket's store", async () => {
    const f = vi.fn((url: string, init?: RequestInit) => {
      if (url.startsWith("/api/admin/lager/availability")) {
        return json({ shared_sku: "SCR-IP13", availability: [{ location: "phonespot-esbjerg", label: "Esbjerg", qty: 2 }, { location: "vejle-hub", label: "Hovedlager Vejle", qty: 1 }] });
      }
      if ((init?.method ?? "GET") === "GET") {
        return json({ enabled: true, location: "phonespot-slagelse", parts: [], parts_status: "needs_order", transfers: [],
          parts_shortage: [{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", needed: 1, available: 0 }] });
      }
      return json({ transfer: { id: "tr1" } }, 201);
    });
    vi.stubGlobal("fetch", f);
    render(<PartsUsedPanel ticketId={TID} storeId="slagelse" />);
    expect(await screen.findByText("Findes andre steder: Esbjerg: 2, Hovedlager Vejle: 1")).toBeVisible();
    expect(f).toHaveBeenCalledWith("/api/admin/lager/availability?sku=SCR-IP13&exclude=phonespot-slagelse", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Anmod fra Esbjerg" }));
    await waitFor(() => expect(f).toHaveBeenCalledWith(`/api/admin/lager/repair-transfers/${TID}`, expect.objectContaining({ method: "POST" })));
    const post = f.mock.calls.find((c) => c[0] === `/api/admin/lager/repair-transfers/${TID}`)!;
    expect(JSON.parse((post[1] as RequestInit).body as string)).toEqual({ shared_sku: "SCR-IP13", from: "phonespot-esbjerg" });
  });

  it("says when no other location has the part", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => url.startsWith("/api/admin/lager/availability")
      ? json({ shared_sku: "X", availability: [] })
      : json({ enabled: true, location: "vejle-hub", parts: [], transfers: [], parts_status: "needs_order", parts_shortage: [{ shared_sku: "X", name: "Del X", needed: 1, available: 0 }] })));
    render(<PartsUsedPanel ticketId={TID} storeId="vejle" />);
    expect(await screen.findByText("Findes ikke andre steder. Bestil hos leverandøren.")).toBeVisible();
  });

  it("shows Anmodet and Undervejs with where the part comes from", async () => {
    const state = (parts_status: string, status: string) => ({ enabled: true, location: "phonespot-slagelse", parts: [], parts_status,
      parts_shortage: [{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", needed: 1, available: 0 }],
      transfers: [{ transfer_id: "tr1", ticket_id: TID, shared_sku: "SCR-IP13", from_location: "phonespot-esbjerg", qty: 1, status }] });
    api(state("requested", "REQUESTED") as never);
    const { unmount } = render(<PartsUsedPanel ticketId={TID} storeId="slagelse" />);
    expect(await screen.findByText("Anmodet")).toBeVisible();
    expect(screen.getByText("1 × Skærm iPhone 13 fra Esbjerg: Anmodet")).toBeVisible();
    unmount();
    api(state("in_transit", "SENT") as never);
    render(<PartsUsedPanel ticketId={TID} storeId="slagelse" />);
    expect(await screen.findByText("Undervejs")).toBeVisible();
    expect(screen.getByText("1 × Skærm iPhone 13 fra Esbjerg: Sendt")).toBeVisible();
  });

  it("shows a friendly message when the part is already requested for the ticket", async () => {
    const f = vi.fn((url: string, init?: RequestInit) => {
      if (url.startsWith("/api/admin/lager/availability")) {
        return json({ shared_sku: "SCR-IP13", availability: [{ location: "phonespot-esbjerg", label: "Esbjerg", qty: 2 }] });
      }
      if ((init?.method ?? "GET") === "GET") {
        return json({ enabled: true, location: "phonespot-slagelse", parts: [], parts_status: "needs_order", transfers: [],
          parts_shortage: [{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", needed: 1, available: 0 }] });
      }
      return json({ error: "Delen er allerede anmodet til sagen" }, 409);
    });
    vi.stubGlobal("fetch", f);
    render(<PartsUsedPanel ticketId={TID} storeId="slagelse" />);
    fireEvent.click(await screen.findByRole("button", { name: "Anmod fra Esbjerg" }));
    expect(await screen.findByText("Delen er allerede anmodet til sagen")).toBeVisible();
  });

  it("Markér som defekt opens the claim form with the ticket number and removes the part on success", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "88888888-8888-4888-8888-888888888888" });
    const f = vi.fn((url: string, init?: RequestInit) => {
      if (url === "/api/admin/lager/rma") return json({ item: {}, part_removed: true }, 201);
      return json({ enabled: true, location: "vejle-hub", reference: "PS-2026-0001", parts: [row({ qty: 2 })] });
    });
    vi.stubGlobal("fetch", f);
    render(<PartsUsedPanel ticketId={TID} storeId="vejle" />);
    fireEvent.click(await screen.findByRole("button", { name: "Markér Skærm iPhone 13 som defekt" }));
    expect(screen.getByText("Sagsnummer: PS-2026-0001")).toBeVisible();
    expect(screen.getByText("Lokation: Hovedlager Vejle")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Fejlbeskrivelse"), { target: { value: "Ingen billede" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrér" }));
    await waitFor(() => expect(f).toHaveBeenCalledWith("/api/admin/lager/rma", expect.objectContaining({ method: "POST" })));
    const body = JSON.parse((f.mock.calls.find((c) => c[0] === "/api/admin/lager/rma")![1] as RequestInit).body as string);
    expect(body).toEqual({
      idempotency_key: "88888888-8888-4888-8888-888888888888", location: "vejle-hub", shared_sku: "SCR-IP13-OLED", qty: 1,
      reason: "Ingen billede", ticket_id: TID, part_id: "p1",
    });
    expect(await screen.findByText("Defekt del registreret og fjernet fra sagen. Tilføj den nye del herunder.")).toBeVisible();
  });
});
