import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { StoreOverviewView } from "../store-overview";
import { AllStoresOverviewView } from "../all-stores-overview";
import { OVERBLIK_PERIODS, periodRange } from "@/lib/admin/overview/period";
import { computeKpis } from "@/lib/admin/overview/kpi";
import type { AllOverview, StoreOverview } from "@/lib/admin/overview/load";
import { formatKr, formatTimeWindow, readyLabel, ticketLabel } from "@/lib/admin/overview/format";

const NOW = new Date("2026-10-04T10:00:00Z");

const store: StoreOverview = {
  kind: "store",
  scope: "vejle",
  period: "dag",
  range: periodRange("dag", NOW),
  kpis: {
    ...computeKpis([]),
    revenue: 894_000,
    salesCount: 14,
    avgBasket: 63_900,
    profit: 321_000,
    marginPct: 36,
  },
  revenueDeltaPct: 12,
  cash: { state: "open", detail: "Kasse 1 · åbnet 10.02 af Mikkel" },
  ready: {
    total: 4,
    items: [
      { id: "t1", label: "#1189", title: "OnePlus Nord 3 · skærm og bagglas", days: 3, overdue: true },
      { id: "t2", label: "#1203", title: "iPhone 13 · batteri", days: 0, overdue: false },
    ],
  },
  webBookings: { stale: 0, groups: [
    {
      key: "2026-10-04",
      kind: "idag",
      label: "I dag",
      items: [
        { id: "t3", label: "PS-2026-0121", customer: "Henrik Due", title: "iPhone 15 · skærm (OEM)", price: "1.599 kr.", store: "Vejle", time: "12.00–14.00", isNew: true },
      ],
    },
    {
      key: "2026-10-06",
      kind: "senere",
      label: "Tirsdag 6. okt.",
      items: [
        { id: "t4", label: "PS-2026-0122", customer: "Mathias Larsen", title: "Pixel 9 Pro XL · Skærmskift", price: null, store: "Vejle", time: "16.00–18.00", isNew: false },
      ],
    },
  ] },
  transfers: [
    { id: "x1", text: "På vej fra Slagelse · iPhone 14 Pro 128 GB", action: "Modtag" },
    { id: "x2", text: "Slagelse beder om · 2× USB-C kabel 1 m", action: "Send" },
  ],
};

const all: AllOverview = {
  kind: "alle",
  period: "uge",
  range: periodRange("uge", NOW),
  stores: [
    { slug: "vejle", label: "Vejle", revenue: 4_120_000, profit: 1_490_000, salesCount: 63, openCases: 12, cash: "Åben" },
    { slug: "slagelse", label: "Slagelse", revenue: 5_399_500, profit: 1_940_000, salesCount: 84, openCases: 21, cash: "Åben" },
    { slug: "webshop", label: "Webshop", revenue: 3_870_000, profit: 1_120_000, salesCount: 22, openCases: 3, cash: "–" },
  ],
  total: { slug: "total", label: "I alt", revenue: 13_389_500, profit: 4_550_000, salesCount: 169, openCases: 36, cash: "" },
  sessions: [
    { key: "a", store: "Vejle", register: "Kasse 1", date: "2026-10-02T15:00:00Z", registerId: "R1", locked: true, difference: 0 },
    { key: "b", store: "Slagelse", register: "Kasse 1", date: "2026-10-02T15:00:00Z", registerId: "R2", locked: true, difference: -2_000 },
  ],
  vat: { vatStandard: 842_000, brugtmoms: 311_000, deposits: 150_000 },
  attention: [{ key: "ready", text: "4 sager klar til afhentning i over 5 dage", href: "/admin/reparationer" }],
  webBookings: { groups: [], stale: 0 },
};

afterEach(cleanup);

describe("Overblik for en butik", () => {
  it("viser hilsen, de fire nøgletal og de tre paneler", () => {
    render(<StoreOverviewView data={store} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hej Vejle");
    expect(screen.getByText("Omsætning inkl. moms")).toBeTruthy();
    expect(screen.getByText(/8\.940 kr\./)).toBeTruthy();
    expect(screen.getByText("+12 % mod sidste søndag")).toBeTruthy();
    expect(screen.getByText("Gns. kurv 639 kr.")).toBeTruthy();
    expect(screen.getByText("36 % af omsætning")).toBeTruthy();
    expect(screen.getByText("Åben")).toBeTruthy();
    expect(screen.getByText("Kasse 1 · åbnet 10.02 af Mikkel")).toBeTruthy();
    for (const title of ["Nye reparationsanmodninger", "Klar til afhentning", "Overførsler"]) {
      expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    }
  });

  it("fremhæver sager, der har ventet mere end to dage, i ravgul", () => {
    render(<StoreOverviewView data={store} />);
    expect(screen.getByText("Klar i 3 dage").className).toContain("#9A5B0A");
    expect(screen.getByText("Klar i dag").className).not.toContain("#9A5B0A");
    expect(screen.getByRole("link", { name: "Se alle (4)" }).getAttribute("href")).toBe("/admin/reparationer");
  });

  it("Modtag fører til sagen, og perioden er tre links", () => {
    render(<StoreOverviewView data={store} />);
    const modtag = screen.getAllByRole("link", { name: "Modtag" }).map((l) => l.getAttribute("href"));
    expect(modtag).toEqual(["/admin/reparationer/t3", "/admin/varer/overforsler"]);
    const group = screen.getByRole("group", { name: "Periode" });
    expect(within(group).getAllByRole("link").map((a) => a.textContent)).toEqual(["I dag", "Denne uge", "Denne måned"]);
    expect(OVERBLIK_PERIODS).toHaveLength(3);
  });

  it("tomme paneler får en rolig besked, ikke et hul", () => {
    render(<StoreOverviewView data={{ ...store, ready: { items: [], total: 0 }, webBookings: { groups: [], stale: 0 }, transfers: [] }} />);
    expect(screen.getByText("Ingen sager venter på afhentning.")).toBeTruthy();
    expect(screen.getByText(/Nye bookinger fra hjemmesiden vises her/)).toBeTruthy();
    expect(screen.getByText("Ingen overførsler på vej.")).toBeTruthy();
  });

  it("viser også bookinger til senere dage, ikke kun i dag", () => {
    render(<StoreOverviewView data={store} />);
    expect(screen.getByText("2 er ikke modtaget endnu")).toBeTruthy();
    expect(screen.getByText("Tirsdag 6. okt.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mathias Larsen" }).getAttribute("href")).toBe("/admin/reparationer/t4");
    expect(screen.getByText("Ny")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Se alle i Sagsstyring" }).getAttribute("href")).toBe("/admin/reparationer?fane=web");
  });

  it("samler gamle bookinger i én linje i stedet for at vise dem alle", () => {
    render(<StoreOverviewView data={{ ...store, webBookings: { ...store.webBookings, stale: 79 } }} />);
    expect(screen.getByText(/79 ældre bookinger \(over 14 dage\)/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ryd op i Sagsstyring" }).getAttribute("href")).toBe("/admin/reparationer?fane=web");
  });

  it("webshoppen har ingen kassekort", () => {
    render(<StoreOverviewView data={{ ...store, scope: "webshop", cash: { state: "none", detail: "Ingen kasse" } }} />);
    expect(screen.queryByText("Kassen")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hej Webshop");
  });

  it("medarbejder uden butik får en forklaring i stedet for tal", () => {
    render(<StoreOverviewView data={{ ...store, scope: "ingen" }} />);
    expect(screen.getByText(/ikke knyttet til en butik/)).toBeTruthy();
    expect(screen.queryByText("Omsætning inkl. moms")).toBeNull();
  });
});

describe("Alle butikker", () => {
  it("viser tabel pr. butik med I alt", () => {
    render(<AllStoresOverviewView data={all} periods={OVERBLIK_PERIODS} basePath="/admin" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Alle butikker");
    expect(screen.getByText("Webshop")).toBeTruthy();
    expect(screen.getByText("I alt")).toBeTruthy();
    expect(screen.getByText("133.895 kr.")).toBeTruthy();
    expect(screen.getByText("169")).toBeTruthy();
  });

  it("dagsopgørelser: låst uden difference, ravgul ved difference, links til PDF og CSV", () => {
    render(<AllStoresOverviewView data={all} periods={OVERBLIK_PERIODS} basePath="/admin" />);
    expect(screen.getByText("Låst · difference 0 kr.")).toBeTruthy();
    const diff = screen.getByText("Difference −20 kr.");
    expect(diff.className).toContain("#9A5B0A");
    const pdfs = screen.getAllByRole("link", { name: "PDF" });
    expect(pdfs[1].getAttribute("href")).toBe("/api/pos/daily-summary?register_id=R2&date=2026-10-02&format=pdf");
    expect(screen.getAllByRole("link", { name: "CSV" })[0].getAttribute("href")).toContain("format=csv");
  });

  it("moms: standard, brugt og depositum som egen linje, kun når der er depositum", () => {
    const { rerender } = render(<AllStoresOverviewView data={all} periods={OVERBLIK_PERIODS} basePath="/admin" />);
    expect(screen.getByRole("heading", { name: "Moms denne uge" })).toBeTruthy();
    expect(screen.getByText("Standardmoms (25 %)")).toBeTruthy();
    expect(screen.getByText("Brugtmoms (brugt elektronik)")).toBeTruthy();
    expect(screen.getByText("Depositum modtaget (ikke indtægt endnu)")).toBeTruthy();
    rerender(<AllStoresOverviewView data={{ ...all, vat: { ...all.vat, deposits: 0 } }} periods={OVERBLIK_PERIODS} basePath="/admin" />);
    expect(screen.queryByText("Depositum modtaget (ikke indtægt endnu)")).toBeNull();
  });

  it("kræver opmærksomhed, med tom tilstand", () => {
    const { rerender } = render(<AllStoresOverviewView data={all} periods={OVERBLIK_PERIODS} basePath="/admin" />);
    expect(screen.getByText("4 sager klar til afhentning i over 5 dage")).toBeTruthy();
    rerender(<AllStoresOverviewView data={{ ...all, attention: [] }} periods={OVERBLIK_PERIODS} basePath="/admin" />);
    expect(screen.getByText("Intet kræver opmærksomhed lige nu.")).toBeTruthy();
  });

  it("Økonomi bruger samme visning med egen titel og perioder", () => {
    render(<AllStoresOverviewView data={{ ...all, period: "kvartal" }} title="Økonomi" periods={["maaned", "kvartal", "aar"]} basePath="/admin/okonomi" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Økonomi");
    expect(screen.getByRole("heading", { name: "Moms dette kvartal" })).toBeTruthy();
    const group = screen.getByRole("group", { name: "Periode" });
    expect(within(group).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/admin/okonomi?periode=maaned",
      "/admin/okonomi?periode=kvartal",
      "/admin/okonomi?periode=aar",
    ]);
  });
});

describe("formatering", () => {
  it("beløb, sagsnumre og tidsrum", () => {
    expect(formatKr(894_000)).toBe("8.940 kr.");
    expect(formatKr(-2_000)).toBe("−20 kr.");
    expect(formatKr(0)).toBe("0 kr.");
    expect(ticketLabel("1189")).toBe("#1189");
    expect(ticketLabel("PS-1189")).toBe("PS-1189");
    expect(readyLabel(1)).toBe("Klar i 1 dag");
    expect(formatTimeWindow("12:00-14:00")).toBe("12.00–14.00");
  });
});
