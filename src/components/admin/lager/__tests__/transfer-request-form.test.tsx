import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TransferRequestForm } from "../transfer-request-form";

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
beforeEach(() => vi.stubGlobal("crypto", { randomUUID: () => "55555555-5555-4555-8555-555555555555" }));
afterEach(() => vi.unstubAllGlobals());

it("finds a part, offers only locations that have it, and posts the request", async () => {
  const f = vi.fn((url: string, _init?: RequestInit) => {
    if (url.startsWith("/api/admin/lager/parts")) return json({ parts: [{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", quality: null }] });
    if (url.startsWith("/api/admin/lager/availability")) return json({ shared_sku: "SCR-IP13", availability: [{ location: "phonespot-esbjerg", label: "Esbjerg", qty: 2 }] });
    return json({ transfer: { id: "tr9" } }, 201);
  });
  vi.stubGlobal("fetch", f);
  const onDone = vi.fn();
  render(<TransferRequestForm to="vejle-hub" onDone={onDone} onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText("Del"), { target: { value: "iphone 13" } });
  fireEvent.click(await screen.findByRole("button", { name: /Skærm iPhone 13/ }));
  await waitFor(() => expect(f).toHaveBeenCalledWith("/api/admin/lager/availability?sku=SCR-IP13&exclude=vejle-hub", expect.anything()));
  fireEvent.change(await screen.findByLabelText("Fra"), { target: { value: "phonespot-esbjerg" } });
  fireEvent.change(screen.getByLabelText("Antal"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Send anmodning" }));
  await waitFor(() => expect(onDone).toHaveBeenCalledWith("Anmodning sendt til Esbjerg"));
  const post = f.mock.calls.find((c) => c[0] === "/api/admin/lager/transfers")!;
  expect(JSON.parse((post[1] as RequestInit).body as string)).toEqual({
    idempotency_key: "55555555-5555-4555-8555-555555555555", from: "phonespot-esbjerg", to: "vejle-hub", shared_sku: "SCR-IP13", qty: 2,
  });
});

it("says so when no other location has the part", async () => {
  vi.stubGlobal("fetch", vi.fn((url: string) =>
    url.startsWith("/api/admin/lager/parts") ? json({ parts: [{ shared_sku: "X", name: "Del X", quality: null }] }) : json({ shared_sku: "X", availability: [] })));
  render(<TransferRequestForm to="vejle-hub" onDone={() => {}} onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText("Del"), { target: { value: "del x" } });
  fireEvent.click(await screen.findByRole("button", { name: /Del X/ }));
  expect(await screen.findByText("Ingen andre lokationer har delen. Den skal bestilles hos leverandøren.")).toBeVisible();
});
