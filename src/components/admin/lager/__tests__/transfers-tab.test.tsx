import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransfersTab } from "../transfers-tab";

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const line = (over = {}) => ({ shared_sku: "SCR-IP13", part_name: "Skærm iPhone 13", qty_requested: 2, qty_sent: null, qty_received: 0, qty_written_off: 0, write_off_reason: null, unit_cost_ore: 41500, ...over });
const t = (over: Record<string, unknown>) => ({
  id: "tr1", from: "phonespot-esbjerg", to: "vejle-hub", requested_by_company: "fixon", status: "REQUESTED", reference: "PS-2026-0042",
  note: null, reject_reason: null, requested_by_label: "Tekniker Ali (Fixon)", sent_by_label: null, received_by_label: null,
  created_at: "2026-10-13T10:00:00Z", sent_at: null, received_at: null, lines: [line()], ...over,
});
const locations = [{ code: "vejle-hub" as const, name: "Hovedlager Vejle" }, { code: "phonespot-slagelse" as const, name: "Slagelse" }];
beforeEach(() => vi.stubGlobal("crypto", { randomUUID: () => "66666666-6666-4666-8666-666666666666" }));
afterEach(() => vi.unstubAllGlobals());

function api(transfers: unknown[], availability: unknown[] = []) {
  const f = vi.fn((url: string, init?: RequestInit) => {
    if (url.startsWith("/api/admin/lager/transfers?")) return json({ transfers });
    if (url.startsWith("/api/admin/lager/availability")) return json({ shared_sku: "SCR-IP13", availability });
    return json({ transfer: {} });
  });
  vi.stubGlobal("fetch", f);
  return f;
}
const body = (f: ReturnType<typeof vi.fn>, path: string) => JSON.parse((f.mock.calls.find((c) => c[0] === path)![1] as RequestInit).body as string);

describe("TransfersTab", () => {
  it("shows incoming transfers for Hovedlager Vejle with names, never codes", async () => {
    const f = api([t({ status: "SENT", lines: [line({ qty_sent: 2 })] })]);
    render(<TransfersTab locations={locations} />);
    expect(await screen.findByText("Esbjerg → Hovedlager Vejle")).toBeVisible();
    expect(screen.queryByText(/vejle-hub/)).toBeNull();
    expect(f).toHaveBeenCalledWith("/api/admin/lager/transfers?location=vejle-hub&direction=in", expect.anything());
  });

  it("outgoing request: Accepter og send posts chosen quantities and warns about negative stock", async () => {
    const f = api([t({ from: "vejle-hub", to: "phonespot-slagelse" })], [{ location: "vejle-hub", label: "Hovedlager Vejle", qty: 1 }]);
    render(<TransfersTab locations={locations} />);
    fireEvent.click(screen.getByRole("button", { name: "Udgående" }));
    fireEvent.click(await screen.findByRole("button", { name: "Accepter og send" }));
    expect(await screen.findByText("Saldoen på Hovedlager Vejle bliver negativ")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Sendes af Skærm iPhone 13"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(f).toHaveBeenCalledWith("/api/admin/lager/transfers/tr1/send", expect.objectContaining({ method: "POST" })));
    expect(body(f, "/api/admin/lager/transfers/tr1/send")).toEqual({ lines: [{ shared_sku: "SCR-IP13", qty_sent: 1 }] });
  });

  it("Afvis requires a reason", async () => {
    const f = api([t({ from: "vejle-hub", to: "phonespot-slagelse" })]);
    render(<TransfersTab locations={locations} />);
    fireEvent.click(screen.getByRole("button", { name: "Udgående" }));
    fireEvent.click(await screen.findByRole("button", { name: "Afvis" }));
    fireEvent.click(screen.getByRole("button", { name: "Afvis anmodning" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Angiv en begrundelse");
    fireEvent.change(screen.getByLabelText("Begrundelse"), { target: { value: "Bruger den selv" } });
    fireEvent.click(screen.getByRole("button", { name: "Afvis anmodning" }));
    await waitFor(() => expect(body(f, "/api/admin/lager/transfers/tr1/reject")).toEqual({ reason: "Bruger den selv" }));
  });

  it("Modtaget: partial receipt with a write-off needs a reason and cannot exceed what is underway", async () => {
    const f = api([t({ status: "SENT", lines: [line({ qty_sent: 2 })] })]);
    render(<TransfersTab locations={locations} canManage />);
    fireEvent.click(await screen.findByRole("button", { name: "Modtaget" }));
    fireEvent.change(screen.getByLabelText("Modtaget af Skærm iPhone 13"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Afskrevet af Skærm iPhone 13"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrér modtagelse" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Skærm iPhone 13: højst 2 i alt (undervejs)");
    fireEvent.change(screen.getByLabelText("Modtaget af Skærm iPhone 13"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrér modtagelse" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Skærm iPhone 13: afskrivning kræver en begrundelse");
    fireEvent.change(screen.getByLabelText("Begrundelse for afskrivning af Skærm iPhone 13"), { target: { value: "Knækket" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrér modtagelse" }));
    await waitFor(() => expect(body(f, "/api/admin/lager/transfers/tr1/receive")).toEqual({
      idempotency_key: "66666666-6666-4666-8666-666666666666",
      lines: [{ shared_sku: "SCR-IP13", qty_received: 1, qty_written_off: 1, write_off_reason: "Knækket" }],
    }));
  });

  it("employees can receive but get no write-off controls", async () => {
    const f = api([t({ status: "SENT", lines: [line({ qty_sent: 2 })] })]);
    render(<TransfersTab locations={locations} />);
    fireEvent.click(await screen.findByRole("button", { name: "Modtaget" }));
    expect(screen.queryByLabelText("Afskrevet af Skærm iPhone 13")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Registrér modtagelse" }));
    await waitFor(() => expect(body(f, "/api/admin/lager/transfers/tr1/receive")).toEqual({
      idempotency_key: "66666666-6666-4666-8666-666666666666",
      lines: [{ shared_sku: "SCR-IP13", qty_received: 2 }],
    }));
  });

  it("Annullér only on PhoneSpot's own pending requests; shows the settlement once received", async () => {
    api([
      t({ id: "a", requested_by_company: "phonespot" }),
      t({ id: "b", status: "RECEIVED", lines: [line({ qty_sent: 2, qty_received: 2 })] }),
    ]);
    render(<TransfersTab locations={locations} />);
    const cards = await screen.findAllByRole("article");
    expect(within(cards[0]).getByRole("button", { name: "Annullér" })).toBeVisible();
    expect(within(cards[1]).queryByRole("button", { name: "Annullér" })).toBeNull();
    expect(within(cards[1]).getByText("Hovedlager Vejle skylder PhoneSpot 830,00 kr. (kostpris)")).toBeVisible();
  });
});
