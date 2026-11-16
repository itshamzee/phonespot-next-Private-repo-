// @vitest-environment node
import { expect, it, vi } from "vitest";
import { buildStockView } from "../stock-view";

const balances = { location: "vejle-hub", as_of: "2026-10-13T10:00:00Z", balances: [
  { shared_sku: "B", qty: 5, updated_at: "t" },
  { shared_sku: "A", qty: -2, updated_at: "t" },
  { shared_sku: "C", qty: 0, updated_at: "t" },
] };

it("without a search: negatives first, names looked up, unknown names tolerated", async () => {
  const client = {
    getBalances: vi.fn(async () => balances),
    searchParts: vi.fn(),
    getPart: vi.fn(async (sku: string) => { if (sku === "C") throw new Error("404"); return { shared_sku: sku, name: `Del ${sku}` }; }),
  };
  const view = await buildStockView(client as never, "vejle-hub", "");
  expect(view.total).toBe(3);
  expect(view.rows).toEqual([
    { shared_sku: "A", name: "Del A", qty: -2, updated_at: "t" },
    { shared_sku: "C", name: null, qty: 0, updated_at: "t" },
    { shared_sku: "B", name: "Del B", qty: 5, updated_at: "t" },
  ]);
  expect(client.searchParts).not.toHaveBeenCalled();
});

it("with a search: catalog hits joined with balances, 0 when no balance row", async () => {
  const client = {
    getBalances: vi.fn(async () => balances),
    searchParts: vi.fn(async () => [{ shared_sku: "A", name: "Del A" }, { shared_sku: "Z", name: "Ny del" }]),
    getPart: vi.fn(),
  };
  const view = await buildStockView(client as never, "vejle-hub", " ip ");
  expect(client.searchParts).toHaveBeenCalledWith("ip", 50);
  expect(view.rows).toEqual([
    { shared_sku: "A", name: "Del A", qty: -2, updated_at: "t" },
    { shared_sku: "Z", name: "Ny del", qty: 0, updated_at: null },
  ]);
  expect(client.getPart).not.toHaveBeenCalled();
});
