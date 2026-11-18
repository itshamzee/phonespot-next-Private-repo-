import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { ToastProvider } from "@/components/admin/ui/toast";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/components/admin/shell/store-scope-context", () => ({ useStoreScope: () => ({ scope: "vejle", isOwner: false }) }));
// Sagssidens tunge underdele er ikke det, der testes her.
vi.mock("@/components/admin/repairs/case-items-editor", () => ({ default: () => null }));
vi.mock("@/components/admin/repairs/sms-thread", () => ({ SmsThread: () => null }));
vi.mock("@/components/admin/repairs/print-modal", () => ({ PrintModal: () => null }));

import CaseListPage from "../case-list-page";
import CasePage from "../case-page";
import { MeldKlarDialog } from "../meld-klar-dialog";

const fetchMock = vi.fn();
const withToast = (ui: ReactElement) => render(ui, { wrapper: ToastProvider });
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const list = { rows: [], counts: { igang: 0, klar: 0, afventer: 0, web: 0, alle: 0 }, total: 0, page: 1, pageSize: 50 };

describe("Sagsstyring: listen", () => {
  it("viser et skelet af rækker ved første indlæsning", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    withToast(<CaseListPage />);
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByLabelText("Henter sager")).toHaveAttribute("data-skeleton");
    expect(panel.querySelectorAll(".m-skeleton").length).toBeGreaterThan(6);
  });

  it("dæmper de gamle rækker (aria-busy + .m-busy) mens en ny fane hentes", async () => {
    fetchMock.mockImplementationOnce(() => json(list));
    withToast(<CaseListPage />);
    expect(await screen.findByText("Ingen sager i denne fane.")).toBeInTheDocument();
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-busy", "false");
    expect(panel.className).toContain("m-busy");

    fetchMock.mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByRole("tab", { name: /Klar/ }));
    await waitFor(() => expect(panel).toHaveAttribute("aria-busy", "true"));
    // Det gamle indhold står (dæmpet), indtil de nye data er her.
    expect(within(panel).getByText("Ingen sager i denne fane.")).toBeInTheDocument();
  });
});

const detail = {
  ticket: {
    id: "t1",
    ticket_number: "PS-2026-0042",
    status: "i_gang",
    customer_name: "Anna",
    customer_phone: "20123456",
    customer_email: null,
    customer_id: null,
    device_type: "iPhone",
    device_model: "iPhone 13",
    issue_description: "Skærm",
    created_at: "2026-11-10T10:00:00Z",
    store_id: "vejle",
    is_urgent: false,
    on_hold_reason: null,
    paid: false,
    intake_checklist: [],
    internal_notes: [],
    intake_photos: [],
    checkout_photos: [],
  },
  quotes: [],
  logs: [],
  comments: [],
  sms: [],
  device: null,
  deposits: [],
  deposits_ok: true,
  lines: [],
  items: [],
  activity: [],
  totals: { subtotal_oere: 0, discount_oere: 0, total_oere: 0, deposits_oere: 0, rest_oere: 0, overpaid_oere: 0, paid: false },
  warranty: null,
  history: null,
  light: false,
};

describe("Sagsstyring: sagen", () => {
  it("viser et skelet i sidens mål, mens sagen hentes", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    withToast(<CasePage id="t1" />);
    const skeleton = screen.getByLabelText("Henter sag");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Henter sag...")).toBeNull();
  });

  it("en gemt note bekræftes med en toast, ikke en fast boks", async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === "POST" ? json({ success: true }) : json(detail),
    );
    withToast(<CasePage id="t1" />);
    fireEvent.change(await screen.findByLabelText("Tilføj note"), { target: { value: "Ringet til kunden" } });
    fireEvent.click(screen.getByRole("button", { name: "Tilføj" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Noten er gemt"));
    expect(screen.getByRole("status")).toHaveAttribute("data-open", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(""); // toastens fejlflade er tom; ingen fast boks
  });

  it("en fejl står fast og synlig som role=alert", async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === "POST" ? json({ error: "Noten er for lang" }, 400) : json(detail),
    );
    withToast(<CasePage id="t1" />);
    fireEvent.change(await screen.findByLabelText("Tilføj note"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Tilføj" }));
    const box = await screen.findByText(/Noten er for lang|Noten blev ikke gemt/);
    expect(box.closest("[role=alert]")).not.toBeNull();
    expect(box.closest(".m-toast")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });
});

describe("Sagsstyring: dialoger lukker som før step 2", () => {
  const target = { id: "t1", label: "PS-2026-0042", status: "faerdig", customer_name: "Anna", customer_phone: "", paid: false, rest_oere: 50_000 };

  it("Meld klar: klik på baggrunden lukker ikke (en skrevet begrundelse bevares); Esc lukker", () => {
    const onClose = vi.fn();
    withToast(<MeldKlarDialog target={target} onClose={onClose} onDone={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Afhentet uden betaling"));
    fireEvent.change(screen.getByPlaceholderText("Fx faktura til erhverv eller kulance"), { target: { value: "Kulance" } });
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Fx faktura til erhverv eller kulance")).toHaveValue("Kulance");
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Fotos: klik på baggrunden lukker ikke; Esc lukker", async () => {
    const withPhotos = { ...detail, ticket: { ...detail.ticket, intake_photos: ["https://example.test/a.jpg"] } };
    fetchMock.mockImplementation(() => json(withPhotos));
    withToast(<CasePage id="t1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Fotos (1)" }));
    const dialog = screen.getByRole("dialog", { name: "Fotos" });
    expect(dialog).toHaveAttribute("open");
    fireEvent.mouseDown(dialog);
    expect(dialog).toHaveAttribute("open");
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(dialog).not.toHaveAttribute("open");
  });
});
