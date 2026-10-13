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
});
