import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RmaTab } from "../rma-tab";

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const item = (over: Record<string, unknown> = {}) => ({
  id: "rma1", shared_sku: "SCR-IP13", part_name: "Skærm iPhone 13", qty: 1, location: "vejle-hub", found_by_company: "fixon",
  found_by_label: "Fixon", supplier: "Foneday", reason: "Død pixel", reference: "FX-88", status: "REGISTERED", supplier_ref: null,
  resolution_note: null, created_at: "2026-10-13T10:00:00Z", sent_at: null, resolved_at: null, ...over,
});
const locations = [{ code: "vejle-hub" as const, name: "Hovedlager Vejle" }, { code: "phonespot-slagelse" as const, name: "Slagelse" }];
beforeEach(() => vi.stubGlobal("crypto", { randomUUID: () => "77777777-7777-4777-8777-777777777777" }));
afterEach(() => vi.unstubAllGlobals());

function api(items: unknown[]) {
  const f = vi.fn((url: string, init?: RequestInit) => {
    if (url.startsWith("/api/admin/lager/rma?")) return json({ items });
    if (url.startsWith("/api/admin/lager/parts")) return json({ parts: [{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", quality: null }] });
    return json({ item: item() }, init?.method === "POST" ? 200 : 200);
  });
  vi.stubGlobal("fetch", f);
  return f;
}
const bodyOf = (f: ReturnType<typeof vi.fn>, path: string) => JSON.parse((f.mock.calls.find((c) => c[0] === path)![1] as RequestInit).body as string);

describe("RmaTab", () => {
  it("lists open RMAs for Hovedlager Vejle with Fundet af and status", async () => {
    const f = api([item(), item({ id: "rma2", found_by_label: "PhoneSpot Vejle", status: "SENT", supplier_ref: "FD-77" })]);
    render(<RmaTab locations={locations} />);
    const cards = await screen.findAllByRole("article");
    expect(within(cards[0]).getByText("Fundet af: Fixon")).toBeVisible();
    expect(within(cards[0]).getByText("Registreret")).toBeVisible();
    expect(within(cards[1]).getByText("Fundet af: PhoneSpot Vejle")).toBeVisible();
    expect(within(cards[1]).getByText(/FD-77/)).toBeVisible();
    expect(f).toHaveBeenCalledWith("/api/admin/lager/rma?location=vejle-hub&status=REGISTERED,SENT", expect.anything());
    expect(screen.queryByText(/vejle-hub/)).toBeNull();
  });

  it("marks as sent with the supplier's RMA number", async () => {
    const f = api([item()]);
    render(<RmaTab locations={locations} />);
    fireEvent.click(await screen.findByRole("button", { name: "Sendt til leverandør" }));
    fireEvent.change(screen.getByLabelText("Leverandørens RMA-nummer (valgfri)"), { target: { value: "FD-77" } });
    fireEvent.click(screen.getByRole("button", { name: "Gem som sendt" }));
    await waitFor(() => expect(bodyOf(f, "/api/admin/lager/rma/rma1/send")).toEqual({ location: "vejle-hub", supplier_ref: "FD-77" }));
  });

  it("resolves as credited with the amount in kroner, or rejected without an amount", async () => {
    const f = api([item({ status: "SENT" })]);
    render(<RmaTab locations={locations} canManage />);
    expect(screen.queryByRole("button", { name: "Sendt til leverandør" })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Afslut" }));
    fireEvent.click(screen.getByLabelText("Krediteret"));
    fireEvent.change(screen.getByLabelText("Krediteret beløb i kr. (valgfri)"), { target: { value: "415,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Gem afslutning" }));
    await waitFor(() => expect(bodyOf(f, "/api/admin/lager/rma/rma1/resolve")).toEqual({ location: "vejle-hub", outcome: "CREDITED", credit_ore: 41550 }));
  });

  it("registers a defect part: reason is required", async () => {
    const f = api([]);
    render(<RmaTab locations={locations} />);
    fireEvent.click(await screen.findByRole("button", { name: "Registrér defekt del" }));
    fireEvent.change(screen.getByLabelText("Del"), { target: { value: "iphone 13" } });
    fireEvent.click(await screen.findByRole("button", { name: /Skærm iPhone 13/ }));
    fireEvent.click(screen.getByRole("button", { name: "Registrér" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Beskriv fejlen");
    fireEvent.change(screen.getByLabelText("Fejlbeskrivelse"), { target: { value: "Touch virker ikke" } });
    fireEvent.change(screen.getByLabelText("Leverandør (valgfri)"), { target: { value: "Foneday" } });
    fireEvent.change(screen.getByLabelText("Sagsnummer (valgfri)"), { target: { value: "PS-2026-0009" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrér" }));
    await waitFor(() => expect(bodyOf(f, "/api/admin/lager/rma")).toEqual({
      idempotency_key: "77777777-7777-4777-8777-777777777777", location: "vejle-hub", shared_sku: "SCR-IP13", qty: 1,
      reason: "Touch virker ikke", supplier: "Foneday", reference: "PS-2026-0009",
    }));
  });

  it("without canManage: no Erstattet option and no amount field; Afvist still works", async () => {
    const f = api([item({ status: "SENT" })]);
    render(<RmaTab locations={locations} />);
    fireEvent.click(await screen.findByRole("button", { name: "Afslut" }));
    expect(screen.queryByLabelText("Erstattet")).toBeNull();
    fireEvent.click(screen.getByLabelText("Krediteret"));
    expect(screen.queryByLabelText("Krediteret beløb i kr. (valgfri)")).toBeNull();
    expect(screen.getByText(/ejer eller leder/)).toBeVisible();
    fireEvent.click(screen.getByLabelText("Afvist"));
    fireEvent.change(screen.getByLabelText("Note (valgfri)"), { target: { value: "Brugerskade" } });
    fireEvent.click(screen.getByRole("button", { name: "Gem afslutning" }));
    await waitFor(() => expect(bodyOf(f, "/api/admin/lager/rma/rma1/resolve")).toEqual({ location: "vejle-hub", outcome: "REJECTED", note: "Brugerskade" }));
  });

  it("resolve requires an explicit outcome", async () => {
    const f = api([item()]);
    render(<RmaTab locations={locations} canManage />);
    fireEvent.click(await screen.findByRole("button", { name: "Afslut" }));
    fireEvent.click(screen.getByRole("button", { name: "Gem afslutning" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Vælg udfald");
    expect(f.mock.calls.some((c) => String(c[0]).endsWith("/resolve"))).toBe(false);
  });

  it("action buttons are disabled while a request is in flight (no double send)", async () => {
    let release: (r: Response) => void = () => {};
    const f = vi.fn((url: string) => {
      if (url.startsWith("/api/admin/lager/rma?")) return json({ items: [item()] });
      return new Promise<Response>((r) => { release = r; });
    });
    vi.stubGlobal("fetch", f);
    render(<RmaTab locations={locations} />);
    fireEvent.click(await screen.findByRole("button", { name: "Sendt til leverandør" }));
    fireEvent.click(screen.getByRole("button", { name: "Gem som sendt" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Gemmer..." })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Gemmer..." }));
    expect(f.mock.calls.filter((c) => String(c[0]).endsWith("/send"))).toHaveLength(1);
    release(new Response(JSON.stringify({ item: item({ status: "SENT" }) }), { status: 200 }));
    expect(await screen.findByText("Reklamationen er markeret som sendt")).toBeVisible();
  });

  it("register keeps the same idempotency key on retry and blocks double submit", async () => {
    let n = 0;
    const keys: string[] = [];
    let release: (r: Response) => void = () => {};
    const f = vi.fn((url: string, init?: RequestInit) => {
      if (url.startsWith("/api/admin/lager/rma?")) return json({ items: [] });
      if (url.startsWith("/api/admin/lager/parts")) return json({ parts: [{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", quality: null }] });
      keys.push(JSON.parse(init!.body as string).idempotency_key);
      n += 1;
      if (n === 1) return json({ error: "Lagersystemet svarer ikke lige nu. Prøv igen om lidt." }, 502);
      return new Promise<Response>((r) => { release = r; });
    });
    vi.stubGlobal("fetch", f);
    let u = 0;
    vi.stubGlobal("crypto", { randomUUID: () => `7777777${u++}-7777-4777-8777-777777777777` });
    render(<RmaTab locations={locations} />);
    fireEvent.click(await screen.findByRole("button", { name: "Registrér defekt del" }));
    fireEvent.change(screen.getByLabelText("Del"), { target: { value: "iphone 13" } });
    fireEvent.click(await screen.findByRole("button", { name: /Skærm iPhone 13/ }));
    fireEvent.change(screen.getByLabelText("Fejlbeskrivelse"), { target: { value: "Touch" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrér" }));
    expect(await screen.findByText("Lagersystemet svarer ikke lige nu. Prøv igen om lidt.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Registrér" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Registrerer..." })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Registrerer..." }));
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    release(new Response(JSON.stringify({ item: item(), part_removed: false }), { status: 201 }));
    expect(await screen.findByText("Defekt del registreret")).toBeVisible();
  });
});
