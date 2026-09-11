import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilteredGrid, type TemplateWithStock } from "../filtered-grid";

function template(
  id: string,
  overrides: Partial<TemplateWithStock> = {},
): TemplateWithStock {
  return {
    id,
    brand: "Apple",
    model: id,
    category: "iphone",
    storage_options: ["128 GB"],
    colors: [],
    default_attributes: {},
    display_name: id,
    slug: id.toLowerCase(),
    description: null,
    images: [],
    short_description: null,
    meta_title: null,
    meta_description: null,
    specifications: {},
    status: "published",
    base_price_a: 300_000,
    base_price_b: null,
    base_price_c: null,
    base_price_n: null,
    base_price_p: null,
    new_price: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    device_count: 1,
    min_price: 300_000,
    locations: [{ name: "Online", type: "online", count: 1 }],
    has_own_stock: true,
    ...overrides,
  };
}

describe("FilteredGrid", () => {
  it("uses one shared filter state for the mobile drawer and desktop panel", async () => {
    render(
      <FilteredGrid
        templates={[
          template("Billig", { min_price: 199_900 }),
          template("Dyr", { min_price: 200_100 }),
        ]}
        heading="Alle modeller"
      />,
    );

    expect(screen.getAllByRole("button", { name: /^Filtre/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /^Filtre/ }));
    const dialog = screen.getByRole("dialog", { name: "Produktfiltre" });
    fireEvent.change(within(dialog).getByLabelText("Maksimumpris"), {
      target: { value: "2000" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Vis 1 model" }));

    await waitFor(() => expect(screen.queryByText("Dyr")).not.toBeInTheDocument());
    expect(screen.getByText("Billig")).toBeInTheDocument();
    expect(screen.getAllByText("1 model").length).toBeGreaterThan(0);
  });

  it("sorts by the selected meaning and resets to the complete catalogue", async () => {
    render(
      <FilteredGrid
        templates={[
          template("Faa", { device_count: 1, min_price: 100_000 }),
          template("Flest", { device_count: 8, min_price: 300_000 }),
          template("Mellem", { device_count: 4, min_price: 200_000 }),
        ]}
      />,
    );

    const panel = screen.getByRole("complementary", { name: "Produktfiltre" });
    fireEvent.change(within(panel).getByLabelText("Sortering"), {
      target: { value: "popular" },
    });

    await waitFor(() => {
      const links = screen.getAllByRole("link", { name: /Se modellen/ });
      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        "/refurbished/flest",
        "/refurbished/mellem",
        "/refurbished/faa",
      ]);
    });
    expect(within(panel).getByRole("option", { name: "Flest på lager" })).toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText("Maksimumpris"), {
      target: { value: "1500" },
    });
    await waitFor(() => expect(screen.queryByText("Flest")).not.toBeInTheDocument());
    fireEvent.click(within(panel).getByRole("button", { name: "Ryd filtre" }));
    await waitFor(() => expect(screen.getByText("Flest")).toBeInTheDocument());
  });

  it("recomputes results and options when templates change while retaining valid choices", async () => {
    const { rerender } = render(
      <FilteredGrid
        templates={[
          template("Apple 128", { category: "laptop", storage_options: ["128 GB"] }),
          template("Dell 256", { brand: "Dell", category: "laptop", storage_options: ["256 GB"] }),
        ]}
      />,
    );
    const panel = screen.getByRole("complementary", { name: "Produktfiltre" });
    fireEvent.click(within(panel).getByRole("button", { name: "Mærke" }));
    fireEvent.click(within(panel).getByRole("checkbox", { name: /Apple/ }));
    await waitFor(() => expect(screen.queryByText("Dell 256")).not.toBeInTheDocument());

    rerender(
      <FilteredGrid
        templates={[
          template("Apple 512", { category: "laptop", storage_options: ["512 GB"] }),
          template("Lenovo 1TB", { brand: "Lenovo", category: "laptop", storage_options: ["1 TB"] }),
        ]}
      />,
    );

    await waitFor(() => expect(screen.getByText("Apple 512")).toBeInTheDocument());
    expect(screen.queryByText("Lenovo 1TB")).not.toBeInTheDocument();
    expect(within(panel).getByRole("checkbox", { name: /Apple/ })).toBeChecked();
    fireEvent.click(within(panel).getByRole("button", { name: "Lagerplads" }));
    expect(within(panel).getByRole("button", { name: "512GB" })).toBeInTheDocument();
  });

  it("validates the initial laptop brand and lets reset show every brand", async () => {
    render(
      <FilteredGrid
        templates={[
          template("MacBook", { category: "laptop" }),
          template("ThinkPad", { brand: "Lenovo", category: "laptop" }),
        ]}
        initialBrand="apple"
      />,
    );

    expect(screen.getByText("MacBook")).toBeInTheDocument();
    expect(screen.queryByText("ThinkPad")).not.toBeInTheDocument();
    const panel = screen.getByRole("complementary", { name: "Produktfiltre" });
    fireEvent.click(within(panel).getByRole("button", { name: "Ryd filtre" }));
    await waitFor(() => expect(screen.getByText("ThinkPad")).toBeInTheDocument());
  });

  it("updates the initial brand after navigation without reapplying it on an unchanged rerender", async () => {
    const templates = [
      template("MacBook", { category: "laptop" }),
      template("ThinkPad", { brand: "Lenovo", category: "laptop" }),
    ];
    const { rerender } = render(<FilteredGrid templates={templates} initialBrand="apple" />);

    const panel = screen.getByRole("complementary", { name: "Produktfiltre" });
    fireEvent.click(within(panel).getByRole("button", { name: "Ryd filtre" }));
    await waitFor(() => expect(screen.getByText("ThinkPad")).toBeInTheDocument());

    rerender(<FilteredGrid templates={templates} initialBrand="apple" />);
    expect(screen.getByText("ThinkPad")).toBeInTheDocument();

    rerender(<FilteredGrid templates={templates} />);
    await waitFor(() => expect(screen.getByText("ThinkPad")).toBeInTheDocument());

    rerender(<FilteredGrid templates={templates} initialBrand="apple" />);
    await waitFor(() => expect(screen.queryByText("ThinkPad")).not.toBeInTheDocument());
    expect(screen.getByText("MacBook")).toBeInTheDocument();
  });

  it("keeps a closed drawer absent and restores focus, scrolling and content after Escape", () => {
    render(<FilteredGrid templates={[template("iPhone")]} />);
    const trigger = screen.getByRole("button", { name: /^Filtre/ });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Produktfiltre" });
    expect(within(dialog).getByRole("button", { name: "Luk filtre" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByTestId("product-results")).toHaveAttribute("inert");

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
    expect(screen.getByTestId("product-results")).not.toHaveAttribute("inert");
  });

  it("makes the complete page background inert and keeps keyboard focus inside the drawer", () => {
    render(
      <>
        <header data-testid="site-header"><a href="#konto">Konto</a></header>
        <main>
          <FilteredGrid templates={[template("iPhone")]} />
          <button type="button">Guidens handling</button>
        </main>
        <footer data-testid="site-footer"><a href="#kontakt">Kontakt</a></footer>
      </>,
    );
    const guideAction = screen.getByRole("button", { name: "Guidens handling" });
    const accountLink = screen.getByRole("link", { name: "Konto" });

    fireEvent.click(screen.getByRole("button", { name: /^Filtre/ }));
    const dialog = screen.getByRole("dialog", { name: "Produktfiltre" });
    const close = within(dialog).getByRole("button", { name: "Luk filtre" });
    const apply = within(dialog).getByRole("button", { name: /Vis 1 model/ });

    expect(screen.getByTestId("site-header")).toHaveAttribute("inert");
    expect(screen.getByTestId("site-footer")).toHaveAttribute("inert");
    expect(guideAction).toHaveAttribute("inert");

    apply.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();

    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(apply).toHaveFocus();

    accountLink.focus();
    expect(close).toHaveFocus();
  });

  it("closes and cleans up the drawer when the viewport enters desktop", () => {
    let desktop = false;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const mediaQuery = {
      get matches() { return desktop; },
      media: "(min-width: 1024px)",
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList;
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));

    render(<><header data-testid="breakpoint-header" /><FilteredGrid templates={[template("iPhone")]} /></>);
    fireEvent.click(screen.getByRole("button", { name: /^Filtre/ }));
    expect(screen.getByRole("dialog", { name: "Produktfiltre" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByTestId("breakpoint-header")).toHaveAttribute("inert");

    desktop = true;
    act(() => listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent)));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(screen.getByTestId("product-results")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("breakpoint-header")).not.toHaveAttribute("inert");
    vi.unstubAllGlobals();
  });

  it("only treats a real store location as available for pickup", async () => {
    render(
      <FilteredGrid
        templates={[
          template("Butik", { locations: [{ name: "Vejle", type: "store", count: 1 }] }),
          template("Online", { locations: [{ name: "Weblager", type: "online", count: 2 }] }),
        ]}
      />,
    );
    const panel = screen.getByRole("complementary", { name: "Produktfiltre" });
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Kan afhentes i butik" }));
    await waitFor(() => expect(screen.queryByText("Online")).not.toBeInTheDocument());
    expect(screen.getByText("Butik")).toBeInTheDocument();
  });
});
