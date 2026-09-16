import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShopTabs } from "../shop-tabs";

const product = (title: string, extra = {}) => ({ id: title, slug: title, title, image: "/test.jpg", minPrice: 123450, compareAtPrice: null, deviceCount: 1, brand: "Apple", category: "iphone", inStock: true, href: `/refurbished/${title}`, specifications: {}, locations: [], ...extra });
const response = (items: ReturnType<typeof product>[]) => ({ ok: true, json: async () => items });
afterEach(() => vi.unstubAllGlobals());

describe("ShopTabs", () => {
  it("starts with iPhones and exposes loading until the real catalog arrives", async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(r => { resolve = r; })));
    render(<ShopTabs />);
    expect(screen.getByRole("button", { name: "iPhones" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Udvalg af iPhones" })).toHaveAttribute("aria-busy", "true");
    await act(async () => resolve(response([product("Telefon")])));
    expect(screen.getByRole("heading", { name: "Telefon" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Udvalg af iPhones" })).toHaveAttribute("aria-busy", "false");
    expect(fetch).toHaveBeenCalledWith("/api/homepage-products?tab=iphones&limit=8", expect.any(Object));
  });

  it("recovers from a rejected fetch through a visible retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response([])).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response([product("Computer", { category: "laptop" })])));
    render(<ShopTabs />);
    await screen.findByText("Der er ingen produkter at vise lige nu.");
    fireEvent.click(screen.getByRole("button", { name: "Bærbare" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Vi kunne ikke hente udvalget");
    expect(screen.getByRole("region", { name: "Udvalg af bærbare" })).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("link", { name: "Se alle bærbare" })).toHaveAttribute("href", "/baerbare");
    fireEvent.click(screen.getByRole("button", { name: "Prøv igen" }));
    expect(await screen.findByRole("heading", { name: "Computer" })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("never lets an older category response overwrite the current selection", async () => {
    const pending: Record<string, (value: unknown) => void> = {};
    vi.stubGlobal("fetch", vi.fn((url: string) => new Promise(r => { pending[url] = r; })));
    render(<ShopTabs />);
    fireEvent.click(screen.getByRole("button", { name: "Bærbare" }));
    fireEvent.click(screen.getByRole("button", { name: "iPads" }));
    await waitFor(() => expect(pending["/api/homepage-products?tab=ipads&limit=8"]).toBeDefined());
    await act(async () => pending["/api/homepage-products?tab=ipads&limit=8"](response([product("Min iPad")])));
    await act(async () => {
      pending["/api/homepage-products?tab=laptops&limit=8"](response([product("Gammel computer")]));
      pending["/api/homepage-products?tab=iphones&limit=8"](response([product("Gammel telefon")]));
    });
    expect(screen.getByRole("button", { name: "iPads" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Min iPad" })).toBeVisible();
    expect(screen.queryByText("Gammel computer")).not.toBeInTheDocument();
    expect(screen.queryByText("Gammel telefon")).not.toBeInTheDocument();
  });

  it("limits valid inventory to three cards and shows a neutral missing-image fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([product("Ugyldig", { slug: "" }), product("Uden billede", { image: null }), product("To"), product("Tre"), product("Fire")])));
    render(<ShopTabs />);
    await screen.findByText("Uden billede");
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.queryByText("Ugyldig")).not.toBeInTheDocument();
    expect(screen.queryByText("Fire")).not.toBeInTheDocument();
    const card = screen.getByRole("heading", { name: "Uden billede" }).closest("article")!;
    expect(within(card).getByText("Billede ikke tilgængeligt")).toBeVisible();
    expect(within(card).getByRole("link")).toHaveAttribute("href", "/refurbished/Uden billede");
    expect(within(card).getByText(/1.234,5/)).toBeVisible();
    expect(within(card).getByText("36 måneders garanti")).toBeVisible();
    expect(screen.getByRole("link", { name: "Tilbehør" })).toHaveAttribute("href", "/tilbehoer");
  });

  it("treats an HTTP failure as an error and keeps a route to the category", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    render(<ShopTabs />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Vi kunne ikke hente udvalget");
    expect(screen.getByRole("button", { name: "Prøv igen" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Se alle iPhones" })).toHaveAttribute("href", "/iphones");
    expect(screen.queryByText("Der er ingen produkter at vise lige nu.")).not.toBeInTheDocument();
  });

  it("does not label accessory results with the device guarantee", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([product("Cover", { category: "accessory", href: "/tilbehoer/covers/cover" })])));
    render(<ShopTabs />);
    await screen.findByRole("heading", { name: "Cover" });
    expect(screen.getByText("2 års reklamationsret")).toBeVisible();
    expect(screen.queryByText("36 måneders garanti")).not.toBeInTheDocument();
    expect(screen.queryByText("Refurbished")).not.toBeInTheDocument();
  });

  it("replaces a broken remote image with a neutral fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([product("Telefon")])));
    render(<ShopTabs />);
    fireEvent.error(await screen.findByRole("img", { name: "Telefon" }));
    expect(screen.getByText("Billede ikke tilgængeligt")).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Telefon" })).toBeVisible();
  });
});
