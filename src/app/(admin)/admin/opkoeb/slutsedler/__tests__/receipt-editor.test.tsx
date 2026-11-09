import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";

const LOC = "00000000-0000-4000-8000-000000000020";
const RID = "00000000-0000-4000-8000-000000000050";
const TPL = "00000000-0000-4000-8000-000000000070";
const VALID_IMEI = "490154203237518";

const nav = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => {
    throw new Error("the editor must not read the database from the browser in these tests");
  },
}));

type Call = { url: string; method: string; body: Record<string, unknown> | undefined };
const api = vi.hoisted(() => ({
  calls: [] as Call[],
  confirm: { status: 200, body: { receipt_number: "SS-2026-0001", device_ids: [] } as Record<string, unknown> },
}));

const json = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

vi.mock("@/lib/buyback/admin-fetch", () => ({
  staffFetch: vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = (init.method ?? "GET").toUpperCase();
    const body = typeof init.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : undefined;
    api.calls.push({ url, method, body });
    if (url === "/api/trade-in/receipts" && method === "POST") return json(201, { id: RID, status: "draft" });
    if (url === `/api/trade-in/receipts/${RID}` && method === "PATCH") return json(200, { id: RID, status: "draft" });
    if (url === `/api/trade-in/receipts/${RID}/confirm`) return json(api.confirm.status, api.confirm.body);
    if (url.startsWith("/api/platform/templates")) {
      return json(200, [{ id: TPL, brand: "Apple", model: "iPhone 13", display_name: "iPhone 13", storage_options: ["128GB", "256GB"] }]);
    }
    if (url === "/api/trade-in/price-suggestion") {
      return json(200, {
        status: "ok",
        aim_oere: 240000,
        floor_oere: 200000,
        note: body?.condition === "Acceptabel" ? "Prisforslaget tager ikke højde for ridser og slid. Justér selv prisen." : undefined,
        green_url: "https://www.google.com/search?q=green.dk+iPhone+13",
      });
    }
    if (url.startsWith("/api/customers/cvr")) {
      return json(200, { cvr: "12345678", company_name: "Firma ApS", address: "Industrivej 2", zip: "7100", city: "Vejle", cached: false });
    }
    return json(404, { error: "not mocked" });
  }),
}));

import { ReceiptEditor } from "../_components/receipt-editor";

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string) => fireEvent.change(field(label), { target: { value } });
const confirmButton = () => screen.getByRole("button", { name: "Bekræft og print" }) as HTMLButtonElement;

let popup: { location: { href: string }; close: ReturnType<typeof vi.fn> };

beforeEach(() => {
  api.calls = [];
  api.confirm = { status: 200, body: { receipt_number: "SS-2026-0001", device_ids: [] } };
  nav.replace.mockReset();
  nav.push.mockReset();
  popup = { location: { href: "" }, close: vi.fn() };
  vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function pickModel() {
  type("Model, vare 1", "iPhone 13");
  fireEvent.click(await screen.findByRole("option", { name: /iPhone 13/ }));
}

/** Fills in a complete private receipt for 2.400 kr. through the UI. */
async function fillComplete() {
  type("IMEI eller serienummer, vare 1", VALID_IMEI);
  await pickModel();
  fireEvent.change(screen.getByLabelText("Stand, vare 1"), { target: { value: "God" } });
  await waitFor(() => expect(field("Pris, vare 1").value).toBe("2.400"));
  type("Navn", "Mette Hansen");
  type("Adresse", "Vestergade 1");
  type("Postnr. og by", "7100 Vejle");
  fireEvent.click(screen.getByLabelText("Sælger er fyldt 18"));
  fireEvent.click(screen.getByLabelText("Find My/iCloud er slået fra, og enheden er ikke spærret eller meldt stjålet"));
  // Over 2.000 kr.: ID is required.
  fireEvent.change(screen.getByLabelText("ID-type"), { target: { value: "koerekort" } });
  type("ID-nummer", "12345678");
  type("Udløbsdato", "2030-01-01");
  fireEvent.click(screen.getByRole("radio", { name: "Bank" }));
  type("Reg.nr.", "1234");
  type("Kontonummer", "1234567");
  fireEvent.click(screen.getByLabelText("Kontoen står i sælgers navn"));
}

describe("ReceiptEditor", () => {
  it("focuses the IMEI field on load", () => {
    render(<ReceiptEditor locationId={LOC} />);
    expect(document.activeElement).toBe(field("IMEI eller serienummer, vare 1"));
  });

  it("shows no ID fields at 2.000 kr., but does at 2.000,01 kr., with the CPR warning", () => {
    render(<ReceiptEditor locationId={LOC} />);
    type("Pris, vare 1", "2000");
    expect(screen.queryByLabelText("ID-nummer")).toBeNull();
    type("Pris, vare 1", "2000,01");
    expect(screen.getByLabelText("ID-nummer")).toBeTruthy();
    expect(screen.getByText("Skriv ikke CPR-nummer.")).toBeTruthy();
    expect(screen.getByText("ID kræves over 2.000 kr.")).toBeTruthy();
  });

  it("shows 'Ugyldigt IMEI' immediately for a bad IMEI, and not for a valid one", () => {
    render(<ReceiptEditor locationId={LOC} />);
    type("IMEI eller serienummer, vare 1", "490154203237519");
    expect(screen.getByText("Ugyldigt IMEI")).toBeTruthy();
    type("IMEI eller serienummer, vare 1", VALID_IMEI);
    expect(screen.queryByText("Ugyldigt IMEI")).toBeNull();
  });

  it("keeps 'Bekræft og print' disabled while confirmBlockers is not empty", () => {
    render(<ReceiptEditor locationId={LOC} />);
    expect(confirmButton().disabled).toBe(true);
    const blockers = screen.getByRole("list", { name: "Mangler før bekræftelse" });
    expect(within(blockers).getByText("Sælgers navn mangler")).toBeTruthy();
    expect(within(blockers).getByText("Vælg udbetaling")).toBeTruthy();
  });

  it("fetches a price suggestion once model and condition are chosen, with the Green.dk link and the note", async () => {
    render(<ReceiptEditor locationId={LOC} />);
    await pickModel();
    fireEvent.change(screen.getByLabelText("Stand, vare 1"), { target: { value: "Acceptabel" } });
    const link = (await screen.findByRole("link", { name: "Se Green.dk's pris" })) as HTMLAnchorElement;
    expect(link.href).toContain("green.dk");
    expect(link.target).toBe("_blank");
    expect(screen.getByText(/tager ikke højde for ridser/)).toBeTruthy();
    const suggestion = api.calls.find((c) => c.url === "/api/trade-in/price-suggestion")!;
    expect(suggestion.body).toMatchObject({ template_id: TPL, condition: "Acceptabel" });
  });

  it("a click on 'Bekræft og print' creates the draft with POST, then confirms and opens the PDF", async () => {
    render(<ReceiptEditor locationId={LOC} />);
    await fillComplete();
    await waitFor(() => expect(confirmButton().disabled).toBe(false));
    fireEvent.click(confirmButton());
    await waitFor(() => expect(popup.location.href).toBe(`/api/trade-in/receipts/${RID}/pdf`));

    const creates = api.calls.filter((c) => c.url === "/api/trade-in/receipts" && c.method === "POST");
    expect(creates).toHaveLength(1);
    const createAt = api.calls.indexOf(creates[0]);
    const confirmAt = api.calls.findIndex((c) => c.url === `/api/trade-in/receipts/${RID}/confirm`);
    expect(confirmAt).toBeGreaterThan(createAt);
    expect(api.calls[confirmAt].method).toBe("POST");

    // The saved draft as the server sees it.
    const lastSave = [...api.calls].slice(0, confirmAt).reverse().find((c) => c.url.startsWith("/api/trade-in/receipts") && c.body)!;
    expect(lastSave.body).toMatchObject({
      seller_type: "private",
      seller_name: "Mette Hansen",
      seller_cvr: null,
      invoice_type: null,
      seller_email: null,
      payout_method: "bank",
      seller_bank_reg: "1234",
      seller_bank_account: "1234567",
      id_type: "koerekort",
      id_number: "12345678",
      items: [expect.objectContaining({ template_id: TPL, imei_serial: VALID_IMEI, price: 240000, suggested_price: 240000, condition_grade: "God" })],
    });
    expect(creates[0].body).toMatchObject({ location_id: LOC });
    expect(nav.push).toHaveBeenCalledWith(`/admin/opkoeb/slutsedler/${RID}`);
  });

  it("shows the server's Danish message when confirmation is refused, and closes the empty tab", async () => {
    api.confirm = { status: 409, body: { error: "IMEI 490154203237518 er allerede på lager" } };
    render(<ReceiptEditor locationId={LOC} />);
    await fillComplete();
    await waitFor(() => expect(confirmButton().disabled).toBe(false));
    fireEvent.click(confirmButton());
    expect(await screen.findByText("IMEI 490154203237518 er allerede på lager")).toBeTruthy();
    expect(popup.close).toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("never autosaves after confirmation", async () => {
    render(<ReceiptEditor locationId={LOC} />);
    await fillComplete();
    await waitFor(() => expect(confirmButton().disabled).toBe(false));
    fireEvent.click(confirmButton());
    await waitFor(() => expect(nav.push).toHaveBeenCalled());
    const before = api.calls.filter((c) => c.url.startsWith("/api/trade-in/receipts")).length;
    type("Navn", "Rettet efter bekræftelse");
    await new Promise((r) => setTimeout(r, 1300));
    expect(api.calls.filter((c) => c.url.startsWith("/api/trade-in/receipts")).length).toBe(before);
  });

  it("MitID hides the expiry field", () => {
    render(<ReceiptEditor locationId={LOC} />);
    type("Pris, vare 1", "2500");
    expect(screen.getByLabelText("Udløbsdato")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("ID-type"), { target: { value: "mitid" } });
    expect(screen.queryByLabelText("Udløbsdato")).toBeNull();
  });

  it("shows an error for a battery health above 100 %", () => {
    render(<ReceiptEditor locationId={LOC} />);
    type("Batteri, vare 1", "150");
    expect(screen.getByText("Batteri skal være mellem 0 og 100 %")).toBeTruthy();
    type("Batteri, vare 1", "88");
    expect(screen.queryByText("Batteri skal være mellem 0 og 100 %")).toBeNull();
  });

  it("modregning shows the bank fields as optional with help text, and saves a filled-in account", async () => {
    render(<ReceiptEditor locationId={LOC} />);
    fireEvent.click(screen.getByRole("radio", { name: "Modregnes i køb i kassen" }));
    expect(screen.getByText("Udfyld konto, hvis købet i kassen kan blive mindre end opkøbet.")).toBeTruthy();
    // Optional: no account is no blocker.
    const blockers = screen.getByRole("list", { name: "Mangler før bekræftelse" });
    expect(within(blockers).queryByText("Reg.nr. skal være 4 cifre")).toBeNull();
    type("Reg.nr.", "1234");
    type("Kontonummer", "12345678");
    // Filled in: the owner confirmation is then required.
    expect(within(screen.getByRole("list", { name: "Mangler før bekræftelse" })).getByText("Bekræft at kontoen står i sælgers navn")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Kontoen står i sælgers navn"));
    await waitFor(
      () => {
        const saves = api.calls.filter((c) => c.url.startsWith("/api/trade-in/receipts") && c.body);
        expect(saves[saves.length - 1]?.body).toMatchObject({
          payout_method: "modregning",
          seller_bank_reg: "1234",
          seller_bank_account: "12345678",
          account_owner_confirmed: true,
        });
      },
      { timeout: 4000 },
    );
  });

  it("autosaves: creates the draft after the first input, then patches", async () => {
    render(<ReceiptEditor locationId={LOC} />);
    expect(api.calls.filter((c) => c.url.startsWith("/api/trade-in/receipts"))).toHaveLength(0);
    type("Navn", "Mette");
    await waitFor(() => expect(api.calls.some((c) => c.url === "/api/trade-in/receipts" && c.method === "POST")).toBe(true), {
      timeout: 2500,
    });
    expect(await screen.findByText("Gemt")).toBeTruthy();
    type("Navn", "Mette Hansen");
    await waitFor(
      () => expect(api.calls.some((c) => c.url === `/api/trade-in/receipts/${RID}` && c.method === "PATCH")).toBe(true),
      { timeout: 2500 },
    );
    const patch = api.calls.find((c) => c.method === "PATCH")!;
    expect(patch.body).toMatchObject({ seller_name: "Mette Hansen" });
    expect(api.calls.filter((c) => c.url === "/api/trade-in/receipts" && c.method === "POST")).toHaveLength(1);
  });

  it("firma shows invoice type and CVR lookup, fills the company, and hides the 18+ checkbox", async () => {
    render(<ReceiptEditor locationId={LOC} />);
    expect(screen.getByLabelText("Sælger er fyldt 18")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Firma" }));
    expect(screen.queryByLabelText("Sælger er fyldt 18")).toBeNull();
    expect(screen.getByLabelText("Fakturatype")).toBeTruthy();
    type("CVR-nummer", "12345678");
    fireEvent.click(screen.getByRole("button", { name: "Slå op i CVR" }));
    await waitFor(() => expect(field("Firmanavn").value).toBe("Firma ApS"));
    expect(field("Adresse").value).toBe("Industrivej 2");
    expect(field("Postnr. og by").value).toBe("7100 Vejle");
  });
});
