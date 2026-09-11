import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AccepterPage from "@/app/saelg-din-enhed/accepter/page";
import AfvisPage from "@/app/saelg-din-enhed/afvis/page";
const fixture = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => fixture.params }));
const offer = {
  offer_id: "fixture-offer",
  offer_amount: 1500,
  expires_at: "2099-01-01T00:00:00Z",
  prefill: {
    name: "Test Kunde",
    email: "test@example.com",
    phone: "12345678",
    device: {
      deviceType: "Telefon",
      brand: "Apple",
      model: "iPhone 13",
      storage: "128GB",
    },
    condition: { screen: "Perfekt" },
    deliveryMethod: "Aflever i butik",
  },
};
beforeEach(() => {
  fixture.params = new URLSearchParams();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => offer }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("privat tilbudssvar", () => {
  it.each([AccepterPage, AfvisPage])(
    "viser ugyldigt link uden request eller finansiel handling når token mangler",
    async (Page) => {
      render(<Page />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Ugyldigt link.",
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("respekterer udløbet tilbud fra status-endpoint", async () => {
    fixture.params = new URLSearchParams("token=fixture-expired");
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Tilbuddet er udløbet." }),
    } as Response);
    render(<AccepterPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tilbuddet er udløbet.",
    );
    expect(
      screen.queryByRole("button", { name: "Acceptér tilbud" }),
    ).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/trade-in/offer-status?token=fixture-expired",
    );
  });
  it("viser dansk vejledning ved en uventet fejl under accept", async () => {
    fixture.params = new URLSearchParams("token=fixture-accept-error");
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => offer } as Response)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<AccepterPage />);
    for (const [label, value] of [
      ["Adresse", "Testvej 1"],
      ["Postnr.", "7100"],
      ["By", "Vejle"],
      ["Reg.nr. *", "1234"],
      ["Kontonr. *", "1234567890"],
    ])
      fireEvent.change(await screen.findByLabelText(label), {
        target: { value },
      });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Acceptér tilbud" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Kunne ikke acceptere tilbuddet. Prøv igen.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("Failed to fetch");
  });
  it("viser dansk vejledning ved en uventet fejl under afvisning", async () => {
    fixture.params = new URLSearchParams("token=fixture-reject-error");
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => offer } as Response)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<AfvisPage />);
    fireEvent.change(await screen.findByLabelText("Kommentar (valgfri)"), {
      target: { value: "Jeg afventer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Afvis tilbud" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Kunne ikke afvise tilbuddet. Prøv igen.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("Failed to fetch");
  });
  it("bevarer en kendt konflikt fra tilbuds-endpointet", async () => {
    fixture.params = new URLSearchParams("token=fixture-expired-submit");
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => offer } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Tilbuddet er udløbet" }),
      } as Response);
    render(<AfvisPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Afvis tilbud" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tilbuddet er udløbet",
    );
  });
  it("kobler bank- og adressefelters labels korrekt og bevarer acceptpayload", async () => {
    fixture.params = new URLSearchParams("token=fixture-accept");
    render(<AccepterPage />);
    expect(await screen.findByLabelText("Fulde navn *")).toHaveValue(
      "Test Kunde",
    );
    expect(
      screen.getByRole("button", { name: "Acceptér tilbud" }),
    ).toBeDisabled();
    for (const [label, value] of [
      ["Adresse", "Testvej 1"],
      ["Postnr.", "7100"],
      ["By", "Vejle"],
      ["Reg.nr. *", "1234"],
      ["Kontonr. *", "1234567890"],
    ])
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Acceptér tilbud" }));
    await screen.findByRole("heading", { name: /Tilbud accepteret/ });
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe("/api/trade-in/accept");
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string),
    ).toEqual({
      token: "fixture-accept",
      seller_name: "Test Kunde",
      seller_address: "Testvej 1",
      seller_zipcode: "7100",
      seller_city: "Vejle",
      seller_bank_reg: "1234",
      seller_bank_account: "1234567890",
      confirmed: true,
      seller_postal_city: "7100 Vejle",
    });
  });
  it("navngiver kommentarfeltet og bevarer afvisningspayload", async () => {
    fixture.params = new URLSearchParams("token=fixture-reject");
    render(<AfvisPage />);
    fireEvent.change(await screen.findByLabelText("Kommentar (valgfri)"), {
      target: { value: "Testkommentar" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Afvis tilbud" }));
    await screen.findByRole("heading", { name: "Tilbud afvist" });
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe("/api/trade-in/reject");
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string),
    ).toEqual({
      token: "fixture-reject",
      customer_response_note: "Testkommentar",
    });
  });
});
