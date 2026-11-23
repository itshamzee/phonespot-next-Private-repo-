"use client";

import { useSyncExternalStore } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, type BarShapeProps } from "recharts";
import type { Stream } from "@/lib/admin/statistik/lines";
import { int, kr, pct } from "./format";

/**
 * Selve grafen (Recharts). Indlæses kun via next/dynamic fra chart-panel.tsx,
 * så Recharts ikke kommer med i andre admin-siders bundles. Al tekst og alle
 * tal uden for SVG'en (total, forklaring, tabel) ligger i chart-panel.tsx.
 * Tastatur: Recharts' accessibilityLayer (slået til som standard) viser tallene
 * for første interval ved fokus og flytter med venstre/højre piletast. Det
 * garanterede alternativ er den skjulte tabel i chart-panel.tsx.
 */

/** Ét interval, allerede regnet om til den valgte visning (øre). */
export type ChartRow = {
  key: string;
  label: string;
  webshop: number;
  kasse: number;
  reparation: number;
  /** Summen af de viste typer. */
  total: number;
  /** Forrige periodes total for intervallet; null uden sammenligning eller når en type er slået fra. */
  prev: number | null;
  /** Den øverste positive type i stakken (får runde hjørner foroven). */
  capTop: Stream | null;
  /** Den nederste negative type i stakken (får runde hjørner forneden). */
  capBottom: Stream | null;
  /** Margin for de viste typer; kun for ejeren. */
  marginPct?: number | null;
};

export type ChartSeries = { key: Stream; label: string; color: string };

const PREV_COLOR = "#8A948E";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function reducedMotionNow(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Akseværdier i hele kroner, tusinder som "20 t". */
function axisTick(oere: number): string {
  const kroner = oere / 100;
  if (Math.abs(kroner) >= 1000) return `${(kroner / 1000).toLocaleString("da-DK", { maximumFractionDigits: 1 })} t`;
  return int(kroner);
}

const RADIUS = 2;

/** Kun stakkens yderste segment får runde hjørner; samlingerne inde i stakken er lige. */
function renderSegment(props: BarShapeProps, stream: Stream) {
  const row = props.payload as ChartRow | undefined;
  const y = Math.min(props.y, props.y + props.height);
  const height = Math.abs(props.height);
  const radius: [number, number, number, number] =
    row?.capTop === stream ? [RADIUS, RADIUS, 0, 0] : row?.capBottom === stream ? [0, 0, RADIUS, RADIUS] : [0, 0, 0, 0];
  return <Rectangle x={props.x} y={y} width={props.width} height={height} fill={props.fill} radius={radius} />;
}

type TipProps = {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
  series: ChartSeries[];
  hourly: boolean;
};

/** Grafens tooltip; eksporteret, så den kan testes uden Recharts. */
export function ChartTooltip({ active, payload, series, hourly }: TipProps) {
  const row = payload?.[0]?.payload as ChartRow | undefined;
  if (!active || !row) return null;
  return (
    <div
      data-testid="chart-tooltip"
      className="min-w-[200px] rounded-[10px] bg-[#15211B] px-[13px] py-[11px] text-[13px] text-white tabular-nums"
    >
      <div className="mb-[5px] flex justify-between gap-4 font-semibold">
        <span>{hourly ? `Kl. ${row.label}.00` : row.label}</span>
        <span>{kr(row.total)}</span>
      </div>
      {series.map((s) => (
        <div key={s.key} className="flex justify-between gap-4 py-px">
          <span>{s.label}</span>
          <span>{kr(row[s.key])}</span>
        </div>
      ))}
      {row.marginPct !== undefined ? (
        <div className="mt-[5px] flex justify-between gap-4 opacity-70">
          <span>Margin</span>
          <span>{pct(row.marginPct)}</span>
        </div>
      ) : null}
      {row.prev != null ? (
        <div className={`flex justify-between gap-4 opacity-70 ${row.marginPct !== undefined ? "" : "mt-[5px]"}`}>
          <span>Forrige periode</span>
          <span>{kr(row.prev)}</span>
        </div>
      ) : null}
    </div>
  );
}

export function ChartCanvas({
  rows,
  series,
  hasPrev,
  hourly,
  label,
}: {
  rows: ChartRow[];
  /** De viste typer i stablingsrækkefølge (nederst først). */
  series: ChartSeries[];
  hasPrev: boolean;
  hourly: boolean;
  /** Tilgængeligt navn til grafen. */
  label: string;
}) {
  const reduced = useSyncExternalStore(subscribeReducedMotion, reducedMotionNow, () => true);
  const animate = !reduced;
  // Omkring 8 etiketter på x-aksen.
  const interval = Math.max(0, Math.ceil(rows.length / 8) - 1);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={rows}
        stackOffset="sign"
        barCategoryGap="32%"
        margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
        aria-label={label}
      >
        <CartesianGrid vertical={false} stroke="#EEF0EC" />
        <XAxis
          dataKey="label"
          interval={interval}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#5E6A63" }}
          tickMargin={8}
        />
        <YAxis width={52} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#5E6A63" }} tickFormatter={axisTick} />
        <Tooltip
          cursor={{ fill: "#15211B", fillOpacity: 0.05 }}
          position={{ y: 8 }}
          offset={14}
          isAnimationActive={animate}
          animationDuration={120}
          content={(props) => <ChartTooltip active={props.active} payload={props.payload} series={series} hourly={hourly} />}
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="typer"
            fill={s.color}
            shape={(props: BarShapeProps) => renderSegment(props, s.key)}
            isAnimationActive={animate}
            animationDuration={550}
          />
        ))}
        {hasPrev ? (
          <Line
            dataKey="prev"
            name="Forrige periode"
            type="linear"
            stroke={PREV_COLOR}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            connectNulls={false}
            isAnimationActive={animate}
            animationDuration={550}
          />
        ) : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
