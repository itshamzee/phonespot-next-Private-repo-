"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Money, StatPayload } from "@/lib/admin/statistik/payload";
import type { Stream } from "@/lib/admin/statistik/lines";
import type { ChartRow, ChartSeries } from "./chart-canvas";
import { segButtonClass, segClass, useStatNav } from "./controls";
import { CountUp } from "./count-up";
import { Delta } from "./delta";
import { kr, pct } from "./format";
import { STREAMS, type Metric } from "./shared";
import { cardClass, h2Class } from "./styles";

/**
 * Hovedgrafen på Statistik: total og procentændring, Omsætning/Fortjeneste
 * (kun ejeren, skrives til ?vis), forklaring der slår typer til og fra, den
 * stablede graf og en skjult tabel med de samme tal til skærmlæsere.
 * Selve grafen (Recharts) indlæses for sig med next/dynamic uden SSR, så
 * Recharts kun hentes på denne side.
 */

const ChartCanvas = dynamic(() => import("./chart-canvas").then((m) => m.ChartCanvas), {
  ssr: false,
  loading: () => <div className="h-full" />,
});

const COLORS: Record<Stream, string> = { webshop: "#1A3D2E", kasse: "#5A8C6F", reparation: "#B9CFC0" };
const OFF_SWATCH = "#CBD1CC";

const METRICS: { value: Metric; label: string }[] = [
  { value: "omsaetning", label: "Omsætning" },
  { value: "fortjeneste", label: "Fortjeneste" },
];

const valueOf = (m: Money, metric: Metric) => (metric === "fortjeneste" ? (m.profit ?? 0) : m.revenue);

export function ChartPanel({ payload, metric: requested }: { payload: StatPayload; metric: Metric }) {
  const { total, series, range, notes, viewer } = payload;
  const isOwner = viewer.isOwner;
  // Fortjeneste findes kun i ejerens payload.
  const metric: Metric = isOwner ? requested : "omsaetning";
  const { go } = useStatNav();
  const [on, setOn] = useState<Record<Stream, boolean>>({ webshop: true, kasse: true, reparation: true });

  const title = metric === "fortjeneste" ? "Fortjeneste over tid" : "Omsætning over tid";
  const visible = STREAMS.filter(({ key }) => on[key]);
  const allOn = visible.length === STREAMS.length;
  const delta = metric === "fortjeneste" ? total.profitDeltaPct : total.deltaPct;
  // Forrige periode findes kun som total for alle typer; for et udsnit vises den ikke.
  const hasPrev = allOn && series.some((s) => (metric === "fortjeneste" ? s.prevProfit : s.prevRevenue) != null);
  const empty = series.every((s) => STREAMS.every(({ key }) => s[key].revenue === 0 && (s[key].profit ?? 0) === 0));

  const rows: ChartRow[] = series.map((s) => {
    const values = visible.map(({ key }) => ({ key, v: valueOf(s[key], metric) }));
    const row: ChartRow = {
      key: s.key,
      label: s.label,
      webshop: on.webshop ? valueOf(s.webshop, metric) : 0,
      kasse: on.kasse ? valueOf(s.kasse, metric) : 0,
      reparation: on.reparation ? valueOf(s.reparation, metric) : 0,
      total: visible.reduce((a, { key }) => a + valueOf(s[key], metric), 0),
      prev: hasPrev ? ((metric === "fortjeneste" ? s.prevProfit : s.prevRevenue) ?? null) : null,
      capTop: values.filter((x) => x.v > 0).at(-1)?.key ?? null,
      capBottom: values.filter((x) => x.v < 0).at(-1)?.key ?? null,
    };
    if (isOwner) {
      const revenue = visible.reduce((a, { key }) => a + s[key].revenue, 0);
      const profit = visible.reduce((a, { key }) => a + (s[key].profit ?? 0), 0);
      row.marginPct = revenue !== 0 ? (profit / revenue) * 100 : null;
    }
    return row;
  });
  const shownTotal = rows.reduce((a, r) => a + r.total, 0);
  const chartSeries: ChartSeries[] = visible.map((s) => ({ ...s, color: COLORS[s.key] }));

  return (
    <section aria-label={title} className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={h2Class}>{title}</h2>
          <div data-testid="chart-total" className="mt-2 text-[34px] font-bold tracking-[-0.02em] tabular-nums">
            <CountUp value={shownTotal} />
          </div>
          {/* Sammenligningen gælder alle typer; for et udsnit findes ingen. */}
          {allOn ? (
            <div className="mt-1">
              <Delta value={delta} /> <span className="text-[#5E6A63]">{range.compareLabel}</span>
            </div>
          ) : null}
          {notes.partialRefunds > 0 ? (
            <p className="m-0 mt-1 text-[13px] text-[#5E6A63]">Delvist refunderet i perioden: {kr(notes.partialRefunds)}</p>
          ) : null}
        </div>
        {isOwner ? (
          <div role="group" aria-label="Vis" className={segClass}>
            {METRICS.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={metric === m.value}
                className={segButtonClass(metric === m.value)}
                onClick={() => go({ vis: m.value === "fortjeneste" ? "fortjeneste" : null })}
              >
                {m.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {empty ? (
        <p className="m-0 mt-[22px] py-10 text-center text-[14px] text-[#5E6A63]">Ingen salg i perioden</p>
      ) : (
        <>
          <div role="group" aria-label="Typer" className="mt-3.5 flex flex-wrap gap-2">
            {STREAMS.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={on[s.key]}
                // Mindst én type er altid slået til.
                onClick={() => setOn((prev) => (prev[s.key] && STREAMS.filter(({ key }) => prev[key]).length === 1 ? prev : { ...prev, [s.key]: !prev[s.key] }))}
                className={`flex h-[34px] cursor-pointer items-center gap-2 rounded-lg border border-[#E2E5E0] px-3 text-[13px] motion-safe:transition-[background-color,color,transform] motion-safe:duration-200 motion-safe:active:scale-[0.97] ${
                  on[s.key] ? "bg-white text-[#15211B]" : "bg-[#F4F6F3] text-[#5E6A63]"
                }`}
              >
                <i
                  aria-hidden
                  className="inline-block size-2.5 rounded-[3px] motion-safe:transition-colors motion-safe:duration-200"
                  style={{ background: on[s.key] ? COLORS[s.key] : OFF_SWATCH }}
                />
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-[22px] h-[300px]">
            <ChartCanvas
              rows={rows}
              series={chartSeries}
              hasPrev={hasPrev}
              hourly={range.unit === "time"}
              label={`${title}, fordelt på ${visible.map((s) => s.label.toLowerCase()).join(", ")}`}
            />
          </div>

          <table className="sr-only">
            <caption>{title} pr. interval</caption>
            <thead>
              <tr>
                <th scope="col">Periode</th>
                {visible.map((s) => (
                  <th key={s.key} scope="col">
                    {s.label}
                  </th>
                ))}
                <th scope="col">I alt</th>
                {isOwner ? <th scope="col">Margin</th> : null}
                {hasPrev ? <th scope="col">Forrige periode</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row">{r.label}</th>
                  {visible.map(({ key }) => (
                    <td key={key}>{kr(r[key])}</td>
                  ))}
                  <td>{kr(r.total)}</td>
                  {isOwner ? <td>{pct(r.marginPct)}</td> : null}
                  {hasPrev ? <td>{r.prev == null ? "–" : kr(r.prev)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
