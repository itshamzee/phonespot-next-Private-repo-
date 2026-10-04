import Link from "next/link";
import type { AllOverview, StoreRow } from "@/lib/admin/overview/load";
import { formatKr, formatShortDate } from "@/lib/admin/overview/format";
import { PERIOD_PHRASE, type PeriodKey } from "@/lib/admin/overview/period";
import { copenhagenDateString } from "@/lib/pos/copenhagen";
import { Empty, linkClass, PageHeading, Panel, PanelGrid, PeriodToggle, Row } from "./parts";

const COLS = "grid grid-cols-[1fr_repeat(5,120px)] gap-3";

function TableRow({ row, strong = false }: { row: StoreRow; strong?: boolean }) {
  return (
    <div className={`${COLS} ${strong ? "py-3 font-bold" : "border-b border-[#EEF0EC] py-3"}`}>
      {strong ? <span>{row.label}</span> : <b>{row.label}</b>}
      <span className="text-right">{formatKr(row.revenue)}</span>
      <span className="text-right">{formatKr(row.profit)}</span>
      <span className="text-right">{row.salesCount}</span>
      <span className="text-right">{row.openCases}</span>
      <span className="text-right">{row.cash}</span>
    </div>
  );
}

/**
 * Ejerens samlede visning: tabel pr. butik, dagsopgørelser, moms og det der
 * kræver opmærksomhed. Bruges af Overblik (scope = alle) og af Økonomi, som
 * blot giver længere perioder.
 */
export function AllStoresOverviewView({
  data,
  title = "Alle butikker",
  periods,
  basePath,
}: {
  data: AllOverview;
  title?: string;
  periods: PeriodKey[];
  basePath: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeading aside={<PeriodToggle periods={periods} current={data.period} basePath={basePath} />}>{title}</PageHeading>

      <section className="min-w-0 rounded-xl border border-[#E2E5E0] bg-white px-5 py-[18px]">
        <h2 className="m-0 mb-3 text-[17px] font-bold">Pr. butik</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[760px] text-[14px] tabular-nums">
            <div className={`${COLS} border-b border-[#E2E5E0] py-2 text-[13px] font-semibold text-[#5E6A63]`}>
              <span>Butik</span>
              <span className="text-right">Omsætning</span>
              <span className="text-right">Profit</span>
              <span className="text-right">Salg</span>
              <span className="text-right">Åbne sager</span>
              <span className="text-right">Kasse</span>
            </div>
            {data.stores.map((row) => (
              <TableRow key={row.slug} row={row} />
            ))}
            <TableRow row={data.total} strong />
          </div>
        </div>
        <p className="m-0 mt-2 text-[12px] text-[#5E6A63]">
          Omsætning er inkl. moms. Profit er ekskl. moms (brugtmoms fratrukket) minus kostpris.
        </p>
      </section>

      <PanelGrid>
        <Panel title="Dagsopgørelser">
          {data.sessions.length === 0 ? (
            <Empty>Ingen afsluttede kasser endnu.</Empty>
          ) : (
            data.sessions.map((s) => {
              const day = copenhagenDateString(s.date);
              const base = `/api/pos/daily-summary?register_id=${s.registerId}&date=${day}`;
              return (
                <Row
                  key={s.key}
                  aside={
                    <span className="flex flex-col items-end gap-0.5">
                      {s.difference !== 0 ? (
                        <span className="text-[#9A5B0A]">Difference {formatKr(s.difference)}</span>
                      ) : (
                        <span>{s.locked ? "Låst · " : "Ikke låst · "}difference 0 kr.</span>
                      )}
                      <span className="text-[13px]">
                        <a href={`${base}&format=pdf`} className={linkClass}>
                          PDF
                        </a>{" "}
                        <a href={`${base}&format=csv`} className={linkClass}>
                          CSV
                        </a>
                      </span>
                    </span>
                  }
                >
                  {s.store} {"·"} {s.register} {"·"} {formatShortDate(s.date)}
                </Row>
              );
            })
          )}
          <p className="m-0 border-t border-[#EEF0EC] pt-2.5 text-[13px] text-[#5E6A63]">
            Hent til Dinero som PDF og CSV pr. kasse.
          </p>
        </Panel>

        <Panel title={`Moms ${PERIOD_PHRASE[data.period]}`}>
          <Row aside={formatKr(data.vat.vatStandard)}>Standardmoms (25 %)</Row>
          <Row aside={formatKr(data.vat.brugtmoms)}>Brugtmoms (brugt elektronik)</Row>
          {data.vat.deposits !== 0 ? (
            <Row aside={formatKr(data.vat.deposits)}>Depositum modtaget (ikke indtægt endnu)</Row>
          ) : null}
        </Panel>

        <Panel title="Kræver opmærksomhed">
          {data.attention.length === 0 ? (
            <Empty>Intet kræver opmærksomhed lige nu.</Empty>
          ) : (
            data.attention.map((a) => (
              <div key={a.key} className="border-t border-[#EEF0EC] py-2.5 text-[14px]">
                <Link href={a.href} className="text-inherit no-underline hover:underline">
                  {a.text}
                </Link>
              </div>
            ))
          )}
        </Panel>
      </PanelGrid>
    </div>
  );
}
