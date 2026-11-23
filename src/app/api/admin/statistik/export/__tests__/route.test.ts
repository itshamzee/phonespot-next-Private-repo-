// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StatViewer } from "@/lib/admin/statistik/access";
import { stripForViewer, type Money, type StatPayload } from "@/lib/admin/statistik/payload";
import type { StatRange } from "@/lib/admin/statistik/range";

type Staff = { id: string; role: string; name: string; email: string; location_id: string | null; location_slug: string | null; permissions: string[] };

const m = (revenue: number, profit: number): Required<Money> => ({
  revenue,
  revenueInclVat: Math.round(revenue * 1.25),
  profit,
  marginPct: revenue ? Math.round((profit / revenue) * 1000) / 10 : null,
});

/** Ejerens fulde payload; loadStatistik-mocken skærer den til for viewer, som den rigtige gør. */
function fullPayload(range: StatRange): StatPayload {
  return {
    viewer: { isOwner: true, canExport: true, scope: "alle" },
    range: { preset: range.preset, from: range.from, to: range.to, rangeLabel: range.rangeLabel, compareLabel: range.compareLabel, unit: range.unit },
    minDate: "2026-03-01",
    stores: [{ slug: "alle", label: "Alle" }],
    now: {
      updatedAt: "2026-11-18T13:32:00.000Z",
      today: { ...m(0, 0), count: 0, deltaPct: null, hours: [], streams: { webshop: 0, kasse: 0, reparation: 0 } },
      rows: [],
    },
    total: { ...m(2_748_500, 900_000), deltaPct: null, profitDeltaPct: null },
    series: [{ key: range.from, label: "1", webshop: m(1_000_000, 300_000), kasse: m(1_000_000, 300_000), reparation: m(748_500, 300_000), prevRevenue: null, prevProfit: null }],
    byStore: [],
    payments: [],
    categories: [{ category: "enheder", label: "Enheder", money: m(2_748_500, 900_000) }],
    missingCost: 0,
    staff: [{ name: "Mikkel", store: "Vejle", sales: 4, repairs: 2, money: m(1_748_500, 600_000) }],
    top: [],
    repairs: { paidCases: 0, money: m(0, 0), openNow: 0, byType: [], prepaidWithoutAmount: 0 },
    buyback: { paidOut: 0, offset: 0, receipts: 0, offersSent: 0, acceptedPct: null, byStore: [], dataFrom: null },
    webshop: { visits: null, addToCart: null, purchases: 0, abandoned: 0, avgOrder: 0 },
    stock: { units: 0, costValue: 0, accessoryCostValue: 0, avgDays: null, over60: 0, soldOutModels: 0, oneLeftModels: 0 },
    notes: { partialRefunds: 0 },
    unavailable: [],
  };
}

const m$ = vi.hoisted(() => ({
  staff: null as Staff | null,
  loadStatistik: vi.fn(),
  firstOrderDate: vi.fn(async () => "2026-03-01"),
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: async () => m$.staff }));
vi.mock("@/lib/admin/statistik/load", () => ({ loadStatistik: m$.loadStatistik, firstOrderDate: m$.firstOrderDate }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({}) }));

import { GET } from "../route";

const employee = (permissions: string[] = []): Staff => ({
  id: "s1",
  role: "employee",
  name: "Mads",
  email: "m@x.dk",
  location_id: "L1",
  location_slug: "vejle",
  permissions,
});
const owner: Staff = { id: "o1", role: "owner", name: "Ejer", email: "e@x.dk", location_id: null, location_slug: null, permissions: [] };

const call = (query = "") => GET(new Request(`http://localhost/api/admin/statistik/export${query}`));

beforeEach(() => {
  m$.staff = null;
  m$.loadStatistik.mockReset();
  m$.loadStatistik.mockImplementation(async (viewer: StatViewer, range: StatRange) => stripForViewer(fullPayload(range), viewer));
});

describe("GET /api/admin/statistik/export", () => {
  it("401 uden personale", async () => {
    expect((await call("?format=csv")).status).toBe(401);
    expect(m$.loadStatistik).not.toHaveBeenCalled();
  });

  it("403 uden se_statistik", async () => {
    m$.staff = employee(["eksportere"]);
    expect((await call("?format=csv")).status).toBe(403);
    expect(m$.loadStatistik).not.toHaveBeenCalled();
  });

  it("403 med se_statistik men uden eksportere", async () => {
    m$.staff = employee(["se_statistik"]);
    expect((await call("?format=csv")).status).toBe(403);
    expect(m$.loadStatistik).not.toHaveBeenCalled();
  });

  it("400 ved ukendt format", async () => {
    m$.staff = owner;
    expect((await call("?format=pdf")).status).toBe(400);
    expect((await call("")).status).toBe(400);
    expect(m$.loadStatistik).not.toHaveBeenCalled();
  });

  it("200 CSV for medarbejder med begge rettigheder: egen butik, ingen ejer-tal", async () => {
    m$.staff = employee(["se_statistik", "eksportere"]);
    const res = await call("?format=csv&butik=alle&fra=2026-10-20&til=2026-11-18");
    expect(res.status).toBe(200);
    expect(m$.loadStatistik).toHaveBeenCalledTimes(1);
    const [viewer, range] = m$.loadStatistik.mock.calls[0] as [StatViewer, StatRange];
    expect(viewer).toEqual({ isOwner: false, scope: "vejle", canExport: true });
    expect([range.from, range.to]).toEqual(["2026-10-20", "2026-11-18"]);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="phonespot-statistik-2026-10-20_2026-11-18-vejle.csv"');
    const body = await res.text();
    expect(body).toContain("Omsætning uden moms");
    expect(body).not.toContain("Fortjeneste");
    expect(body).not.toContain("Margin");
  });

  it("200 for ejeren med fortjeneste, og datoer klemmes som på siden", async () => {
    m$.staff = owner;
    const res = await call("?format=csv&butik=slagelse&fra=2020-01-01&til=2026-03-05");
    expect(res.status).toBe(200);
    const [viewer, range] = m$.loadStatistik.mock.calls[0] as [StatViewer, StatRange];
    expect(viewer).toEqual({ isOwner: true, scope: "slagelse", canExport: true });
    expect(range.from).toBe("2026-03-01");
    expect(await res.text()).toContain("Fortjeneste;Margin %");
  });

  it("200 Excel for ejeren", async () => {
    m$.staff = owner;
    const res = await call("?format=xlsx&periode=7d");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="phonespot-statistik-.+-alle\.xlsx"$/);
    const bytes = new Uint8Array(await res.arrayBuffer());
    // xlsx er en zip-fil.
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);
  });

  it("500 når indlæsningen fejler", async () => {
    m$.staff = owner;
    m$.loadStatistik.mockRejectedValueOnce(new Error("db"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call("?format=csv")).status).toBe(500);
    spy.mockRestore();
  });
});
