import type { Money, StatPayload } from "@/lib/admin/statistik/payload";
import { CountUp } from "./count-up";
import { Delta } from "./delta";
import { kr } from "./format";
import { cardClass, h2Class } from "./styles";

/**
 * Midlertidig graf: periodens total og en enkel tabel over intervallerne.
 * Task 7 erstatter indholdet med den interaktive graf (samme props).
 */

type Metric = "omsaetning" | "fortjeneste";

const STREAMS = [
  { key: "webshop", label: "Webshop" },
  { key: "kasse", label: "Kassesalg" },
  { key: "reparation", label: "Reparation" },
] as const;

const value = (m: Money, metric: Metric) => (metric === "fortjeneste" ? (m.profit ?? 0) : m.revenue);

export function ChartPanel({ payload, metric }: { payload: StatPayload; metric: Metric }) {
  const { total, series, range, notes } = payload;
  const title = metric === "fortjeneste" ? "Fortjeneste over tid" : "Omsætning over tid";
  const totalValue = metric === "fortjeneste" ? (total.profit ?? 0) : total.revenue;
  const delta = metric === "fortjeneste" ? total.profitDeltaPct : total.deltaPct;
  const showPrev = series.some((s) => (metric === "fortjeneste" ? s.prevProfit : s.prevRevenue) != null);
  const empty = series.every((s) => STREAMS.every(({ key }) => s[key].revenue === 0 && (s[key].profit ?? 0) === 0));

  return (
    <section aria-label={title} className={cardClass}>
      <h2 className={h2Class}>{title}</h2>
      <div className="mt-2 text-[34px] font-bold tracking-[-0.02em] tabular-nums">
        <CountUp value={totalValue} />
      </div>
      <div className="mt-1">
        <Delta value={delta} /> <span className="text-[#5E6A63]">{range.compareLabel}</span>
      </div>
      {notes.partialRefunds > 0 ? (
        <p className="m-0 mt-1 text-[13px] text-[#5E6A63]">Delvist refunderet i perioden: {kr(notes.partialRefunds)}</p>
      ) : null}

      {empty ? (
        <p className="m-0 mt-[22px] py-10 text-center text-[14px] text-[#5E6A63]">Ingen salg i perioden</p>
      ) : (
        <div className="mt-[22px] overflow-x-auto">
          <table className="w-full border-collapse text-[14px] tabular-nums">
            <caption className="sr-only">{title} pr. interval</caption>
            <thead>
              <tr>
                <th scope="col" className="py-2.5 text-left text-[13px] font-medium text-[#5E6A63]">Periode</th>
                {STREAMS.map((s) => (
                  <th key={s.key} scope="col" className="py-2.5 pl-4 text-right text-[13px] font-medium text-[#5E6A63]">{s.label}</th>
                ))}
                <th scope="col" className="py-2.5 pl-4 text-right text-[13px] font-medium text-[#5E6A63]">I alt</th>
                {showPrev ? (
                  <th scope="col" className="py-2.5 pl-4 text-right text-[13px] font-medium text-[#5E6A63]">Forrige periode</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {series.map((s) => {
                const prev = metric === "fortjeneste" ? s.prevProfit : s.prevRevenue;
                const sum = STREAMS.reduce((a, { key }) => a + value(s[key], metric), 0);
                return (
                  <tr key={s.key}>
                    <th scope="row" className="border-t border-[#EEF0EC] py-2.5 text-left font-normal">{s.label}</th>
                    {STREAMS.map(({ key }) => (
                      <td key={key} className="border-t border-[#EEF0EC] py-2.5 pl-4 text-right">{kr(value(s[key], metric))}</td>
                    ))}
                    <td className="border-t border-[#EEF0EC] py-2.5 pl-4 text-right font-semibold">{kr(sum)}</td>
                    {showPrev ? (
                      <td className="border-t border-[#EEF0EC] py-2.5 pl-4 text-right text-[#5E6A63]">{prev == null ? "–" : kr(prev)}</td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
