import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import CaseItemsEditor from "../case-items-editor";
import type { CaseItemView } from "@/lib/repairs/new-case-types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const item = (over: Partial<CaseItemView>): CaseItemView => ({
  id: "i1",
  parent_item_id: null,
  kind: "repair",
  description: "Skærmskift",
  quality_label: "OEM",
  qty: 1,
  list_price_oere: 199_900,
  unit_price_oere: 199_900,
  total_oere: 199_900,
  price_reason: null,
  stock_status: "backorder",
  location_slug: "vejle",
  repair_service_id: "oem",
  sku_product_id: "s2",
  device_id: null,
  order_item_id: null,
  ...over,
});

function setup(items: CaseItemView[], closed = false) {
  const onChanged = vi.fn(async () => {});
  const onNotice = vi.fn();
  const fetchMock = vi.fn<typeof fetch>(async () => ({ ok: true, json: async () => ({}) }) as Response);
  vi.stubGlobal("fetch", fetchMock);
  render(
    <CaseItemsEditor
      ticketId="t1"
      store="vejle"
      modelId="m15"
      deviceModel="iPhone 15"
      closed={closed}
      lines={[]}
      items={items}
      onChanged={onChanged}
      onNotice={onNotice}
    />,
  );
  return { onChanged, onNotice, fetchMock };
}

describe("CaseItemsEditor", () => {
  it("shows the stock status per line", () => {
    setup([item({}), item({ id: "i2", kind: "product", description: "Beskyttelsesglas", stock_status: "reserved", total_oere: 9900 }), item({ id: "i3", kind: "free_text", description: "Rens", stock_status: "none" })]);
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Skal bestilles")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Reserveret")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Ikke optalt")).toBeInTheDocument();
  });

  it("removes a line through the DELETE endpoint with a reason and reloads", async () => {
    const { fetchMock, onChanged } = setup([item({})]);
    fireEvent.click(screen.getByRole("button", { name: "Fjern Skærmskift" }));
    fireEvent.change(screen.getByLabelText("Begrundelse for at fjerne linjen"), { target: { value: "Aftalt med kunden" } });
    fireEvent.click(screen.getByRole("button", { name: "Fjern linjen" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/admin/repairs/t1/items/i1");
    expect(call[1]?.method).toBe("DELETE");
    expect(JSON.parse(String(call[1]?.body))).toEqual({ reason: "Aftalt med kunden" });
  });

  it("fills the reason from a quick chip", async () => {
    const { fetchMock, onChanged } = setup([item({})]);
    fireEvent.click(screen.getByRole("button", { name: "Fjern Skærmskift" }));
    fireEvent.click(screen.getByRole("button", { name: "Tilføjet ved en fejl" }));
    fireEvent.click(screen.getByRole("button", { name: "Fjern linjen" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ reason: "Tilføjet ved en fejl" });
  });

  it("does not remove without a reason, and not when cancelled", () => {
    const { fetchMock } = setup([item({})]);
    fireEvent.click(screen.getByRole("button", { name: "Fjern Skærmskift" }));
    fireEvent.click(screen.getByRole("button", { name: "Fjern linjen" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Skriv hvorfor linjen fjernes");
    fireEvent.click(screen.getByRole("button", { name: "Annuller" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Begrundelse for at fjerne linjen")).toBeNull();
  });

  it("warns that stock is not returned when a used part is removed", () => {
    setup([item({ id: "p1", kind: "part", parent_item_id: "i1", description: "Skærm", stock_status: "consumed", list_price_oere: 0, unit_price_oere: 0, total_oere: 0 })]);
    fireEvent.click(screen.getByRole("button", { name: "Fjern Skærm" }));
    expect(screen.getByText(/lageret gives ikke tilbage/)).toBeInTheDocument();
  });

  it("edits the price: shows the list price, requires a reason and PATCHes øre + reason", async () => {
    const { fetchMock, onChanged } = setup([item({ list_price_oere: 119_900, unit_price_oere: 119_900, total_oere: 119_900 })]);
    fireEvent.click(screen.getByRole("button", { name: "Ret pris: Skærmskift" }));
    expect(screen.getByText(/Listepris 1\.199 kr\./)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ny pris (kr.)"), { target: { value: "999,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Gem pris" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Skriv en begrundelse");
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Aftalt pris med kunden" }));
    fireEvent.click(screen.getByRole("button", { name: "Gem pris" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/admin/repairs/t1/items/i1");
    expect(call[1]?.method).toBe("PATCH");
    expect(JSON.parse(String(call[1]?.body))).toEqual({ unit_price_oere: 99_950, reason: "Aftalt pris med kunden" });
  });

  it("shows list price next to a deviating price, and sends no reason when set back to the list price", async () => {
    const { fetchMock, onChanged } = setup([item({ list_price_oere: 119_900, unit_price_oere: 99_900, total_oere: 99_900, price_reason: "Kulance" })]);
    expect(screen.getByText("Afvigende pris: Kulance")).toBeInTheDocument();
    expect(screen.getAllByText(/Listepris 1\.199 kr\./).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Ret pris: Skærmskift" }));
    fireEvent.change(screen.getByLabelText("Ny pris (kr.)"), { target: { value: "1199" } });
    fireEvent.click(screen.getByRole("button", { name: "Gem pris" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ unit_price_oere: 119_900, reason: null });
  });

  it("allows a price change on a finished repair (used part) but not on part lines or sold lines", () => {
    setup([
      item({ id: "r", stock_status: "none" }),
      item({ id: "p", kind: "part", parent_item_id: "r", description: "Skærm", stock_status: "consumed", list_price_oere: 0, unit_price_oere: 0, total_oere: 0 }),
      item({ id: "d", kind: "product", description: "Cover", stock_status: "sold" }),
    ]);
    expect(screen.getByRole("button", { name: "Ret pris: Skærmskift" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ret pris: Skærm" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ret pris: Cover" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Fjern Cover" })).toBeNull();
  });

  it("free text lines change price without a reason", async () => {
    const { fetchMock, onChanged } = setup([item({ id: "f", kind: "free_text", description: "Rens", stock_status: "none", list_price_oere: 10_000, unit_price_oere: 10_000, total_oere: 10_000 })]);
    fireEvent.click(screen.getByRole("button", { name: "Ret pris: Rens" }));
    expect(screen.queryByLabelText("Begrundelse for prisen")).toBeNull();
    fireEvent.change(screen.getByLabelText("Ny pris (kr.)"), { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: "Gem pris" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ unit_price_oere: 15_000, reason: null });
  });

  it("adds a free-text line via the items endpoint", async () => {
    const { fetchMock, onChanged } = setup([item({})]);
    fireEvent.click(screen.getByRole("button", { name: "Tilføj linje" }));
    fireEvent.click(screen.getByRole("button", { name: "Anden opgave" }));
    fireEvent.change(screen.getByLabelText("Beskrivelse"), { target: { value: "Rensning" } });
    fireEvent.change(screen.getByLabelText("Pris (kr.)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Tilføj" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/items") && c[1]?.method === "POST");
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ item: { kind: "free_text", description: "Rensning", unit_price_oere: 10_000, qty: 1 } });
  });

  it("locks sold lines, and everything on a closed case", () => {
    setup([item({ stock_status: "sold" })]);
    expect(screen.queryByRole("button", { name: "Fjern Skærmskift" })).toBeNull();
    cleanup();
    setup([item({})], true);
    expect(screen.queryByRole("button", { name: "Tilføj linje" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ret pris: Skærmskift" })).toBeNull();
  });
});
