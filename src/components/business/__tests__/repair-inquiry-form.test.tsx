import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RepairInquiryForm } from "../repair-inquiry-form";

function fillInquiry(region = "sjaelland") {
  for (const [label, value] of [
    ["Kontaktperson", "  Anne Jensen  "],
    ["Virksomhed", "  Kontor ApS  "],
    ["E-mail", "anne@example.com"],
    ["Telefon", "  12345678  "],
    ["Postnummer og by", "  4000 Roskilde  "],
    ["Antal enheder", "8"],
    ["Beskriv enhederne og problemet", "  Fem iPhones med slidte batterier og tre iPads med knuste skærme.  "],
  ]) {
    fireEvent.change(screen.getByLabelText(label, { exact: false }), {
      target: { value },
    });
  }
  fireEvent.change(screen.getByLabelText("Landsdel", { exact: false }), {
    target: { value: region },
  });
}

beforeEach(() => {
  // Contact sends staff mail and writes a lead; never call it from a test.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected request")));
});
afterEach(() => vi.unstubAllGlobals());

describe("business repair inquiry", () => {
  it.each([
    ["sjaelland", "slagelse", "Sjælland"],
    ["jylland", "vejle", "Jylland"],
  ])("includes the full job in the staff message and routes %s to %s", async (region, store, regionLabel) => {
    const send = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", send);
    render(<RepairInquiryForm />);
    fillInquiry(region);
    fireEvent.click(screen.getByRole("button", { name: "Send forespørgsel" }));

    await screen.findByRole("heading", { name: "Tak for jeres forespørgsel." });
    expect(send).toHaveBeenCalledTimes(1);
    const [url, request] = send.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(request.method).toBe("POST");
    expect(request.headers).toEqual({ "Content-Type": "application/json" });
    const body = JSON.parse(request.body);
    expect(body).toMatchObject({
      name: "Anne Jensen",
      email: "anne@example.com",
      phone: "12345678",
      subject: "Erhvervsreparation på virksomheden",
      source: "erhvervsreparation",
      store_id: store,
      metadata: {
        company: "Kontor ApS",
        location: "4000 Roskilde",
        region: regionLabel,
        device_count: 8,
      },
    });
    expect(body.message).toBe(
      `Virksomhed: Kontor ApS\nPostnummer og by: 4000 Roskilde\nLandsdel: ${regionLabel}\nAntal enheder: 8\n\nEnheder og problem:\nFem iPhones med slidte batterier og tre iPads med knuste skærme.`,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/aftalt|aftale/);
    expect(screen.queryByRole("button", { name: "Send forespørgsel" })).not.toBeInTheDocument();
  });

  it.each(["server", "network"])("keeps the job after a %s failure and allows a deliberate retry", async (failure) => {
    const send = vi.fn();
    if (failure === "network") send.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    else send.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Kunne ikke sende besked" }), { status: 500 }));
    send.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", send);
    render(<RepairInquiryForm />);
    fillInquiry();
    fireEvent.click(screen.getByRole("button", { name: "Send forespørgsel" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ikke sendes/);
    expect(screen.getByLabelText("Virksomhed", { exact: false })).toHaveValue("  Kontor ApS  ");
    expect(screen.getByLabelText("Antal enheder", { exact: false })).toHaveValue(8);
    expect(screen.getByLabelText("Beskriv enhederne og problemet", { exact: false })).toHaveValue("  Fem iPhones med slidte batterier og tre iPads med knuste skærme.  ");
    expect(screen.getByRole("button", { name: "Send forespørgsel" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Send forespørgsel" }));
    await screen.findByRole("heading", { name: "Tak for jeres forespørgsel." });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][1].body).toBe(send.mock.calls[0][1].body);
  });

  it("sends once during concurrent submits and disables the fields while waiting", async () => {
    let finish!: (response: Response) => void;
    const send = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", send);
    render(<RepairInquiryForm />);
    fillInquiry();
    const form = screen.getByRole("form", { name: "Forespørgsel om erhvervsreparation" });
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(form).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Kontaktperson", { exact: false })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sender forespørgsel…" })).toBeDisabled();
    await act(async () => finish(new Response(JSON.stringify({ success: true }), { status: 200 })));
    expect(await screen.findByRole("status")).toHaveTextContent("Tak for jeres forespørgsel.");
  });

  it("does not send incomplete or whitespace-only contact details", async () => {
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    render(<RepairInquiryForm />);
    fireEvent.click(screen.getByRole("button", { name: "Send forespørgsel" }));
    expect(send).not.toHaveBeenCalled();
    fillInquiry();
    fireEvent.change(screen.getByLabelText("Kontaktperson", { exact: false }), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Send forespørgsel" }));
    await waitFor(() => expect(send).not.toHaveBeenCalled());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
