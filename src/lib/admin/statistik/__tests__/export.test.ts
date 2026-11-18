// @vitest-environment node
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { exportFileName, toCsv, toXlsx } from "../export";
import { stripForViewer, type Money, type StatPayload } from "../payload";

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
    ],
    now: {
      updatedAt: "2026-11-18T13:32:00.000Z",
      today: { ...m(0, 0), count: 0, deltaPct: null, hours: [], streams: { webshop: 0, kasse: 0, reparation: 0 } },
      rows: [],
    },
    total: { ...m(2_748_500, 900_000), deltaPct: 8.2, profitDeltaPct: 4.1 },
    series: [
      { key: "2026-11-17", label: "17. nov.", webshop: m(1_000_000, 300_000), kasse: m(1_000_000, 300_000), reparation: m(748_500, 300_000), prevRevenue: 2_000_000, prevProfit: 700_000 },
      { key: "2026-11-18", label: "18. nov.", webshop: m(0, 0), kasse: m(-500, -100), reparation: m(0, 0), prevRevenue: 0, prevProfit: 0 },
      { key: "2026-11-19", label: "19. nov.", webshop: m(0, 0), kasse: m(0, 0), reparation: m(0, 0), prevRevenue: 0, prevProfit: 0 },
    ],
    byStore: [{ slug: "vejle", label: "Vejle", money: m(2_748_500, 900_000) }],
    payments: [{ type: "kort_terminal", label: "Kort", amount: 3_435_625 }],
    categories: [{ category: "enheder", label: "Enheder", money: m(2_748_500, 900_000) }],
    missingCost: 2,
    staff: [{ name: "Mikkel", store: "Vejle", sales: 4, repairs: 2, money: m(1_748_500, 600_000) }],
    top: [{ name: "iPhone 13; 128 GB", category: "enheder", units: 3, money: m(1_200_000, 300_000) }],
    repairs: { paidCases: 5, money: m(748_500, 300_000), openNow: 23, byType: [{ label: "Skærmskift", sharePct: 60 }], prepaidWithoutAmount: 0 },
    buyback: { paidOut: 400_000, offset: 50_000, receipts: 3, offersSent: 20, acceptedPct: 15, byStore: [{ label: "Vejle", amount: 400_000 }], dataFrom: null },
    webshop: { visits: 1000, addToCart: 120, purchases: 8, abandoned: 4, avgOrder: 125_000 },
    stock: { units: 214, costValue: 48_620_000, accessoryCostValue: 2_000_000, avgDays: 31, over60: 19, soldOutModels: 7, oneLeftModels: 12 },
    notes: { partialRefunds: 0 },
    unavailable: [],
  };
}

const strippedPayload = () => stripForViewer(ownerPayload(), { isOwner: false, scope: "vejle", canExport: true });

async function readBack(bytes: Uint8Array): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
  return wb;
}

/** Alle celleværdier i et ark som tekst. */
function sheetText(ws: ExcelJS.Worksheet): string {
  const out: string[] = [];
  ws.eachRow((row) => row.eachCell((c) => out.push(String(c.value))));
  return out.join("\n");
}

describe("toCsv", () => {
  it("ejeren: BOM, semikolon, CRLF, fortjeneste og margin, kroner med to decimaler", () => {
    const csv = toCsv(ownerPayload());
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines).toHaveLength(ownerPayload().series.length + 1);
    expect(lines[0]).toBe("Periode;Webshop;Kassesalg;Reparation;Omsætning uden moms;Omsætning inkl. moms;Fortjeneste;Margin %");
    expect(lines[0].endsWith("Fortjeneste;Margin %")).toBe(true);
    expect(lines[1]).toBe("2026-11-17;10000,00;10000,00;7485,00;27485,00;34356,25;9000,00;32,7");
    expect(csv).toContain("27485,00");
    // Negative beløb (kreditnota) og tom margin, når omsætningen er 0.
    expect(lines[2]).toBe("2026-11-18;0,00;-5,00;0,00;-5,00;-6,25;-1,00;20,0");
    expect(lines[3]).toBe("2026-11-19;0,00;0,00;0,00;0,00;0,00;0,00;");
  });

  it("andre end ejeren: hverken fortjeneste eller margin", () => {
    const csv = toCsv(strippedPayload());
    expect(csv).not.toContain("Fortjeneste");
    expect(csv).not.toContain("Margin");
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe("Periode;Webshop;Kassesalg;Reparation;Omsætning uden moms;Omsætning inkl. moms");
    expect(lines[1].split(";")).toHaveLength(6);
  });

  it("timer får dato og klokkeslæt", () => {
    const p = ownerPayload();
    p.range = { ...p.range, from: "2026-11-18", to: "2026-11-18", unit: "time" };
    p.series = [{ ...p.series[0], key: "2026-11-18T08:00:00.000Z", label: "9" }];
    expect(toCsv(p).split("\r\n")[1].startsWith("2026-11-18 09:00;")).toBe(true);
  });
});

describe("toXlsx", () => {
  it("andre end ejeren får ingen Fortjeneste- eller Medarbejdere-fane og ingen ejer-tal", async () => {
    const wb = await readBack(await toXlsx(strippedPayload()));
    const names = wb.worksheets.map((w) => w.name);
    expect(names).not.toContain("Fortjeneste");
    expect(names).not.toContain("Medarbejdere");
    expect(names).toEqual(expect.arrayContaining(["Overblik", "Pr. dag", "Butikker", "Betaling", "Mest solgte", "Reparationer", "Opkøb"]));
    const all = wb.worksheets.map(sheetText).join("\n");
    expect(all).not.toMatch(/fortjeneste|margin|kostpris|lagerværdi/i);
  });

  it("ejeren får begge ejer-faner", async () => {
    const wb = await readBack(await toXlsx(ownerPayload()));
    const names = wb.worksheets.map((w) => w.name);
    expect(names).toEqual(expect.arrayContaining(["Overblik", "Pr. dag", "Butikker", "Betaling", "Mest solgte", "Reparationer", "Opkøb", "Fortjeneste", "Medarbejdere"]));
    expect(sheetText(wb.getWorksheet("Medarbejdere")!)).toContain("Mikkel");
    // Beløb er tal i kroner, ikke tekst.
    const perDay = wb.getWorksheet("Pr. dag")!;
    expect(perDay.getRow(2).getCell(5).value).toBe(27485);
  });

  it("afsnit, der ikke kunne hentes, står som Kunne ikke hentes i stedet for nuller", async () => {
    const p = ownerPayload();
    p.unavailable = ["receipts", "devices"];
    const wb = await readBack(await toXlsx(p));
    const buyback = wb.getWorksheet("Opkøb")!;
    expect(sheetText(buyback)).toBe("Kunne ikke hentes");
    expect(sheetText(wb.getWorksheet("Lager")!)).toBe("Kunne ikke hentes");
    expect(sheetText(wb.getWorksheet("Reparationer")!)).toContain("Åbne sager nu");
  });
});

describe("exportFileName", () => {
  it("periode og butik i navnet", () => {
    expect(exportFileName(strippedPayload(), "csv")).toBe("phonespot-statistik-2026-10-20_2026-11-18-vejle.csv");
    expect(exportFileName(ownerPayload(), "xlsx")).toBe("phonespot-statistik-2026-10-20_2026-11-18-alle.xlsx");
  });
});
