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
  calls: [] as Array<{ url: string; method: string; body: unknown }>,
}));

function json(data: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) } as Response);
}

beforeEach(() => {
  api.open = null;
  api.nextNumber = 1;
  api.calls = [];
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
      if (url.startsWith("/api/admin/accessories/by-ean")) return json({ product: null });
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
  it("glas er ikke lagersalg og får ingen returlinje", () => {
    const html = labelHtml("5701234567899", "Beskyttelsesglas til iPhone 15", 49, null, { lagersalg: false });
    expect(html).not.toContain("returret");
    expect(html).toContain("49 kr.");
  });
});
