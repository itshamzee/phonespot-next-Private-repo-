import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/statistik",
  useSearchParams: () => new URLSearchParams(),
}));

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StatistikView } from "../statistik-view";
import { stripForViewer, type Money, type StatPayload } from "@/lib/admin/statistik/payload";

afterEach(cleanup);

const m = (revenue: number, profit: number): Required<Money> => ({
  revenue,
  revenueInclVat: Math.round(revenue * 1.25),
  profit,
  marginPct: revenue ? Math.round((profit / revenue) * 1000) / 10 : null,
});

function ownerPayload(): StatPayload {
  return {
    viewer: { isOwner: true, canExport: true, scope: "alle" },
    range: { preset: "30d", from: "2026-10-20", to: "2026-11-18", rangeLabel: "20. okt. – 18. nov. 2026", compareLabel: "mod de 30 dage før", unit: "dag" },
    minDate: "2026-03-01",
    stores: [
      { slug: "alle", label: "Alle" },
      { slug: "vejle", label: "Vejle" },
      { slug: "webshop", label: "Webshop" },
    ],
    now: {
      updatedAt: "2026-11-18T13:32:00.000Z",
      today: {
        ...m(1_200_000, 400_000),
        count: 7,
        deltaPct: 12.5,
        hours: Array.from({ length: 11 }, (_, i) => ({ label: String(9 + i), revenue: i < 5 ? 200_000 : 0, future: i > 5 })),
        streams: { webshop: 300_000, kasse: 600_000, reparation: 300_000 },
      },
      rows: [
        { key: "igaar", label: "I går", money: m(2_000_000, 600_000), deltaPct: -4, compareLabel: "mod samme ugedag ugen før" },
        { key: "uge", label: "Denne uge", money: m(5_000_000, 1_500_000), deltaPct: 3, compareLabel: "mod samme tid sidste uge" },
        { key: "maaned", label: "Denne måned", money: m(20_000_000, 6_000_000), deltaPct: null, compareLabel: "mod samme tid sidste måned" },
      ],
    },
    total: { ...m(2_748_500, 900_000), deltaPct: 8.2, profitDeltaPct: 4.1 },
    series: [
      { key: "2026-11-17", label: "17. nov.", webshop: m(1_000_000, 300_000), kasse: m(1_000_000, 300_000), reparation: m(748_500, 300_000), prevRevenue: 2_000_000, prevProfit: 700_000 },
      { key: "2026-11-18", label: "18. nov.", webshop: m(0, 0), kasse: m(0, 0), reparation: m(0, 0), prevRevenue: 0, prevProfit: 0 },
    ],
    byStore: [
      { slug: "vejle", label: "Vejle", money: m(1_748_500, 600_000) },
      { slug: "webshop", label: "Webshop", money: m(1_000_000, 300_000) },
    ],
    payments: [
      { type: "kort_terminal", label: "Kort", amount: 2_000_000 },
      { type: "mobilepay", label: "MobilePay", amount: 1_435_625 },
    ],
    categories: [
      { category: "enheder", label: "Enheder", money: m(1_500_000, 400_000) },
      { category: "tilbehoer", label: "Tilbehør", money: m(500_000, 200_000) },
      { category: "reparation", label: "Reparation", money: m(748_500, 300_000) },
      { category: "oevrigt", label: "Øvrigt", money: m(0, 0) },
    ],
    missingCost: 2,
    staff: [{ name: "Mikkel", store: "Vejle", sales: 4, repairs: 2, money: m(1_748_500, 600_000) }],
    top: [{ name: "iPhone 13, 128 GB", category: "enheder", units: 3, money: m(1_200_000, 300_000) }],
    repairs: { paidCases: 5, money: m(748_500, 300_000), openNow: 23, byType: [{ label: "Skærmskift", sharePct: 60 }], prepaidWithoutAmount: 0 },
    buyback: { paidOut: 400_000, offset: 50_000, receipts: 3, offersSent: 20, acceptedPct: 15, byStore: [{ label: "Vejle", amount: 400_000 }], dataFrom: null },
    webshop: { visits: 1000, addToCart: 120, purchases: 8, abandoned: 4, avgOrder: 125_000 },
    stock: { units: 214, costValue: 48_620_000, accessoryCostValue: 2_000_000, avgDays: 31, over60: 19, soldOutModels: 7, oneLeftModels: 12 },
    notes: { partialRefunds: 0 },
    unavailable: [],
  };
}

/** Medarbejderens payload: den rigtige stripForViewer på ejerens. */
function staffPayload(): StatPayload {
  return stripForViewer(ownerPayload(), { isOwner: false, scope: "vejle", canExport: false });
}

function emptyPayload(): StatPayload {
  const p = staffPayload();
  const zero = { revenue: 0, revenueInclVat: 0 };
  return {
    ...p,
    now: {
      ...p.now,
      today: { ...zero, count: 0, deltaPct: null, hours: p.now.today.hours.map((h) => ({ ...h, revenue: 0 })), streams: { webshop: 0, kasse: 0, reparation: 0 } },
      rows: p.now.rows.map((r) => ({ ...r, money: zero, deltaPct: null })),
    },
    total: { ...zero, deltaPct: null },
    series: p.series.map((s) => ({ ...s, webshop: zero, kasse: zero, reparation: zero, prevRevenue: 0 })),
    byStore: [],
    payments: [],
    top: [],
    repairs: { paidCases: 0, money: zero, openNow: 0, byType: [], prepaidWithoutAmount: 0 },
    buyback: { paidOut: 0, offset: 0, receipts: 0, offersSent: 0, acceptedPct: null, byStore: [], dataFrom: null },
    webshop: { visits: null, addToCart: null, purchases: 0, abandoned: 0, avgOrder: 0 },
    stock: { units: 0, avgDays: null, over60: 0, soldOutModels: 0, oneLeftModels: 0 },
  };
}

const TODAY = "2026-11-18";

describe("StatistikView", () => {
  it("ejeren ser Fortjeneste og margin og Medarbejdere", () => {
    render(<StatistikView payload={ownerPayload()} metric="omsaetning" today={TODAY} />);
    expect(screen.getByRole("heading", { name: /Fortjeneste og margin/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Medarbejdere/ })).toBeInTheDocument();
    expect(screen.getByText("Mikkel")).toBeInTheDocument();
    expect(screen.getByText("Øvrigt")).toBeInTheDocument();
    expect(screen.getByText("Tilbehør, lagerværdi")).toBeInTheDocument();
  });

  it("en medarbejder ser hverken fortjeneste, margin eller medarbejdere", () => {
    const { container } = render(<StatistikView payload={staffPayload()} metric="omsaetning" today={TODAY} />);
    expect(screen.queryByRole("heading", { name: /Fortjeneste og margin/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: /Medarbejdere/ })).toBeNull();
    expect(container.textContent).not.toMatch(/fortjeneste/i);
    expect(container.textContent).not.toMatch(/margin/i);
    expect(container.textContent).not.toMatch(/lagerværdi/i);
  });

  it("butiksvælgeren skjules, når der kun er én butik", () => {
    render(<StatistikView payload={staffPayload()} metric="omsaetning" today={TODAY} />);
    expect(screen.queryByRole("group", { name: "Butik" })).toBeNull();
    expect(screen.getByRole("group", { name: "Periode" })).toBeInTheDocument();
  });

  it("ejeren har butiksvælger med den valgte butik trykket ned", () => {
    render(<StatistikView payload={ownerPayload()} metric="omsaetning" today={TODAY} />);
    const group = screen.getByRole("group", { name: "Butik" });
    expect(within(group).getByRole("button", { name: "Alle" })).toHaveAttribute("aria-pressed", "true");
    expect(within(group).getByRole("button", { name: "Vejle" })).toHaveAttribute("aria-pressed", "false");
    const period = screen.getByRole("group", { name: "Periode" });
    expect(within(period).getByRole("button", { name: "30 dage" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opkøb før slutsedlerne viser datoen, de findes fra", () => {
    const p = ownerPayload();
    p.buyback = { ...p.buyback, dataFrom: "2026-11-09" };
    render(<StatistikView payload={p} metric="omsaetning" today={TODAY} />);
    expect(screen.getByText("Slutsedler findes fra 9. nov. 2026")).toBeInTheDocument();
    expect(screen.getByText("Modregnet")).toBeInTheDocument();
  });

  it("forudbetalte sager uden beløb og delvise refunderinger vises", () => {
    const p = ownerPayload();
    p.repairs = { ...p.repairs, prepaidWithoutAmount: 2 };
    p.notes = { partialRefunds: 150_000 };
    render(<StatistikView payload={p} metric="omsaetning" today={TODAY} />);
    expect(screen.getByText("2 forudbetalte sager uden beløb")).toBeInTheDocument();
    expect(screen.getByText("Delvist refunderet i perioden: 1.500 kr.")).toBeInTheDocument();
  });

  it("en tom periode viser Ingen salg i perioden i grafen og aldrig NaN", () => {
    const { container } = render(<StatistikView payload={emptyPayload()} metric="omsaetning" today={TODAY} />);
    const chart = screen.getByRole("region", { name: /over tid/ });
    expect(within(chart).getByText("Ingen salg i perioden")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN/);
  });

  it("grafen viser en tabel over perioden, når der er salg", () => {
    render(<StatistikView payload={ownerPayload()} metric="omsaetning" today={TODAY} />);
    const chart = screen.getByRole("region", { name: /Omsætning over tid/ });
    const rows = within(chart).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText("27.485 kr.")).toBeInTheDocument();
  });

  it("et afsnit, der ikke kunne hentes, viser en linje i stedet for nuller", () => {
    const p = ownerPayload();
    p.unavailable = ["devices"];
    render(<StatistikView payload={p} metric="omsaetning" today={TODAY} />);
    const stock = screen.getByRole("region", { name: "Lager" });
    expect(within(stock).getByText("Kunne ikke hentes lige nu")).toBeInTheDocument();
    expect(within(stock).queryByText("Enheder på lager")).toBeNull();
    // Andre paneler viser stadig deres tal.
    const repairs = screen.getByRole("region", { name: "Reparationer" });
    expect(within(repairs).queryByText("Kunne ikke hentes lige nu")).toBeNull();
    expect(within(repairs).getByText("Åbne sager nu")).toBeInTheDocument();
  });

  it("datovælgeren flytter fokus ind og tilbage og begrænser til-datoen", () => {
    render(<StatistikView payload={ownerPayload()} metric="omsaetning" today={TODAY} />);
    const toggle = screen.getByRole("button", { name: "Vælg datoer" });
    fireEvent.click(toggle);
    const fra = screen.getByLabelText("Fra");
    expect(fra).toHaveFocus();
    expect(screen.getByLabelText("Til")).toHaveAttribute("min", "2026-10-20");
    fireEvent.change(fra, { target: { value: "2026-11-01" } });
    expect(screen.getByLabelText("Til")).toHaveAttribute("min", "2026-11-01");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Vælg datoer" })).toBeNull();
    expect(toggle).toHaveFocus();

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Anvend" }));
    expect(screen.queryByRole("dialog", { name: "Vælg datoer" })).toBeNull();
    expect(toggle).toHaveFocus();
  });
});
