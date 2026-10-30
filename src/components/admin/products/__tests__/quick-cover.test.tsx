import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

vi.mock("@/lib/images/remove-background-client", () => ({ preloadBackgroundRemoval: () => Promise.resolve() }));
vi.mock("@/components/admin/products/quick-intake/photo-picker", () => ({
  PhotoPicker: ({ onChange }: { onChange: (url: string | null) => void }) => (
    <button type="button" onClick={() => onChange("https://cdn.example/foto.jpg")}>
      Testfoto
    </button>
  ),
}));

import { QuickCover } from "../quick-cover";
import { StoreScopeProvider, type AdminMe } from "@/components/admin/shell/store-scope-context";
import { labelHtml } from "../quick-intake/label";

const LOC = "00000000-0000-4000-8000-000000000030";
const box = (id: string, number: number, status: "open" | "closed" = "open") => ({
  id,
  locationId: LOC,
  number,
  status,
  openedAt: "2026-10-30T08:00:00Z",
  closedAt: status === "closed" ? "2026-10-30T09:00:00Z" : null,
});
const BOX3 = "00000000-0000-4000-8000-000000000003";
const BOX4 = "00000000-0000-4000-8000-000000000004";

const api = vi.hoisted(() => ({
  open: null as null | Record<string, unknown>,
  nextNumber: 1,
  product: null as null | Record<string, unknown>,
  stockPost: { status: 200, data: {} as unknown },
  create: { status: 200, data: {} as unknown },
  calls: [] as Array<{ url: string; method: string; body: unknown }>,
}));

function json(data: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) } as Response);
}

beforeEach(() => {
  api.open = null;
  api.nextNumber = 1;
  api.calls = [];
  api.product = null;
  api.stockPost = { status: 200, data: {} };
  api.create = { status: 200, data: { created: [{ url: "/tilbehoer/outlet/x", boxNumber: null }] } };
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      api.calls.push({ url, method, body });
      if (url.startsWith("/api/admin/lagersalg/boxes")) {
        if (method === "GET") return json({ open: api.open, nextNumber: api.nextNumber });
        if (body.action === "close") {
          const closed = { ...(api.open as object), status: "closed" };
          api.open = box(BOX4, api.nextNumber);
          api.nextNumber += 1;
          return json({ closed, opened: api.open });
        }
        api.open = box(BOX3, api.nextNumber);
        api.nextNumber += 1;
        return json({ opened: api.open });
      }
      if (url.startsWith("/api/admin/accessories/by-ean")) {
        if (method === "POST") return json(api.stockPost.data, api.stockPost.status);
        return json({ product: api.product });
      }
      if (url === "/api/admin/products" && method === "POST") return json(api.create.data, api.create.status);
      if (url.startsWith("/api/admin/accessories/candidates")) return json({ candidates: [] });
      return json({ error: "ukendt" }, 404);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("QuickCover: kasser", () => {
  it("viser den åbne kasse og lukker/åbner næste med bekræftelse", async () => {
    api.open = box(BOX3, 3);
    api.nextNumber = 4;
    render(<QuickCover />);

    expect(await screen.findByText("Kasse 03 (åben)")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Luk kasse" }));
    expect(screen.getByText("Luk kasse 03 og åbn 04?")).toBeTruthy();
    // Intet sker før bekræftelse.
    expect(api.calls.some((c) => c.method === "POST")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Luk kasse 03 og åbn 04" }));
    expect(await screen.findByText("Kasse 04 (åben)")).toBeTruthy();
    const post = api.calls.find((c) => c.method === "POST");
    expect(post?.body).toEqual({ store: "vejle", action: "close", boxId: BOX3 });
  });

  it("viser knappen Åbn kasse 01 når ingen er åben", async () => {
    render(<QuickCover />);
    const btn = await screen.findByRole("button", { name: "Åbn kasse 01" });
    fireEvent.click(btn);
    expect(await screen.findByText("Kasse 01 (åben)")).toBeTruthy();
    expect(api.calls.find((c) => c.method === "POST")?.body).toEqual({ store: "vejle", action: "open" });
  });
});

async function toNewStep() {
  fireEvent.change(screen.getByLabelText("Stregkode"), { target: { value: "5701234567899" } });
  fireEvent.click(screen.getByRole("button", { name: "Find" }));
  fireEvent.click(await screen.findByRole("button", { name: "Udfyld selv" }));
}

async function fillBag() {
  await toNewStep();
  fireEvent.click(screen.getByRole("button", { name: "Taske" }));
  fireEvent.click(screen.getByRole("button", { name: '14"' }));
  fireEvent.click(screen.getByRole("button", { name: "Testfoto" }));
}

describe("QuickCover: gem med advarsel", () => {
  it("lager gemt, men kassen lukket imens: done-trin med advarsel, ingen fejl", async () => {
    const msg = "Varen er lagt på lager, men kassen blev lukket imens. Læg den i den nye kasse.";
    api.product = {
      id: "p1",
      title: "Silikonecover til iPhone 15, sort",
      images: null,
      selling_price: 5900,
      status: "published",
      subcategory: "cover",
      attributes: { udsalg: "Ja" },
      stock: { vejle: 0, slagelse: 0 },
    };
    api.stockPost = { status: 409, data: { error: msg, code: "box_closed", quantity: 3, priceKr: 59, boxNumber: null } };
    render(<QuickCover />);
    fireEvent.change(screen.getByLabelText("Stregkode"), { target: { value: "5701234567899" } });
    fireEvent.click(screen.getByRole("button", { name: "Find" }));
    fireEvent.click(await screen.findByRole("button", { name: /på lager/ }));

    expect(await screen.findByText(/3 på lager i Vejle/)).toBeTruthy();
    expect(screen.getByText(msg)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("oprettet med kasse og advarsel viser Lagt i Kasse 01 og advarslen", async () => {
    api.create = {
      status: 200,
      data: { created: [{ url: "/tilbehoer/outlet/x", boxNumber: 1 }], warnings: ["Tjek kassen, før du lægger varen i den."] },
    };
    render(<QuickCover />);
    await fillBag();
    fireEvent.click(screen.getByRole("button", { name: /Gem vare/ }));

    expect(await screen.findByText(/Lagt i Kasse 01/)).toBeTruthy();
    expect(screen.getByText("Tjek kassen, før du lægger varen i den.")).toBeTruthy();
  });
});

describe("QuickCover: priser", () => {
  it("taske starter på 149 kr., og Anden pris sendes i øre", async () => {
    render(<QuickCover />);
    await fillBag();
    expect(screen.getByRole("button", { name: "149 kr." }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.change(screen.getByLabelText("Anden pris"), { target: { value: "189" } });
    expect(screen.getByRole("button", { name: "189 kr." }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /Gem vare/ }));

    await waitFor(() => expect(api.calls.some((c) => c.url === "/api/admin/products")).toBe(true));
    const body = api.calls.find((c) => c.url === "/api/admin/products")!.body as { items: Array<Record<string, unknown>> };
    expect(body.items[0].sellingPrice).toBe(18900);
    expect(body.items[0].subcategory).toBe("bag");
    expect(body.items[0].models).toEqual([]);
  });
});

describe("QuickCover: taske", () => {
  it("kræver laptopstørrelse for en taske", async () => {
    render(<QuickCover />);
    fireEvent.change(screen.getByLabelText("Stregkode"), { target: { value: "5701234567899" } });
    fireEvent.click(screen.getByRole("button", { name: "Find" }));
    fireEvent.click(await screen.findByRole("button", { name: "Udfyld selv" }));

    fireEvent.click(screen.getByRole("button", { name: "Taske" }));
    fireEvent.click(screen.getByRole("button", { name: "Sort" }));
    fireEvent.click(screen.getByRole("button", { name: "Testfoto" }));

    const save = () => screen.getByRole("button", { name: /Gem vare/ }) as HTMLButtonElement;
    expect(save().disabled).toBe(true);
    expect(screen.getByText(/Mangler: .*størrelse/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: '14"' }));
    await waitFor(() => expect(save().disabled).toBe(false));
    expect((screen.getByLabelText(/Titel/) as HTMLInputElement).value).toBe("Sleeve til bærbar 14\", sort");
  });
});

describe("labelHtml", () => {
  it("har returvilkår, kasse og pris", () => {
    const html = labelHtml("5701234567899", "Sleeve til bærbar 14\", sort", 99, 1);
    expect(html).toContain("ingen returret");
    expect(html).toContain("Kasse 01");
    expect(html).toContain("99 kr.");
  });
  it("uden kasse står kun returvilkåret", () => {
    const html = labelHtml("5701234567899", "Pungcover til iPhone 15", 79, null);
    expect(html).toContain("Lagersalg · ingen returret");
    expect(html).not.toContain("Kasse");
  });
  it("bevarer tommetegn i titlen og escaper html", () => {
    const html = labelHtml("5701234567899", 'Sleeve til bærbar 14", sort <b>', 99, 1);
    expect(html).toContain("14&quot;");
    expect(html).not.toContain("<b>");
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector(".title")?.textContent).toBe('Sleeve til bærbar 14", sort <b>');
  });

  it("glas er ikke lagersalg og får ingen returlinje", () => {
    const html = labelHtml("5701234567899", "Beskyttelsesglas til iPhone 15", 49, null, { lagersalg: false });
    expect(html).not.toContain("returret");
    expect(html).toContain("49 kr.");
  });
});

describe("kasseoversigt-link", () => {
  const me = (role: string): AdminMe => ({
    id: "st",
    name: null,
    email: null,
    role,
    isOwner: false,
    ownSlug: "vejle",
    scope: "vejle",
  });

  it("vises ikke for praktikanter, som ikke kan åbne siden", async () => {
    render(
      <StoreScopeProvider initialMe={me("intern")}>
        <QuickCover />
      </StoreScopeProvider>,
    );
    await screen.findByText("Ingen åben kasse");
    expect(screen.queryByText("Kasseoversigt")).toBeNull();
  });

  it("vises for butiksmedarbejdere", async () => {
    render(
      <StoreScopeProvider initialMe={me("staff")}>
        <QuickCover />
      </StoreScopeProvider>,
    );
    expect(await screen.findByText("Kasseoversigt")).toBeTruthy();
  });
});
