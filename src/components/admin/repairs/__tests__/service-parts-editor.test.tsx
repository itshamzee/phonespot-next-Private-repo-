import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ServicePartsEditor } from "../service-parts-editor";

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
afterEach(() => vi.unstubAllGlobals());

function api(enabled = true, parts: unknown[] = []) {
  const f = vi.fn((url: string, init?: RequestInit) => {
    if (url.startsWith("/api/admin/lager/parts")) return json({ parts: [{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", quality: "Soft OLED", cost_price_ore: 1 }] });
    if ((init?.method ?? "GET") === "GET") return json(enabled ? { enabled, parts } : { enabled });
    return json({ part: {} }, init?.method === "POST" ? 201 : 200);
  });
  vi.stubGlobal("fetch", f);
  return f;
}

it("explains that unlinked services are not checked", async () => {
  api();
  render(<ServicePartsEditor serviceId="svc-1" />);
  expect(await screen.findByText("Ingen dele koblet. Reparationen tjekkes ikke mod lageret.")).toBeVisible();
});

it("links a catalog part with a quantity", async () => {
  const f = api();
  render(<ServicePartsEditor serviceId="svc-1" />);
  fireEvent.change(await screen.findByLabelText("Søg del i kataloget"), { target: { value: "iphone 13" } });
  fireEvent.click(await screen.findByRole("button", { name: /Kobl Skærm iPhone 13/ }));
  await waitFor(() => expect(f).toHaveBeenCalledWith("/api/admin/services/svc-1/parts", expect.objectContaining({ method: "POST" })));
  const post = f.mock.calls.find((c) => c[1]?.method === "POST")!;
  expect(JSON.parse((post[1] as RequestInit).body as string)).toEqual({ shared_sku: "SCR-IP13", part_name: "Skærm iPhone 13", qty: 1 });
});

it("removes a linked part", async () => {
  const f = api(true, [{ shared_sku: "SCR-IP13", qty: 1, part_name: "Skærm iPhone 13" }]);
  render(<ServicePartsEditor serviceId="svc-1" />);
  fireEvent.click(await screen.findByRole("button", { name: "Fjern Skærm iPhone 13" }));
  await waitFor(() => expect(f).toHaveBeenCalledWith("/api/admin/services/svc-1/parts?sku=SCR-IP13", expect.objectContaining({ method: "DELETE" })));
});

it("says the lagersystem is not connected when the flag is off", async () => {
  api(false);
  render(<ServicePartsEditor serviceId="svc-1" />);
  expect(await screen.findByText("Lagersystemet er ikke forbundet, så dele kan ikke kobles endnu.")).toBeVisible();
});

it("shows the error when the first load is refused", async () => {
  vi.stubGlobal("fetch", vi.fn(() => json({ error: "Kun managere og ejere kan redigere reparationskataloget" }, 403)));
  render(<ServicePartsEditor serviceId="svc-1" />);
  expect(await screen.findByText("Kun managere og ejere kan redigere reparationskataloget")).toBeVisible();
});

it("shows an error when the load throws", async () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
  render(<ServicePartsEditor serviceId="svc-1" />);
  expect(await screen.findByText("Kunne ikke hente koblede dele")).toBeVisible();
});
