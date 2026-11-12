import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AccessoryList } from "../accessory-list";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const item = (id: string, title: string) => ({
  id, title, slug: id, subcategory: "cover", brand: "Rixus", selling_price: 27900, sale_price: null,
  always_in_stock: true, images: [], compatible_models: ["iphone-15"], models: ["iphone-15"],
  status: "draft", is_active: true, created_at: "2026-09-22", store_stock: 0, online_stock: 0, total_stock: 0,
});

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
let bulkBodies: Record<string, unknown>[] = [];

beforeEach(() => {
  bulkBodies = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const json = (data: unknown) => ({ ok: true, json: async () => data });
    if (url.startsWith("/api/platform/sku/brands")) return json(["Rixus"]);
    if (url === "/api/admin/products/bulk") {
      bulkBodies.push(JSON.parse(String(init?.body)));
      return json({ updated: 1, failed: 0, matched: 2, skipped: [{ id: B, title: "Cover B", reason: "Tilbudsprisen skal være lavere end prisen" }] });
    }
    return json({ items: [item(A, "Cover A"), item(B, "Cover B")], total: 82, page: 1, limit: 50 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("masseændring i tilbehørslisten", () => {
  it("viser først flueben, når Masseændring er slået til", async () => {
    render(<AccessoryList />);
    await screen.findByText("Cover A");
    expect(screen.queryByLabelText("Vælg Cover A")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Masseændring" }));
    expect(screen.getByLabelText("Vælg Cover A")).toBeTruthy();
  });

  it("sender de afkrydsede id'er og ændringen efter bekræftelse", async () => {
    render(<AccessoryList />);
    await screen.findByText("Cover A");
    fireEvent.click(screen.getByRole("button", { name: "Masseændring" }));
    fireEvent.click(screen.getByLabelText("Vælg Cover A"));
    fireEvent.click(screen.getByLabelText("Vælg Cover B"));
    expect(screen.getByText("2 produkter valgt")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Ændring"), { target: { value: "price-set" } });
    fireEvent.change(screen.getByLabelText("Beløb i kroner"), { target: { value: "199" } });
    fireEvent.click(screen.getByRole("button", { name: "Ændr 2 produkter" }));
    expect(bulkBodies).toEqual([]); // intet skrives før bekræftelse
    expect(screen.getByText(/Sæt prisen til 199.*på 2 produkter\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ja, ændr" }));

    await waitFor(() => expect(bulkBodies).toHaveLength(1));
    expect(bulkBodies[0]).toEqual({ type: "accessory", ids: [A, B], change: { price: { mode: "set", oere: 19900 } } });
    expect(await screen.findByText("1 produkt ændret, 1 sprunget over")).toBeTruthy();
    expect(screen.getByText(/Cover B: Tilbudsprisen skal være lavere/)).toBeTruthy();
  });

  it("sender filteret, når alle der matcher er valgt", async () => {
    render(<AccessoryList />);
    await screen.findByText("Cover A");
    fireEvent.click(screen.getByRole("radio", { name: "Kladde" }));
    await screen.findByText("Cover A");
    fireEvent.click(screen.getByRole("button", { name: "Masseændring" }));
    fireEvent.click(screen.getByRole("button", { name: "Vælg alle 82, der matcher" }));
    fireEvent.change(screen.getByLabelText("Ændring"), { target: { value: "publish" } });
    fireEvent.click(screen.getByRole("button", { name: "Ændr 82 produkter" }));
    fireEvent.click(screen.getByRole("button", { name: "Ja, ændr" }));
    await waitFor(() => expect(bulkBodies).toHaveLength(1));
    expect(bulkBodies[0]).toEqual({ type: "accessory", filter: { status: "draft" }, change: { status: "published" } });
  });

  it("afviser en ugyldig værdi uden at spørge om bekræftelse", async () => {
    render(<AccessoryList />);
    await screen.findByText("Cover A");
    fireEvent.click(screen.getByRole("button", { name: "Masseændring" }));
    fireEvent.click(screen.getByLabelText("Vælg Cover A"));
    fireEvent.change(screen.getByLabelText("Ændring"), { target: { value: "sale-percent" } });
    fireEvent.change(screen.getByLabelText("Procent"), { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: "Ændr 1 produkt" }));
    expect(screen.getByText("Skriv en rabat mellem 1 og 90 procent.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ja, ændr" })).toBeNull();
  });
});
