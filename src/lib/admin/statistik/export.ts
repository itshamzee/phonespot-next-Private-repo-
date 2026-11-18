import ExcelJS from "exceljs";
import { copenhagenDateString } from "@/lib/pos/copenhagen";
import { SCOPE_LABELS } from "@/lib/auth/store-scope";
import type { BucketUnit } from "./range";
import type { Money, StatPayload, StatSection } from "./payload";

/**
 * Eksport af Statistik til CSV og Excel. Kun til serveren (exceljs).
 *
 * Alt læses fra den payload, der gives, og intet andet: ruten bygger den for
 * viewer med loadStatistik, så kostpris, fortjeneste, margin, medarbejdere og
 * lagerværdi allerede er skåret fra for andre end ejeren. Ejer-kolonner og
 * -faner kommer kun med, når felterne findes i payloaden.
 */

const PREFIX = "phonespot-statistik";
const UNAVAILABLE = "Kunne ikke hentes";

/** "phonespot-statistik-<fra>_<til>-<butik>.<ext>" */
export function exportFileName(p: StatPayload, ext: "csv" | "xlsx"): string {
  return `${PREFIX}-${p.range.from}_${p.range.to}-${p.viewer.scope}.${ext}`;
}

/* ------------------------------------------------------------------ */
/*  Fælles                                                             */
/* ------------------------------------------------------------------ */

type Row = StatPayload["series"][number];

const hasProfit = (p: StatPayload) => p.total.profit !== undefined;

/** Periodens navn i rækken: dato (og klokkeslæt), uge fra mandag, eller måned (YYYY-MM). */
function periodLabel(unit: BucketUnit, s: Row): string {
  if (unit === "time") return `${copenhagenDateString(s.key)} ${s.label.padStart(2, "0")}:00`;
  return s.key;
}

function rowTotals(s: Row) {
  const parts = [s.webshop, s.kasse, s.reparation];
  return {
    revenue: parts.reduce((a, m) => a + m.revenue, 0),
    revenueInclVat: parts.reduce((a, m) => a + m.revenueInclVat, 0),
    profit: parts.reduce((a, m) => a + (m.profit ?? 0), 0),
  };
}

/** Margin i procent, eller null når omsætningen er 0. */
const marginOf = (profit: number, revenue: number) => (revenue === 0 ? null : (profit / revenue) * 100);

const failed = (p: StatPayload, sections: StatSection[]) => sections.some((s) => p.unavailable.includes(s));

/* ------------------------------------------------------------------ */
/*  CSV                                                                */
/* ------------------------------------------------------------------ */

/** Øre som kroner med to decimaler og decimalkomma, uden tusindtalsseparator: 2748500 -> "27485,00". */
function csvKr(oere: number): string {
  const a = Math.abs(Math.round(oere));
  const sign = oere < 0 && a > 0 ? "-" : "";
  return `${sign}${Math.floor(a / 100)},${String(a % 100).padStart(2, "0")}`;
}

function csvPct(n: number | null): string {
  return n == null ? "" : n.toFixed(1).replace(".", ",");
}

function csvField(v: string): string {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Én række pr. interval i grafen (time, dag, uge eller måned) for den valgte
 * periode og butik. UTF-8 med BOM, semikolon, CRLF og dansk decimalkomma, så
 * Excel på dansk åbner filen direkte. Fortjeneste og margin kun for ejeren.
 */
export function toCsv(p: StatPayload): string {
  const profit = hasProfit(p);
  const header = ["Periode", "Webshop", "Kassesalg", "Reparation", "Omsætning uden moms", "Omsætning inkl. moms"];
  if (profit) header.push("Fortjeneste", "Margin %");

  const rows = p.series.map((s) => {
    const t = rowTotals(s);
    const cells = [
      periodLabel(p.range.unit, s),
      csvKr(s.webshop.revenue),
      csvKr(s.kasse.revenue),
      csvKr(s.reparation.revenue),
      csvKr(t.revenue),
      csvKr(t.revenueInclVat),
    ];
    if (profit) cells.push(csvKr(t.profit), csvPct(marginOf(t.profit, t.revenue)));
    return cells;
  });

  return "﻿" + [header, ...rows].map((r) => r.map(csvField).join(";")).join("\r\n");
}

/* ------------------------------------------------------------------ */
/*  Excel                                                              */
/* ------------------------------------------------------------------ */

type Kind = "text" | "kr" | "int" | "pct";
type Value = string | number | null;
type Col = { header: string; kind: Kind; width?: number };

const FORMATS: Record<Kind, string | undefined> = {
  text: undefined,
  kr: "#,##0.00",
  int: "#,##0",
  pct: "0.0",
};

/** Øre -> kroner som tal; Excel viser dem med to decimaler. */
const toKr = (oere: number) => oere / 100;

const SERIES_SHEET: Record<BucketUnit, string> = {
  time: "Pr. time",
  dag: "Pr. dag",
  uge: "Pr. uge",
  maaned: "Pr. måned",
};

function cellValue(kind: Kind, v: Value): Value {
  if (v == null) return null;
  return kind === "kr" && typeof v === "number" ? toKr(v) : v;
}

/** En tabel med fed overskriftsrække fra rækken `start`. Returnerer næste ledige række. */
function writeTable(ws: ExcelJS.Worksheet, cols: Col[], rows: Value[][], start = 1): number {
  const head = ws.getRow(start);
  cols.forEach((c, i) => {
    head.getCell(i + 1).value = c.header;
  });
  head.font = { bold: true };
  rows.forEach((r, ri) => {
    const row = ws.getRow(start + 1 + ri);
    cols.forEach((c, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = cellValue(c.kind, r[ci] ?? null);
      const fmt = FORMATS[c.kind];
      if (fmt) cell.numFmt = fmt;
    });
  });
  cols.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.max(col.width ?? 0, c.width ?? Math.max(12, c.header.length + 2));
  });
  return start + rows.length + 2;
}

/** Nøgletal som to kolonner: navn og værdi. */
function writeFacts(ws: ExcelJS.Worksheet, facts: [label: string, kind: Kind, value: Value][], start = 1): number {
  facts.forEach(([label, kind, value], i) => {
    const row = ws.getRow(start + i);
    row.getCell(1).value = label;
    const cell = row.getCell(2);
    cell.value = cellValue(kind, value);
    const fmt = FORMATS[kind];
    if (fmt && typeof value === "number") cell.numFmt = fmt;
  });
  ws.getColumn(1).width = Math.max(ws.getColumn(1).width ?? 0, 34);
  ws.getColumn(2).width = Math.max(ws.getColumn(2).width ?? 0, 18);
  return start + facts.length + 1;
}

/** Et afsnit, der ikke kunne hentes: én celle i stedet for tal, der ligner nuller. */
function writeUnavailable(ws: ExcelJS.Worksheet): void {
  ws.getCell("A1").value = UNAVAILABLE;
  ws.getColumn(1).width = 24;
}

/** Omsætning (og for ejeren fortjeneste og margin) for en Money. */
function moneyCols(profit: boolean): Col[] {
  const cols: Col[] = [
    { header: "Omsætning uden moms", kind: "kr" },
    { header: "Omsætning inkl. moms", kind: "kr" },
  ];
  if (profit) cols.push({ header: "Fortjeneste", kind: "kr" }, { header: "Margin %", kind: "pct" });
  return cols;
}

function moneyValues(m: Money, profit: boolean): Value[] {
  const out: Value[] = [m.revenue, m.revenueInclVat];
  if (profit) out.push(m.profit ?? 0, m.marginPct ?? null);
  return out;
}

function overviewSheet(wb: ExcelJS.Workbook, p: StatPayload, profit: boolean) {
  const ws = wb.addWorksheet("Overblik");
  const facts: [string, Kind, Value][] = [
    ["Periode", "text", `${p.range.from} – ${p.range.to}`],
    ["Butik", "text", SCOPE_LABELS[p.viewer.scope]],
    ["Omsætning uden moms", "kr", p.total.revenue],
    ["Omsætning inkl. moms", "kr", p.total.revenueInclVat],
    [`Ændring % (${p.range.compareLabel})`, "pct", p.total.deltaPct],
  ];
  if (profit) {
    facts.push(
      ["Fortjeneste", "kr", p.total.profit ?? 0],
      ["Margin %", "pct", p.total.marginPct ?? null],
      [`Ændring i fortjeneste % (${p.range.compareLabel})`, "pct", p.total.profitDeltaPct ?? null],
    );
  }
  facts.push(
    failed(p, ["partialRefunds"])
      ? ["Delvist refunderet i perioden", "text", UNAVAILABLE]
      : ["Delvist refunderet i perioden", "kr", p.notes.partialRefunds],
  );
  writeFacts(ws, facts);
}

function seriesSheet(wb: ExcelJS.Workbook, p: StatPayload, profit: boolean) {
  const ws = wb.addWorksheet(SERIES_SHEET[p.range.unit]);
  const cols: Col[] = [
    { header: "Periode", kind: "text", width: 18 },
    { header: "Webshop", kind: "kr" },
    { header: "Kassesalg", kind: "kr" },
    { header: "Reparation", kind: "kr" },
    { header: "Omsætning uden moms", kind: "kr" },
    { header: "Omsætning inkl. moms", kind: "kr" },
    { header: "Forrige periode", kind: "kr" },
  ];
  if (profit) cols.push({ header: "Fortjeneste", kind: "kr" }, { header: "Margin %", kind: "pct" }, { header: "Forrige periode, fortjeneste", kind: "kr" });
  const rows = p.series.map((s) => {
    const t = rowTotals(s);
    const r: Value[] = [periodLabel(p.range.unit, s), s.webshop.revenue, s.kasse.revenue, s.reparation.revenue, t.revenue, t.revenueInclVat, s.prevRevenue];
    if (profit) r.push(t.profit, marginOf(t.profit, t.revenue), s.prevProfit ?? null);
    return r;
  });
  writeTable(ws, cols, rows);
}

function storesSheet(wb: ExcelJS.Workbook, p: StatPayload, profit: boolean) {
  const ws = wb.addWorksheet("Butikker");
  writeTable(
    ws,
    [{ header: "Butik", kind: "text", width: 18 }, ...moneyCols(profit)],
    p.byStore.map((s) => [s.label, ...moneyValues(s.money, profit)]),
  );
}

function paymentsSheet(wb: ExcelJS.Workbook, p: StatPayload) {
  const ws = wb.addWorksheet("Betaling");
  writeTable(
    ws,
    [
      { header: "Betalingsform", kind: "text", width: 20 },
      { header: "Beløb inkl. moms", kind: "kr" },
    ],
    p.payments.map((x) => [x.label, x.amount]),
  );
}

const CATEGORY_LABELS: Record<string, string> = { enheder: "Enheder", tilbehoer: "Tilbehør", reparation: "Reparation", oevrigt: "Øvrigt" };

function topSheet(wb: ExcelJS.Workbook, p: StatPayload, profit: boolean) {
  const ws = wb.addWorksheet("Mest solgte");
  writeTable(
    ws,
    [{ header: "Vare", kind: "text", width: 40 }, { header: "Kategori", kind: "text" }, { header: "Antal", kind: "int" }, ...moneyCols(profit)],
    p.top.map((t) => [t.name, CATEGORY_LABELS[t.category] ?? t.category, t.units, ...moneyValues(t.money, profit)]),
  );
}

function repairsSheet(wb: ExcelJS.Workbook, p: StatPayload, profit: boolean) {
  const ws = wb.addWorksheet("Reparationer");
  if (failed(p, ["openRepairs"])) return writeUnavailable(ws);
  const r = p.repairs;
  const facts: [string, Kind, Value][] = [
    ["Betalte sager", "int", r.paidCases],
    ["Omsætning uden moms", "kr", r.money.revenue],
  ];
  if (profit) facts.push(["Fortjeneste", "kr", r.money.profit ?? 0]);
  facts.push(["Åbne sager nu", "int", r.openNow], ["Forudbetalte sager uden beløb", "int", r.prepaidWithoutAmount]);
  const next = writeFacts(ws, facts);
  if (r.byType.length > 0) {
    writeTable(
      ws,
      [
        { header: "Reparationstype", kind: "text" },
        { header: "Andel %", kind: "int" },
      ],
      r.byType.map((t) => [t.label, t.sharePct]),
      next,
    );
  }
}

function buybackSheet(wb: ExcelJS.Workbook, p: StatPayload) {
  const ws = wb.addWorksheet("Opkøb");
  if (failed(p, ["receipts", "offers"])) return writeUnavailable(ws);
  const b = p.buyback;
  const next = writeFacts(ws, [
    ["Udbetalt", "kr", b.paidOut],
    ["Modregnet", "kr", b.offset],
    ["Slutsedler", "int", b.receipts],
    ["Tilbud sendt", "int", b.offersSent],
    ["Accepteret %", "pct", b.acceptedPct],
  ]);
  const after = b.byStore.length > 0
    ? writeTable(
        ws,
        [
          { header: "Udbetalt fra", kind: "text" },
          { header: "Beløb", kind: "kr" },
        ],
        b.byStore.map((s) => [s.label, s.amount]),
        next,
      )
    : next;
  if (b.dataFrom) ws.getCell(`A${after}`).value = `Slutsedler findes fra ${b.dataFrom}`;
}

function webshopSheet(wb: ExcelJS.Workbook, p: StatPayload) {
  const ws = wb.addWorksheet("Webshop");
  if (failed(p, ["funnel", "abandoned"])) return writeUnavailable(ws);
  const w = p.webshop;
  writeFacts(ws, [
    ["Besøg", "int", w.visits],
    ["Lagt i kurv", "int", w.addToCart],
    ["Købt", "int", w.purchases],
    ["Forladte kurve i perioden", "int", w.abandoned],
    ["Gns. ordre", "kr", w.avgOrder],
  ]);
}

function stockSheet(wb: ExcelJS.Workbook, p: StatPayload) {
  const ws = wb.addWorksheet("Lager");
  if (failed(p, ["devices", "accessoryStock"])) return writeUnavailable(ws);
  const s = p.stock;
  const facts: [string, Kind, Value][] = [["Enheder på lager", "int", s.units]];
  if (s.costValue !== undefined) facts.push(["Lagerværdi, kostpris", "kr", s.costValue]);
  facts.push(
    ["Gns. dage på lager", "int", s.avgDays],
    ["Over 60 dage", "int", s.over60],
    ["Udsolgte modeller", "int", s.soldOutModels],
    ["Kun 1 tilbage", "int", s.oneLeftModels],
  );
  if (s.accessoryCostValue !== undefined) facts.push(["Tilbehør, lagerværdi", "kr", s.accessoryCostValue]);
  writeFacts(ws, facts);
}

/** Kun ejeren: fortjeneste og margin pr. kategori. */
function profitSheet(wb: ExcelJS.Workbook, categories: NonNullable<StatPayload["categories"]>, missingCost: number) {
  const ws = wb.addWorksheet("Fortjeneste");
  const next = writeTable(
    ws,
    [
      { header: "Kategori", kind: "text", width: 18 },
      { header: "Omsætning uden moms", kind: "kr" },
      { header: "Fortjeneste", kind: "kr" },
      { header: "Margin %", kind: "pct" },
    ],
    categories.map((c) => [c.label, c.money.revenue, c.money.profit, c.money.marginPct]),
  );
  if (missingCost > 0) writeFacts(ws, [["Solgte varer uden kostpris", "int", missingCost]], next);
}

/** Kun ejeren. */
function staffSheet(wb: ExcelJS.Workbook, staff: NonNullable<StatPayload["staff"]>) {
  const ws = wb.addWorksheet("Medarbejdere");
  writeTable(
    ws,
    [
      { header: "Medarbejder", kind: "text", width: 24 },
      { header: "Butik", kind: "text" },
      { header: "Salg", kind: "int" },
      { header: "Reparationer", kind: "int" },
      { header: "Omsætning uden moms", kind: "kr" },
      { header: "Fortjeneste", kind: "kr" },
      { header: "Margin %", kind: "pct" },
    ],
    staff.map((s) => [s.name, s.store, s.sales, s.repairs, s.money.revenue, s.money.profit, s.money.marginPct]),
  );
}

/**
 * Alle afsnit på hver sin fane. Beløb er tal i kroner (to decimaler), procenter
 * tal med én decimal. Afsnit i `unavailable` får én celle "Kunne ikke hentes".
 * Fanerne Fortjeneste og Medarbejdere findes kun, når payloaden har felterne.
 */
export async function toXlsx(p: StatPayload): Promise<Uint8Array> {
  const profit = hasProfit(p);
  const wb = new ExcelJS.Workbook();
  wb.creator = "PhoneSpot";

  overviewSheet(wb, p, profit);
  seriesSheet(wb, p, profit);
  storesSheet(wb, p, profit);
  paymentsSheet(wb, p);
  if (p.categories) profitSheet(wb, p.categories, p.missingCost ?? 0);
  if (p.staff) staffSheet(wb, p.staff);
  topSheet(wb, p, profit);
  repairsSheet(wb, p, profit);
  buybackSheet(wb, p);
  webshopSheet(wb, p);
  stockSheet(wb, p);

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
