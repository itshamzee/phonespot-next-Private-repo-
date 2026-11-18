import { cloneElement, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/statistik",
  useSearchParams: () => new URLSearchParams("periode=30d"),
}));

// next/dynamic indlæser grafen asynkront; i testen bruges den rigtige graf med det samme.
vi.mock("next/dynamic", async () => {
  const mod = await import("../chart-canvas");
  return { default: () => mod.ChartCanvas };
});

// ResponsiveContainer måler 0×0 i jsdom; giv grafen en fast størrelse.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) =>
      cloneElement(children, { width: 800, height: 300 }),
  };
});

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ChartPanel } from "../chart-panel";
import { StatNavProvider } from "../controls";
import { stripForViewer, type Money, type StatPayload } from "@/lib/admin/statistik/payload";

afterEach(() => {
  cleanup();
  replace.mockClear();
});

const m = (revenue: number, profit: number): Required<Money> => ({
  revenue,
  revenueInclVat: Math.round(revenue * 1.25),
  profit,
  marginPct: revenue ? Math.round((profit / revenue) * 1000) / 10 : null,
});

const zero = m(0, 0);

/** Kun de felter, grafen læser; resten er tomt. */
function ownerPayload(series: StatPayload["series"] = defaultSeries()): StatPayload {
  const sumOf = (pick: (s: StatPayload["series"][number]) => number) => series.reduce((a, s) => a + pick(s), 0);
  const revenue = sumOf((s) => s.webshop.revenue + s.kasse.revenue + s.reparation.revenue);
  const profit = sumOf((s) => (s.webshop.profit ?? 0) + (s.kasse.profit ?? 0) + (s.reparation.profit ?? 0));
  return {
    viewer: { isOwner: true, canExport: true, scope: "alle" },
    range: { preset: "30d", from: "2026-10-20", to: "2026-11-18", rangeLabel: "20. okt. – 18. nov. 2026", compareLabel: "mod de 30 dage før", unit: "dag" },
    minDate: "2026-03-01",
    stores: [{ slug: "alle", label: "Alle" }],
    now: {
      updatedAt: "2026-11-18T13:32:00.000Z",
      today: { ...zero, count: 0, deltaPct: null, hours: [], streams: { webshop: 0, kasse: 0, reparation: 0 } },
      rows: [],
    },
    total: { ...m(revenue, profit), deltaPct: 8.2, profitDeltaPct: 4.1 },
    series,
    byStore: [],
    payments: [],
    categories: [],
    missingCost: 0,
    staff: [],
    top: [],
    repairs: { paidCases: 0, money: zero, openNow: 0, byType: [], prepaidWithoutAmount: 0 },
    buyback: { paidOut: 0, offset: 0, receipts: 0, offersSent: 0, acceptedPct: null, byStore: [], dataFrom: null },
    webshop: { visits: null, addToCart: null, purchases: 0, abandoned: 0, avgOrder: 0 },
    stock: { units: 0, avgDays: null, over60: 0, soldOutModels: 0, oneLeftModels: 0 },
    notes: { partialRefunds: 0 },
    unavailable: [],
  };
}

function defaultSeries(): StatPayload["series"] {
  return [
    { key: "2026-11-16", label: "16. nov.", webshop: m(1_000_000, 300_000), kasse: m(500_000, 150_000), reparation: m(250_000, 150_000), prevRevenue: 1_500_000, prevProfit: 500_000 },
    { key: "2026-11-17", label: "17. nov.", webshop: m(1_000_000, 300_000), kasse: m(1_000_000, 300_000), reparation: m(748_500, 300_000), prevRevenue: 2_000_000, prevProfit: 700_000 },
    { key: "2026-11-18", label: "18. nov.", webshop: zero, kasse: zero, reparation: zero, prevRevenue: 0, prevProfit: 0 },
  ];
}

const staffPayload = (p: StatPayload = ownerPayload()) => stripForViewer(p, { isOwner: false, scope: "vejle", canExport: false });

const region = () => screen.getByRole("region", { name: /over tid/ });
const hiddenTable = () => within(region()).getByRole("table");

describe("ChartPanel", () => {
  it("den skjulte tabel har én række pr. interval med omsætningen i kroner", () => {
    render(<ChartPanel payload={ownerPayload()} metric="omsaetning" />);
    const rows = within(hiddenTable()).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole("rowheader")).toHaveTextContent("16. nov.");
    expect(within(rows[0]).getByText("17.500 kr.")).toBeInTheDocument();
    expect(within(rows[1]).getByText("27.485 kr.")).toBeInTheDocument();
    expect(within(rows[1]).getByText("20.000 kr.")).toBeInTheDocument();
  });

  it("Reparation slås fra i forklaringen og totalen falder med reparationssummen", async () => {
    render(<ChartPanel payload={ownerPayload()} metric="omsaetning" />);
    const total = screen.getByTestId("chart-total");
    expect(total).toHaveTextContent("44.985 kr.");
    expect(screen.getByText("+8,2 %")).toBeInTheDocument();

    const legend = screen.getByRole("group", { name: "Typer" });
    const rep = within(legend).getByRole("button", { name: "Reparation" });
    expect(rep).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(rep);
    expect(rep).toHaveAttribute("aria-pressed", "false");
    // 44.985 kr. - (2.500 + 7.485) kr.; tallet tæller over et billede (rAF).
    await waitFor(() => expect(total).toHaveTextContent("35.000 kr."));
    // Procentændringen gælder alle typer og vises ikke for et udsnit.
    expect(screen.queryByText("+8,2 %")).toBeNull();
    // Tabellen følger de viste typer.
    const header = within(hiddenTable()).getAllByRole("columnheader").map((h) => h.textContent);
    expect(header).not.toContain("Reparation");

    fireEvent.click(rep);
    expect(rep).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(total).toHaveTextContent("44.985 kr."));
  });

  it("en medarbejder får ingen Fortjeneste-vælger og ingen fortjeneste i grafen", () => {
    const { container } = render(<ChartPanel payload={staffPayload()} metric="omsaetning" />);
    expect(screen.queryByRole("group", { name: "Vis" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Fortjeneste" })).toBeNull();
    expect(container.textContent).not.toMatch(/fortjeneste|margin/i);
  });

  it("ejeren skifter til Fortjeneste via URL'en", () => {
    render(
      <StatNavProvider>
        <ChartPanel payload={ownerPayload()} metric="omsaetning" />
      </StatNavProvider>,
    );
    const group = screen.getByRole("group", { name: "Vis" });
    expect(within(group).getByRole("button", { name: "Omsætning" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(group).getByRole("button", { name: "Fortjeneste" }));
    expect(replace).toHaveBeenCalledWith("/admin/statistik?periode=30d&vis=fortjeneste", { scroll: false });
  });

  it("ejeren ser fortjenesten, når vis=fortjeneste", () => {
    render(
      <StatNavProvider>
        <ChartPanel payload={ownerPayload()} metric="fortjeneste" />
      </StatNavProvider>,
    );
    expect(screen.getByRole("heading", { name: "Fortjeneste over tid" })).toBeInTheDocument();
    expect(screen.getByTestId("chart-total")).toHaveTextContent("15.000 kr.");
    expect(screen.getByText("+4,1 %")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("group", { name: "Vis" })).getByRole("button", { name: "Omsætning" }));
    expect(replace).toHaveBeenCalledWith("/admin/statistik?periode=30d", { scroll: false });
  });

  it("et interval med negativ omsætning tegnes uden fejl", () => {
    const series = defaultSeries();
    series[2] = { ...series[2], kasse: m(-300_000, -100_000), prevRevenue: null, prevProfit: null };
    const { container } = render(<ChartPanel payload={ownerPayload(series)} metric="omsaetning" />);
    expect(container.querySelector("svg")).not.toBeNull();
    const rows = within(hiddenTable()).getAllByRole("row").slice(1);
    expect(within(rows[2]).getAllByText("-3.000 kr.").length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/NaN/);
  });

  it("en periode uden salg viser Ingen salg i perioden", () => {
    const series = defaultSeries().map((s) => ({ ...s, webshop: zero, kasse: zero, reparation: zero }));
    render(<ChartPanel payload={staffPayload(ownerPayload(series))} metric="omsaetning" />);
    expect(within(region()).getByText("Ingen salg i perioden")).toBeInTheDocument();
    expect(within(region()).queryByRole("table")).toBeNull();
  });

  it("delvise refunderinger står stadig under totalen", () => {
    const p = ownerPayload();
    p.notes = { partialRefunds: 150_000 };
    render(<ChartPanel payload={p} metric="omsaetning" />);
    expect(screen.getByText("Delvist refunderet i perioden: 1.500 kr.")).toBeInTheDocument();
  });

  it("tastaturfokus på grafen viser tallene for første interval, piletast flytter", async () => {
    render(<ChartPanel payload={ownerPayload()} metric="omsaetning" />);
    const chart = within(region()).getByRole("application", { name: /Omsætning over tid, fordelt på webshop/ });
    await act(async () => {
      chart.focus();
    });
    const tip = await screen.findByTestId("chart-tooltip");
    expect(tip).toHaveTextContent("16. nov.");
    expect(tip).toHaveTextContent("Forrige periode");
    expect(tip).toHaveTextContent("Margin");
    await act(async () => {
      fireEvent.keyDown(chart, { key: "ArrowRight" });
    });
    expect(await screen.findByTestId("chart-tooltip")).toHaveTextContent("17. nov.");
  });
});
