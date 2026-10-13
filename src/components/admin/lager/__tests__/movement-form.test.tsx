import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MovementForm } from "../movement-form";

let uuidN = 0;
beforeEach(() => {
  uuidN = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `00000000-0000-4000-8000-00000000000${++uuidN}` });
});
afterEach(() => vi.unstubAllGlobals());

const part = { shared_sku: "SCR-IP13-OLED", name: "Skærm iPhone 13" };
const respond = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const sent = (f: ReturnType<typeof vi.fn>, i = 0) => JSON.parse((f.mock.calls[i][1] as RequestInit).body as string);

describe("MovementForm", () => {
  it("receives goods with supplier and a cost in kroner converted to øre", async () => {
    const f = respond(201, { movement: { balance_after: 9 }, replayed: false });
    vi.stubGlobal("fetch", f);
    const onDone = vi.fn();
    render(<MovementForm location="vejle-hub" part={part} onDone={onDone} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText("Antal modtaget"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Leverandør (valgfri)"), { target: { value: "Foneday" } });
    fireEvent.change(screen.getByLabelText("Kostpris pr. stk. i kr. (valgfri)"), { target: { value: "415,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Bogfør" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith("Modtag varer bogført. Ny saldo: 9"));
    // initial key + one new key per edited field (qty, supplier, cost) = 4th uuid
    expect(sent(f)).toEqual({
      idempotency_key: "00000000-0000-4000-8000-000000000004", type: "RECEIVE", location: "vejle-hub",
      shared_sku: "SCR-IP13-OLED", qty: 5, supplier: "Foneday", cost_price_ore: 41550,
    });
  });

  it("allows counting zero", async () => {
    const f = respond(201, { movement: { balance_after: 0 }, replayed: false });
    vi.stubGlobal("fetch", f);
    render(<MovementForm location="vejle-hub" part={part} onDone={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText("Handling"), { target: { value: "COUNT" } });
    fireEvent.change(screen.getByLabelText("Optalt antal"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Bogfør" }));
    await waitFor(() => expect(f).toHaveBeenCalled());
    expect(sent(f)).toMatchObject({ type: "COUNT", qty: 0 });
  });

  it("requires a purpose for a take, without calling the server", async () => {
    const f = respond(201, {});
    vi.stubGlobal("fetch", f);
    render(<MovementForm location="phonespot-slagelse" part={part} onDone={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText("Handling"), { target: { value: "TAKE" } });
    fireEvent.click(screen.getByRole("button", { name: "Bogfør" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Udfyld formål");
    expect(f).not.toHaveBeenCalled();
  });

  it("shows the server's error, keeps the key on an unchanged retry, and uses a new key after an edit", async () => {
    const f = respond(502, { error: "Lagersystemet svarer ikke lige nu. Prøv igen om lidt." });
    vi.stubGlobal("fetch", f);
    render(<MovementForm location="vejle-hub" part={part} onDone={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Bogfør" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Lagersystemet svarer ikke lige nu.");
    fireEvent.click(screen.getByRole("button", { name: "Bogfør" }));
    await waitFor(() => expect(f).toHaveBeenCalledTimes(2));
    expect(sent(f, 1).idempotency_key).toBe(sent(f, 0).idempotency_key);
    fireEvent.change(screen.getByLabelText("Antal modtaget"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Bogfør" }));
    await waitFor(() => expect(f).toHaveBeenCalledTimes(3));
    expect(sent(f, 2).idempotency_key).not.toBe(sent(f, 0).idempotency_key);
  });
});
