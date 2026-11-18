import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChartCanvas as RealChartCanvas } from "../chart-canvas";

type ChartCanvasProps = ComponentProps<typeof RealChartCanvas>;

const { replace, canvas } = vi.hoisted(() => ({
  replace: vi.fn(),
  // Grafen (Recharts) erstattes helt: testen ser kun på de props, ChartPanel giver den.
  canvas: vi.fn((props: ChartCanvasProps): null => {
    void props;
    return null;
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/statistik",
  useSearchParams: () => new URLSearchParams("periode=30d"),
}));

vi.mock("../chart-canvas", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../chart-canvas")>();
  return { ...actual, ChartCanvas: (props: ChartCanvasProps) => canvas(props) };
});

// next/dynamic indlæser grafen asynkront; i testen bruges den (mockede) graf med det samme.
vi.mock("next/dynamic", async () => {
  const mod = await import("../chart-canvas");
  return { default: () => mod.ChartCanvas };
});

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ChartTooltip, type ChartRow } from "../chart-canvas";
import { ChartPanel } from "../chart-panel";
import { StatNavProvider } from "../controls";
import { stripForViewer, type Money, type StatPayload } from "@/lib/admin/statistik/payload";

afterEach(() => {
  cleanup();
  replace.mockClear();
  canvas.mockClear();
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
const tableRows = () => within(hiddenTable()).getAllByRole("row").slice(1);
const columns = () => within(hiddenTable()).getAllByRole("columnheader").map((h) => h.textContent);
/** Props fra seneste tegning af grafen. */
const lastCanvas = () => canvas.mock.calls.at(-1)![0];
const legendButton = (name: string) => within(screen.getByRole("group", { name: "Typer" })).getByRole("button", { name });

describe("ChartPanel", () => {
  it("den skjulte tabel har én række pr. interval med omsætningen i kroner", () => {
    render(<ChartPanel payload={ownerPayload()} metric="omsaetning" />);
    const rows = tableRows();
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole("rowheader")).toHaveTextContent("16. nov.");
    expect(within(rows[0]).getByText("17.500 kr.")).toBeInTheDocument();
    expect(within(rows[1]).getByText("27.485 kr.")).toBeInTheDocument();
    expect(within(rows[1]).getByText("20.000 kr.")).toBeInTheDocument();
    expect(lastCanvas().rows.map((r) => r.total)).toEqual([1_750_000, 2_748_500, 0]);
  });

  it("Reparation slås fra: totalen falder, sammenligning og forrige periode forsvinder", async () => {
    render(<ChartPanel payload={ownerPayload()} metric="omsaetning" />);
    const total = screen.getByTestId("chart-total");
    expect(total).toHaveTextContent("44.985 kr.");
    expect(screen.getByText("+8,2 %")).toBeInTheDocument();
    expect(screen.getByText("mod de 30 dage før")).toBeInTheDocument();
    expect(lastCanvas().hasPrev).toBe(true);
    expect(columns()).toContain("Forrige periode");

    const rep = legendButton("Reparation");
    expect(rep).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(rep);
    expect(rep).toHaveAttribute("aria-pressed", "false");
    // 44.985 kr. - (2.500 + 7.485) kr.; tallet tæller over et billede (rAF).
    await waitFor(() => expect(total).toHaveTextContent("35.000 kr."));
    // Sammenligningen gælder alle typer og vises ikke for et udsnit.
    expect(screen.queryByText("+8,2 %")).toBeNull();
    expect(screen.queryByText("mod de 30 dage før")).toBeNull();
    expect(columns()).not.toContain("Reparation");
    expect(columns()).not.toContain("Forrige periode");
    const props = lastCanvas();
    expect(props.hasPrev).toBe(false);
    expect(props.rows.every((r) => r.prev === null)).toBe(true);
    expect(props.series.map((s) => s.key)).toEqual(["webshop", "kasse"]);
    expect(props.rows[1]).toMatchObject({ reparation: 0, total: 2_000_000, capTop: "kasse" });

    fireEvent.click(rep);
    expect(rep).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(total).toHaveTextContent("44.985 kr."));
    expect(lastCanvas().hasPrev).toBe(true);
  });

  it("den sidste viste type kan ikke slås fra", () => {
    render(<ChartPanel payload={ownerPayload()} metric="omsaetning" />);
    fireEvent.click(legendButton("Webshop"));
    fireEvent.click(legendButton("Kassesalg"));
    const rep = legendButton("Reparation");
    fireEvent.click(rep);
    expect(rep).toHaveAttribute("aria-pressed", "true");
    expect(lastCanvas().series.map((s) => s.key)).toEqual(["reparation"]);
  });

  it("margin i tabellen gælder de viste typer", () => {
    render(<ChartPanel payload={ownerPayload()} metric="omsaetning" />);
    // 16. nov.: 6.000 kr. fortjeneste af 17.500 kr.
    expect(within(tableRows()[0]).getByText("34,3 %")).toBeInTheDocument();
    expect(lastCanvas().rows[0].marginPct).toBeCloseTo(34.29, 2);
    fireEvent.click(legendButton("Reparation"));
    // Uden reparation: 4.500 kr. af 15.000 kr.
    expect(within(tableRows()[0]).getByText("30,0 %")).toBeInTheDocument();
  });

  it("en medarbejder får ingen Fortjeneste-vælger og ingen fortjeneste i grafen", () => {
    const { container } = render(<ChartPanel payload={staffPayload()} metric="fortjeneste" />);
    expect(screen.queryByRole("group", { name: "Vis" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Fortjeneste" })).toBeNull();
    expect(container.textContent).not.toMatch(/fortjeneste|margin/i);
    expect(lastCanvas().rows.every((r) => r.marginPct === undefined)).toBe(true);
    expect(lastCanvas().rows[0].total).toBe(1_750_000);
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
    expect(lastCanvas().rows[1].prev).toBe(700_000);
    fireEvent.click(within(screen.getByRole("group", { name: "Vis" })).getByRole("button", { name: "Omsætning" }));
    expect(replace).toHaveBeenCalledWith("/admin/statistik?periode=30d", { scroll: false });
  });

  it("et interval med negativ omsætning går til grafen og tabellen uden fejl", () => {
    const series = defaultSeries();
    series[2] = { ...series[2], kasse: m(-300_000, -100_000), prevRevenue: null, prevProfit: null };
    const { container } = render(<ChartPanel payload={ownerPayload(series)} metric="omsaetning" />);
    const rows = lastCanvas().rows;
    expect(rows[2]).toMatchObject({ kasse: -300_000, total: -300_000, prev: null, capTop: null, capBottom: "kasse" });
    expect(rows[1]).toMatchObject({ capTop: "reparation", capBottom: null });
    expect(within(tableRows()[2]).getAllByText("-3.000 kr.")).toHaveLength(2);
    expect(within(tableRows()[2]).getByText("–")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN/);
  });

  it("en periode uden salg viser Ingen salg i perioden", () => {
    const series = defaultSeries().map((s) => ({ ...s, webshop: zero, kasse: zero, reparation: zero }));
    render(<ChartPanel payload={staffPayload(ownerPayload(series))} metric="omsaetning" />);
    expect(within(region()).getByText("Ingen salg i perioden")).toBeInTheDocument();
    expect(within(region()).queryByRole("table")).toBeNull();
    expect(canvas).not.toHaveBeenCalled();
  });

  it("delvise refunderinger står stadig under totalen", () => {
    const p = ownerPayload();
    p.notes = { partialRefunds: 150_000 };
    render(<ChartPanel payload={p} metric="omsaetning" />);
    expect(screen.getByText("Delvist refunderet i perioden: 1.500 kr.")).toBeInTheDocument();
  });
});

describe("ChartTooltip", () => {
  const series = [
    { key: "webshop" as const, label: "Webshop", color: "#1A3D2E" },
    { key: "kasse" as const, label: "Kassesalg", color: "#5A8C6F" },
  ];
  const row: ChartRow = {
    key: "2026-11-18T08:00:00.000Z",
    label: "9",
    webshop: 100_000,
    kasse: 250_000,
    reparation: 0,
    total: 350_000,
    prev: 300_000,
    capTop: "kasse",
    capBottom: null,
    marginPct: 31.4,
  };

  it("viser time, total, viste typer, margin og forrige periode", () => {
    render(<ChartTooltip active payload={[{ payload: row }]} series={series} hourly />);
    const tip = screen.getByTestId("chart-tooltip");
    expect(tip).toHaveTextContent("Kl. 9.00");
    expect(tip).toHaveTextContent("3.500 kr.");
    expect(tip).toHaveTextContent("Webshop1.000 kr.");
    expect(tip).toHaveTextContent("Kassesalg2.500 kr.");
    expect(tip).not.toHaveTextContent("Reparation");
    expect(tip).toHaveTextContent("Margin31,4 %");
    expect(tip).toHaveTextContent("Forrige periode3.000 kr.");
  });

  it("uden margin og forrige periode for en medarbejder eller et udsnit", () => {
    const plain: ChartRow = { ...row, label: "17. nov.", prev: null, marginPct: undefined };
    render(<ChartTooltip active payload={[{ payload: plain }]} series={series} hourly={false} />);
    const tip = screen.getByTestId("chart-tooltip");
    expect(tip).toHaveTextContent("17. nov.");
    expect(tip).not.toHaveTextContent(/Margin|Forrige periode|Kl\./);
  });

  it("intet uden aktivt interval", () => {
    const { container } = render(<ChartTooltip active={false} payload={[{ payload: row }]} series={series} hourly={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
