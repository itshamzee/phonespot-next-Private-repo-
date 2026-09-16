import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SellDeviceWizard } from "../sell-device-wizard";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const next = () => screen.getByRole("button", { name: "Næste" });
function category(name = "Telefon") {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));
}
function custom(type = "Telefon", brand = "Fairphone", model = "5") {
  category(type);
  fireEvent.click(
    screen.getByRole("button", { name: /Min enhed findes ikke/ }),
  );
  fireEvent.change(screen.getByLabelText("Mærke"), {
    target: { value: brand },
  });
  fireEvent.change(screen.getByLabelText("Model"), {
    target: { value: model },
  });
}
function choose(label: string, value: string) {
  fireEvent.click(
    within(screen.getByRole("group", { name: label })).getByRole("button", {
      name: value,
    }),
  );
}
function condition(cloud = true, screenCondition = "Perfekt", working = "Ja") {
  choose("Skærm", screenCondition);
  choose(cloud ? "Bagside" : "Kabinet", "Perfekt");
  choose("Batteri", "Godt (80%+)");
  choose("Fungerer alt?", working);
  if (cloud) choose("iCloud / Google-konto låst?", "Nej");
}
function contact() {
  fireEvent.click(screen.getByRole("button", { name: /^Aflever i butik/ }));
  fireEvent.change(screen.getByLabelText("Vælg butik"), {
    target: { value: "Vejle" },
  });
  fireEvent.change(screen.getByLabelText(/Navn/), {
    target: { value: " Test Kunde " },
  });
  fireEvent.change(screen.getByLabelText(/Telefon/), {
    target: { value: "12345678" },
  });
  fireEvent.change(screen.getByLabelText(/E-mail/), {
    target: { value: "test@example.com" },
  });
}
function toContact() {
  custom();
  fireEvent.click(next());
  condition();
  fireEvent.click(next());
  contact();
}

describe("vurderingsanmodning", () => {
  it("kræver en komplet model og nulstiller gammel model ved kategoriskift", () => {
    render(<SellDeviceWizard />);
    expect(next()).toBeDisabled();
    category();
    fireEvent.click(screen.getByLabelText("Mærke"));
    fireEvent.click(screen.getByRole("option", { name: "Apple" }));
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Model"));
    fireEvent.click(screen.getByRole("option", { name: "iPhone 16" }));
    expect(next()).toBeEnabled();
    category("Laptop");
    expect(next()).toBeDisabled();
    expect(screen.getByLabelText("Model")).toHaveTextContent(
      "Vælg mærke først",
    );
  });
  it("lukker søgning med Escape og returnerer fokus til udløseren", () => {
    render(<SellDeviceWizard />);
    category();
    const trigger = screen.getByLabelText("Mærke");
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByPlaceholderText("Søg..."), { key: "Escape" });
    expect(screen.queryByPlaceholderText("Søg...")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
  it("vælger et filtreret mærke og model med piletast og Enter", () => {
    render(<SellDeviceWizard />);
    category();
    fireEvent.click(screen.getByLabelText("Mærke"));
    let search = screen.getByPlaceholderText("Søg...");
    fireEvent.change(search, { target: { value: "Apple" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(screen.getByLabelText("Mærke")).toHaveTextContent("Apple");
    fireEvent.click(screen.getByLabelText("Model"));
    search = screen.getByPlaceholderText("Søg...");
    fireEvent.change(search, { target: { value: "iPhone 13 mini" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(screen.getByLabelText("Model")).toHaveTextContent("iPhone 13 mini");
    expect(next()).toBeEnabled();
  });
  it("refererer kun en aktiv mulighed, når søgeresultatet findes", () => {
    render(<SellDeviceWizard />);
    category();
    fireEvent.click(screen.getByLabelText("Mærke"));
    const search = screen.getByPlaceholderText("Søg...");
    fireEvent.change(search, { target: { value: "findes ikke" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(search).not.toHaveAttribute("aria-activedescendant");
    fireEvent.keyDown(search, { key: "ArrowUp" });
    expect(search).not.toHaveAttribute("aria-activedescendant");

    fireEvent.change(search, { target: { value: "Apple" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    const activeId = search.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId!)).toHaveTextContent("Apple");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(screen.getByLabelText("Mærke")).toHaveTextContent("Apple");
  });
  it("bevarer custom model og stand tilbage og frem og fokuserer aktivt trin", () => {
    render(<SellDeviceWizard />);
    custom();
    fireEvent.click(next());
    expect(
      screen.getByRole("heading", { name: "Hvordan er standen?" }),
    ).toHaveFocus();
    condition();
    fireEvent.click(screen.getByRole("button", { name: "Tilbage" }));
    expect(screen.getByLabelText("Mærke")).toHaveValue("Fairphone");
    expect(screen.getByLabelText("Model")).toHaveValue("5");
    fireEvent.click(next());
    expect(
      within(screen.getByRole("group", { name: "Skærm" })).getByRole("button", {
        name: "Perfekt",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(next()).toBeEnabled();
  });
  it("kræver cloud-status for telefon og viser defekte dele", () => {
    render(<SellDeviceWizard />);
    custom();
    fireEvent.click(next());
    choose("Skærm", "Revnet");
    choose("Bagside", "Perfekt");
    choose("Batteri", "Ved ikke");
    choose("Fungerer alt?", "Nej");
    fireEvent.click(screen.getByRole("button", { name: "Kamera" }));
    expect(next()).toBeDisabled();
    choose("iCloud / Google-konto låst?", "Ja");
    expect(
      screen.getByText(/Du skal fjerne låsen inden salg/),
    ).toBeInTheDocument();
    expect(next()).toBeEnabled();
  });
  it("bevarer to enheders særskilte stand, lagerplads og RAM i butikspayload", async () => {
    render(<SellDeviceWizard />);
    custom();
    fireEvent.click(screen.getByRole("button", { name: "128GB" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Tilføj endnu en enhed/ }),
    );
    custom("Laptop", "Framework", "13");
    fireEvent.click(screen.getByRole("button", { name: "512GB SSD" }));
    fireEvent.click(screen.getByRole("button", { name: "16GB" }));
    fireEvent.click(next());
    condition(true, "Revnet", "Nej");
    fireEvent.click(screen.getByRole("button", { name: "Kamera" }));
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /2\.\s*Framework 13/ }));
    expect(
      screen.queryByRole("group", { name: /iCloud/ }),
    ).not.toBeInTheDocument();
    condition(false);
    fireEvent.click(next());
    contact();
    fireEvent.click(screen.getByRole("button", { name: "Send til vurdering" }));
    await screen.findByRole("heading", { name: /Tak for din henvendelse/ });
    const [url, request] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(request?.method).toBe("POST");
    const body = JSON.parse(request!.body as string);
    expect(body).toMatchObject({
      source: "saelg-enhed",
      store_id: "vejle",
      name: "Test Kunde",
      metadata: {
        preferredStore: "Vejle",
        deliveryMethod: "Aflever i butik",
        devices: [
          {
            device: {
              brandCustom: "Fairphone",
              modelCustom: "5",
              storage: "128GB",
            },
            condition: {
              screen: "Revnet",
              brokenParts: ["Kamera"],
              cloudLocked: "Nej",
            },
          },
          {
            device: {
              brandCustom: "Framework",
              modelCustom: "13",
              storage: "512GB SSD",
              ram: "16GB",
            },
            condition: { screen: "Perfekt", cloudLocked: "" },
          },
        ],
      },
    });
  });
  it("bevarer oplysninger efter en uventet netværksfejl og kan prøve igen", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<SellDeviceWizard />);
    toContact();
    fireEvent.click(screen.getByRole("button", { name: "Send til vurdering" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Kunne ikke sende anmodningen. Prøv igen.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("Failed to fetch");
    expect(screen.getByLabelText(/Navn/)).toHaveValue(" Test Kunde ");
    expect(screen.getByLabelText(/E-mail/)).toHaveValue("test@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send til vurdering" }));
    await screen.findByRole("heading", { name: /Tak for din henvendelse/ });
    expect(vi.mocked(fetch).mock.calls[1][1]?.body).toBe(
      vi.mocked(fetch).mock.calls[0][1]?.body,
    );
  });
  it("viser en kendt fejl fra kontakt-endpointet", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Kunne ikke sende besked" }),
    } as Response);
    render(<SellDeviceWizard />);
    toContact();
    fireEvent.click(screen.getByRole("button", { name: "Send til vurdering" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Kunne ikke sende besked",
    );
  });
  it("beskytter en igangværende afsendelse mod gentagelse og tilbagenavigation", async () => {
    let resolve!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    render(<SellDeviceWizard />);
    toContact();
    fireEvent.click(screen.getByRole("button", { name: "Send til vurdering" }));
    const submitting = screen.getByRole("button", { name: "Sender..." });
    expect(submitting).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tilbage" })).toBeDisabled();
    fireEvent.click(submitting);
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => resolve(new Response(null, { status: 200 })));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Tak for din henvendelse/ }),
      ).toBeInTheDocument(),
    );
  });
});
