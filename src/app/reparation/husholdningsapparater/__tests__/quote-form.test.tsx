import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { trackLead } = vi.hoisted(() => ({ trackLead: vi.fn() }));
vi.mock("@/lib/tracking/events", () => ({
  trackLead,
  getAttribution: () => ({ utm_source: "google", gclid: "abc" }),
}));

import { QuoteForm, QuoteLink } from "../quote-form";

function fill(values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });
  }
}

beforeEach(() => {
  trackLead.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected request")));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("apparat-formular", () => {
  it("poster til /api/contact med de rigtige felter og fyrer generate_lead", async () => {
    const send = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", send);
    render(<QuoteForm />);
    fill({
      Apparat: "robotstovsugere",
      "Mærke og model": " Roborock S7 ",
      "Hvad er galt?": " Kører ikke længere end to minutter. ",
      Butik: "slagelse",
      Navn: " Anne Jensen ",
      Telefon: "12 34 56 78",
    });
    fireEvent.click(screen.getByRole("button", { name: "Få en fast pris" }));

    await screen.findByRole("heading", { name: "Tak, vi har modtaget din henvendelse." });
    expect(send).toHaveBeenCalledTimes(1);
    const [url, request] = send.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(request.method).toBe("POST");
    const body = JSON.parse(request.body);
    expect(body).toMatchObject({
      name: "Anne Jensen",
      email: "",
      phone: "12 34 56 78",
      subject: "Reparation af apparat: Robotstøvsuger, Roborock S7",
      source: "apparat-reparation",
      store_id: "slagelse",
      metadata: {
        appliance: "Robotstøvsuger",
        brand_model: "Roborock S7",
        store_choice: "Slagelse",
        attribution: { utm_source: "google", gclid: "abc" },
      },
    });
    expect(body.message).toContain("Apparat: Robotstøvsuger");
    expect(body.message).toContain("Butik: Slagelse");
    expect(body.message).toContain("Kører ikke længere end to minutter.");
    expect(trackLead).toHaveBeenCalledWith({ leadType: "appliance_repair", store: "slagelse", category: "robotstovsugere" });
  });

  it("viser fejltekster og sender ikke, når påkrævede felter mangler", () => {
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    render(<QuoteForm />);
    fireEvent.click(screen.getByRole("button", { name: "Få en fast pris" }));
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByText("Vælg, hvilket apparat det drejer sig om.")).toBeTruthy();
    expect(screen.getByText("Skriv et telefonnummer, vi kan ringe til.")).toBeTruthy();
    expect(screen.getByLabelText("Telefon", { exact: false }).getAttribute("aria-invalid")).toBe("true");
    expect(trackLead).not.toHaveBeenCalled();
  });

  it("deaktiverer knappen under afsendelse og viser fejl, når serveren fejler", async () => {
    let resolve: (r: Response) => void = () => {};
    const send = vi.fn().mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    vi.stubGlobal("fetch", send);
    render(<QuoteForm />);
    fill({ Apparat: "andet", "Hvad er galt?": "Virker ikke", Navn: "Ole", Telefon: "87654321" });
    const button = screen.getByRole("button", { name: "Få en fast pris" });
    fireEvent.click(button);
    await waitFor(() => expect((screen.getByRole("button", { name: "Sender" }) as HTMLButtonElement).disabled).toBe(true));
    await act(async () => resolve(new Response("{}", { status: 500 })));
    expect((await screen.findByRole("alert")).textContent).toContain("kunne ikke sendes");
    expect(JSON.parse(send.mock.calls[0][1].body).store_id).toBe("");
    expect(trackLead).not.toHaveBeenCalled();
  });

  it("ignorerer robotter, der udfylder honeypot-feltet", async () => {
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    render(<QuoteForm />);
    fill({ Apparat: "andet", "Hvad er galt?": "x", Navn: "Bot", Telefon: "12345678", "Lad dette felt": "http://spam" });
    fireEvent.click(screen.getByRole("button", { name: "Få en fast pris" }));
    await screen.findByRole("heading", { name: /Tak/ });
    expect(send).not.toHaveBeenCalled();
    expect(trackLead).not.toHaveBeenCalled();
  });

  it("forvælger apparat, når et kategori-link klikkes", () => {
    render(
      <>
        <QuoteLink category="controllere">Få en fast pris her</QuoteLink>
        <QuoteForm />
      </>,
    );
    fireEvent.click(screen.getByText("Få en fast pris her"));
    expect((screen.getByLabelText("Apparat", { exact: false }) as HTMLSelectElement).value).toBe("controllere");
  });
});
