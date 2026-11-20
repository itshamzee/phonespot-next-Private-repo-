import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SellDeviceWizard, fiksPrefill } from "../sell-device-wizard";

// The live guide price has its own tests; here only the Fiks quote and the form's own submit use fetch.
vi.mock("@/components/sell-device/guide-price-panel", () => ({ GuidePricePanel: () => null, GuidePriceTeaser: () => null }));

const QUOTE = {
  model: "iPhone 13",
  storage: "128GB",
  answers: { screen: "Små ridser", back: "Perfekt", battery: "God (80%+)", charging_broken: true, other_faults: false, cloud_locked: "Nej" },
  amount: 2150,
};

const fetchMock = vi.fn();

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}

function routeFetch(quote: unknown, status = 200) {
  fetchMock.mockImplementation((url: string) => {
    if (String(url).startsWith("/api/fiks/quote")) return json(quote, status);
    return json({ ok: true });
  });
}

function pressed(group: string, value: string) {
  return within(screen.getByRole("group", { name: group })).getByRole("button", { name: value }).getAttribute("aria-pressed");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("fiksPrefill", () => {
  it("maps a full quote to the form's own values and lands on contact details", () => {
    const p = fiksPrefill(QUOTE)!;
    expect(p.device).toMatchObject({ deviceType: "Telefon", brand: "Apple", model: "iPhone 13", storage: "128GB", useCustom: false });
    expect(p.condition).toEqual({
      screen: "Små ridser",
      back: "Perfekt",
      battery: "God (80%+)",
      allWorking: "Nej",
      brokenParts: ["Opladning"],
      cloudLocked: "Nej",
    });
    expect(p.step).toBe(2);
    expect(p.amount).toBe(2150);
  });

  it("matches model and storage loosely but only to listed values", () => {
    const p = fiksPrefill({ ...QUOTE, model: " iphone  13 ", storage: "128 GB" })!;
    expect(p.device.model).toBe("iPhone 13");
    expect(p.device.storage).toBe("128GB");
  });

  it("leaves unknown answers empty and lands on the first step that needs them", () => {
    expect(fiksPrefill({ ...QUOTE, storage: "3TB" })!.step).toBe(0);
    const partial = fiksPrefill({ ...QUOTE, answers: { ...QUOTE.answers, screen: "Smadret" } })!;
    expect(partial.condition.screen).toBe("");
    expect(partial.step).toBe(1);
  });

  it("gives up on models the form does not list and on bad amounts", () => {
    expect(fiksPrefill({ ...QUOTE, model: "Galaxy S24" })).toBeNull();
    expect(fiksPrefill({ ...QUOTE, amount: "2150" })).toBeNull();
    expect(fiksPrefill({ ...QUOTE, amount: 0 })).toBeNull();
    expect(fiksPrefill(null)).toBeNull();
  });
});

describe("SellDeviceWizard with ?fiks=<token>", () => {
  it("prefills from the server quote, lands on contact details and shows Fiks' price", async () => {
    // A price in the URL is ignored: only the server's stored quote counts.
    window.history.replaceState(null, "", "/saelg-din-enhed?model=iPhone+13&storage=128GB&fiks=tok-1&amount=99999&price=99999");
    routeFetch(QUOTE);
    render(<SellDeviceWizard />);

    expect(await screen.findByRole("heading", { name: "Hvordan vil du levere?" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/fiks/quote?token=tok-1");
    expect(screen.getByRole("status")).toHaveTextContent("Vejledende pris fra Fiks: 2.150 kr.");
    expect(document.body.textContent).not.toContain("99.999");

    // Going back shows the preselected device and condition.
    fireEvent.click(screen.getByRole("button", { name: "Tilbage" }));
    expect(pressed("Skærm", "Små ridser")).toBe("true");
    expect(pressed("Fungerer alt?", "Nej")).toBe("true");
    expect(screen.getByRole("button", { name: /Opladning/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Tilbage" }));
    expect(screen.getByRole("button", { name: "128GB" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Apple iPhone 13")).toBeInTheDocument();
  });

  it("sends the Fiks price with the request so staff see it", async () => {
    window.history.replaceState(null, "", "/saelg-din-enhed?fiks=tok-2");
    routeFetch(QUOTE);
    render(<SellDeviceWizard />);
    await screen.findByRole("heading", { name: "Hvordan vil du levere?" });

    fireEvent.click(screen.getByRole("button", { name: /^Aflever i butik/ }));
    fireEvent.change(screen.getByLabelText("Vælg butik"), { target: { value: "Vejle" } });
    fireEvent.change(screen.getByLabelText(/Navn/), { target: { value: "Test Kunde" } });
    fireEvent.change(screen.getByLabelText(/Telefon/), { target: { value: "12345678" } });
    fireEvent.change(screen.getByLabelText(/E-mail/), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send til vurdering" }));
    await screen.findByRole("heading", { name: /Tak for din henvendelse/ });

    const post = fetchMock.mock.calls.find(([url]) => url === "/api/contact")!;
    const body = JSON.parse(post[1].body as string);
    expect(body.message).toContain("Model: iPhone 13");
    expect(body.message).toContain("Vejledende pris fra Fiks: 2.150 kr.");
    expect(body.metadata.devices[0]).toMatchObject({
      device: { brand: "Apple", model: "iPhone 13", storage: "128GB" },
      condition: { screen: "Små ridser", brokenParts: ["Opladning"], cloudLocked: "Nej" },
    });
  });

  it("drops the Fiks price once the visitor changes the condition", async () => {
    window.history.replaceState(null, "", "/saelg-din-enhed?fiks=tok-3");
    routeFetch(QUOTE);
    render(<SellDeviceWizard />);
    await screen.findByRole("heading", { name: "Hvordan vil du levere?" });
    fireEvent.click(screen.getByRole("button", { name: "Tilbage" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Skærm" })).getByRole("button", { name: "Revnet" }));
    expect(screen.queryByText(/Vejledende pris fra Fiks/)).toBeNull();
  });

  it("starts as usual when the token is unknown", async () => {
    window.history.replaceState(null, "", "/saelg-din-enhed?fiks=unknown");
    routeFetch({ error: "Ikke fundet" }, 404);
    render(<SellDeviceWizard />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "Hvad vil du sælge?" })).toBeInTheDocument();
    expect(screen.queryByText(/Vejledende pris fra Fiks/)).toBeNull();
    expect(screen.getByRole("button", { name: /^Telefon/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("does not fetch anything without a token", () => {
    window.history.replaceState(null, "", "/saelg-din-enhed?model=iPhone+13&amount=5000");
    render(<SellDeviceWizard />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Vejledende pris fra Fiks/)).toBeNull();
  });
});
