import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";

const RID = "00000000-0000-4000-8000-000000000050";
const LOC = "00000000-0000-4000-8000-000000000020";
const DEV = "00000000-0000-4000-8000-000000000099";

const nav = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav,
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => {
    throw new Error("the detail page must not read the database from the browser");
  },
}));

type Call = { url: string; method: string; body: unknown };
const api = vi.hoisted(() => ({
  calls: [] as Call[],
  receipt: {} as Record<string, unknown>,
  afterUpload: {} as Record<string, unknown>,
  payStatus: 200,
}));

const json = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

vi.mock("@/lib/buyback/admin-fetch", () => ({
  staffFetch: vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = (init.method ?? "GET").toUpperCase();
    const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    api.calls.push({ url, method, body });
    const base = `/api/trade-in/receipts/${RID}`;
    if (url === base && method === "GET") return json(200, api.receipt);
    if (url === "/api/pos/locations") return json(200, { locations: [{ id: LOC, slug: "vejle", name: "Vejle" }] });
    if (url === `${base}/upload`) {
      api.receipt = { ...api.receipt, ...api.afterUpload };
      return json(200, api.receipt);
    }
    if (url === `${base}/pay`) {
      if (api.payStatus !== 200) return json(api.payStatus, { error: "Kontooplysningerne stemmer ikke med slutsedlen" });
      api.receipt = { ...api.receipt, status: "paid" };
      return json(200, api.receipt);
    }
    if (url === `${base}/suspicion`) {
      api.receipt = { ...api.receipt, suspected_at: "2026-11-09T10:00:00Z", suspicion_note: (body as { note: string }).note };
      return json(200, api.receipt);
    }
    return json(404, { error: "not mocked" });
  }),
}));

vi.mock("../_components/compress-image", async (orig) => {
  const real = await orig<typeof import("../_components/compress-image")>();
  return { ...real, prepareUpload: vi.fn(async (f: File) => ({ file: f })) };
});

import { ReceiptDetail } from "../_components/receipt-detail";

const confirmedPrivate = () => ({
  id: RID,
  receipt_number: "SS-2026-0007",
  status: "confirmed",
  location_id: LOC,
  seller_type: "private",
  seller_name: "Jens Hansen",
  seller_address: "Vestergade 1",
  seller_postal_city: "7100 Vejle",
  id_type: "koerekort",
  id_number: "••••4321",
  total_amount: 350000,
  offset_amount: null,
  attestation: "paper_scan",
  payout_method: "bank",
  seller_bank_reg: "1234",
  seller_bank_account: "••••5678",
  has_bank_account: true,
  account_owner_confirmed: true,
  suspected_at: null,
  has_signed_scan: false,
  has_invoice: false,
  has_payout_proof: false,
  created_at: "2026-11-09T08:00:00Z",
  created_by: "staff-1",
  trade_in_receipt_items: [
    { id: "i1", device_id: DEV, brand: "Apple", model: "iPhone 13", storage: "128GB", imei_serial: "490154203237518", price: 350000 },
  ],
});

const payButton = () => screen.getByRole("button", { name: "Marker som udbetalt" }) as HTMLButtonElement;

beforeEach(() => {
  api.calls = [];
  api.receipt = confirmedPrivate();
  api.afterUpload = { has_signed_scan: true };
  api.payStatus = 200;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function open() {
  render(<ReceiptDetail receiptId={RID} />);
  await screen.findByText("SS-2026-0007");
}

describe("ReceiptDetail", () => {
  it("viser Marker som udbetalt deaktiveret med begrundelsen, når den underskrevne seddel mangler", async () => {
    await open();
    expect(payButton().disabled).toBe(true);
    expect(screen.getByText("Læg den underskrevne slutseddel op")).toBeTruthy();
    expect(screen.getByText("Bekræftet")).toBeTruthy();
    expect(screen.getByText("••••4321", { exact: false })).toBeTruthy();
    expect(screen.getByRole("link", { name: /iPhone 13/ }).getAttribute("href")).toBe(`/admin/platform/stock/${DEV}`);
  });

  it("aktiverer knappen efter upload af den underskrevne seddel", async () => {
    await open();
    const input = screen.getByLabelText("Læg underskrevet seddel op") as HTMLInputElement;
    expect(input.getAttribute("accept")).toBe("image/*,application/pdf");
    fireEvent.change(input, { target: { files: [new File(["x"], "seddel.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(payButton().disabled).toBe(false));
    const upload = api.calls.find((c) => c.url.endsWith("/upload"));
    expect(upload).toBeTruthy();
    expect((upload!.body as FormData).get("kind")).toBe("signed_scan");
    expect(screen.queryByText("Læg den underskrevne slutseddel op")).toBeNull();
  });

  it("har en Tag billede-knap, der åbner kameraet på telefoner", async () => {
    await open();
    const camera = screen.getByLabelText("Tag billede") as HTMLInputElement;
    expect(camera.getAttribute("capture")).toBe("environment");
  });

  it("kræver en note i mistanke-dialogen", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Mistanke om tyveri" }));
    const dialog = screen.getByRole("dialog");
    const submit = within(dialog).getByRole("button", { name: "Markér mistanke" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText("Note"), { target: { value: "  " } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText("Note"), { target: { value: "Sælger kunne ikke vise kode" } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(within(dialog).getByLabelText("Politiet er underrettet"));
    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByText("Mistanke")).toBeTruthy());
    const call = api.calls.find((c) => c.url.endsWith("/suspicion"))!;
    expect(call.method).toBe("POST");
    expect(call.body).toEqual({ note: "Sælger kunne ikke vise kode", police_notified: true });
  });

  it("betaler med kontooplysninger, som medarbejderen taster igen", async () => {
    api.receipt = { ...confirmedPrivate(), has_signed_scan: true };
    await open();
    fireEvent.click(payButton());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/••••5678/)).toBeTruthy();
    const submit = within(dialog).getByRole("button", { name: "Bekræft udbetaling" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText("Reg.nr."), { target: { value: "1234" } });
    fireEvent.change(within(dialog).getByLabelText("Kontonummer"), { target: { value: "12345678" } });
    fireEvent.click(within(dialog).getByLabelText("Kontoen står i sælgers navn"));
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByText("Udbetalt")).toBeTruthy());
    const call = api.calls.find((c) => c.url.endsWith("/pay"))!;
    expect(call.body).toEqual({
      payout_method: "bank",
      seller_bank_reg: "1234",
      seller_bank_account: "12345678",
      account_owner_confirmed: true,
    });
  });

  it("viser serverens 409-besked i betalingsdialogen", async () => {
    api.receipt = { ...confirmedPrivate(), has_signed_scan: true };
    api.payStatus = 409;
    await open();
    fireEvent.click(payButton());
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Reg.nr."), { target: { value: "1234" } });
    fireEvent.change(within(dialog).getByLabelText("Kontonummer"), { target: { value: "99999999" } });
    fireEvent.click(within(dialog).getByLabelText("Kontoen står i sælgers navn"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Bekræft udbetaling" }));
    expect(await within(dialog).findByText("Kontooplysningerne stemmer ikke med slutsedlen")).toBeTruthy();
  });

  it("viser modregnet beløb og at kun resten udbetales til bank", async () => {
    api.receipt = { ...confirmedPrivate(), has_signed_scan: true, offset_amount: 100000 };
    await open();
    expect(screen.getByText(/Modregnet i køb: 1\.000,00 kr\./)).toBeTruthy();
    expect(screen.getByText(/Kun resten, 2\.500,00 kr\., udbetales til bank/)).toBeTruthy();
  });

  it("lader resten udbetale til bank efter en delvis modregning i kassen", async () => {
    // Kassen sætter payout_method='modregning' ved modregningen; resten går stadig til bank.
    api.receipt = { ...confirmedPrivate(), has_signed_scan: true, offset_amount: 100000, payout_method: "modregning" };
    await open();
    expect(payButton().disabled).toBe(false);
    expect(screen.queryByText("Vælg udbetaling til bank")).toBeNull();
  });

  it("holder udbetaling lukket med begrundelse, når kontooplysningerne ikke er gemt på sedlen", async () => {
    api.receipt = { ...confirmedPrivate(), has_signed_scan: true, has_bank_account: false, seller_bank_reg: null, seller_bank_account: null };
    await open();
    expect(payButton().disabled).toBe(true);
    expect(screen.getByText(/Reg.nr. skal være 4 cifre/)).toBeTruthy();
  });

  it("viser Fortsæt kladde for en kladde", async () => {
    api.receipt = { ...confirmedPrivate(), status: "draft" };
    await open();
    expect(screen.getByRole("link", { name: "Fortsæt kladde" }).getAttribute("href")).toBe(`/admin/opkoeb/slutsedler/ny?kladde=${RID}`);
    expect(screen.queryByRole("button", { name: "Marker som udbetalt" })).toBeNull();
  });
});
