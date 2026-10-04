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

  it("removes a line through the DELETE endpoint after confirmation and reloads", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { fetchMock, onChanged } = setup([item({})]);
    fireEvent.click(screen.getByRole("button", { name: "Fjern Skærmskift" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/repairs/t1/items/i1", expect.objectContaining({ method: "DELETE" }));
  });

  it("does not remove when the confirmation is declined", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { fetchMock } = setup([item({})]);
    fireEvent.click(screen.getByRole("button", { name: "Fjern Skærmskift" }));
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("locks consumed and sold lines, and everything on a closed case", () => {
    setup([item({ stock_status: "consumed" })]);
    expect(screen.queryByRole("button", { name: "Fjern Skærmskift" })).toBeNull();
    cleanup();
    setup([item({})], true);
    expect(screen.queryByRole("button", { name: "Tilføj linje" })).toBeNull();
  });
});
