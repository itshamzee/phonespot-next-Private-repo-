import type { ReactNode } from "react";
import type { Money, StatPayload } from "@/lib/admin/statistik/payload";
import { CountUp } from "./count-up";
import { int, kr, longDate, pct } from "./format";
import { cardClass, h2Class } from "./styles";
import { TopList } from "./top-list";

/**
 * Panelerne under grafen (server components). Ejer-panelerne (Fortjeneste og
 * margin, Medarbejdere, lagerværdi) findes kun, når payloaden har felterne;
 * for andre end ejeren er de skåret fra på serveren og vises slet ikke.
 */

type Metric = "omsaetning" | "fortjeneste";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

/* ------------------------------------------------------------------ */
/*  Små byggeklodser                                                   */
/* ------------------------------------------------------------------ */

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="ml-2.5 rounded-md border border-[#E2E5E0] px-2 py-0.5 align-middle text-[12px] font-medium text-[#5E6A63]">{children}</span>
  );
}

function Card({ title, tag, aside, delayMs = 0, children }: { title: string; tag?: string; aside?: ReactNode; delayMs?: number; children: ReactNode }) {
  return (
    <section aria-label={title} className={cardClass} style={delay(delayMs)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={h2Class}>
          {title}
          {tag ? <Tag>{tag}</Tag> : null}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Kv({ children }: { children: ReactNode }) {
  return <div className="mt-5 grid grid-cols-2 gap-6">{children}</div>;
}

function KvItem({ label, children, tone }: { label: string; children: ReactNode; tone?: "warn" }) {
  return (
    <div>
      <span className="text-[#5E6A63]">{label}</span>
      <b className={`mt-0.5 block text-[24px] tabular-nums ${tone === "warn" ? "text-[#9A5B0A]" : ""}`}>{children}</b>
    </div>
  );
}

function List({ children, className = "mt-[22px]" }: { children: ReactNode; className?: string }) {
  return <div className={`${className} [&>*+*]:border-t [&>*+*]:border-[#EEF0EC]`}>{children}</div>;
}

function Li({ label, children }: { label: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3.5 py-3.5">
      <span className="min-w-0">{label}</span>
      {children !== undefined ? <span className="shrink-0 text-right">{children}</span> : null}
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <p className="m-0 py-3.5 text-[14px] text-[#5E6A63]">{children}</p>;
}

/** Vandrette søjler med navn, spor og beløb (Fordelt på butik, Betalingsform). */
function BarList({ rows, empty }: { rows: { label: string; value: number }[]; empty: string }) {
  if (rows.length === 0) return <Muted>{empty}</Muted>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="mt-3 [&>*+*]:border-t [&>*+*]:border-[#EEF0EC]">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3 py-3.5">
          <span className="w-24 shrink-0">{r.label}</span>
          <span aria-hidden className="h-2 flex-1 overflow-hidden rounded bg-[#EEF0EC]">
            <span className="stat-grow-x block h-full rounded bg-[#5A8C6F]" style={{ width: `${(Math.max(0, r.value) / max) * 100}%`, ...delay(i * 50) }} />
          </span>
          <span className="w-[104px] shrink-0 text-right font-semibold tabular-nums">{kr(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Lille margin-søjle foran en procent. */
function MarginBar({ pctValue, index }: { pctValue: number | null; index: number }) {
  const width = Math.min(100, Math.max(0, pctValue ?? 0));
  return (
    <span aria-hidden className="mr-2 inline-block h-1.5 w-14 overflow-hidden rounded-[3px] bg-[#EEF0EC] align-middle">
      <span className="stat-grow-x block h-full bg-[#5A8C6F]" style={{ width: `${width}%`, ...delay(index * 60) }} />
    </span>
  );
}

const metricValue = (m: Money, metric: Metric) => (metric === "fortjeneste" ? (m.profit ?? 0) : m.revenue);

/* ------------------------------------------------------------------ */
/*  Butik og betaling                                                  */
/* ------------------------------------------------------------------ */

export function StoresAndPaymentsPanel({ payload, metric }: { payload: StatPayload; metric: Metric }) {
  return (
    <section aria-label="Fordelt på butik og betalingsform" className={cardClass} style={delay(60)}>
      <h2 className={h2Class}>Fordelt på butik</h2>
      <BarList rows={payload.byStore.map((s) => ({ label: s.label, value: metricValue(s.money, metric) }))} empty="Ingen salg." />
      <h2 className={`${h2Class} mt-[34px]`}>Betalingsform</h2>
      <BarList rows={payload.payments.map((p) => ({ label: p.label, value: p.amount }))} empty="Ingen betalinger." />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Ejer: fortjeneste og medarbejdere                                  */
/* ------------------------------------------------------------------ */

export function ProfitPanel({ payload }: { payload: StatPayload }) {
  const { total, categories = [], missingCost = 0 } = payload;
  return (
    <Card title="Fortjeneste og margin">
      <Kv>
        <KvItem label="Fortjeneste uden moms">
          <CountUp value={total.profit ?? 0} />
        </KvItem>
        <KvItem label="Margin">{total.marginPct == null ? "–" : <CountUp value={total.marginPct} format="pct" />}</KvItem>
      </Kv>
      <List>
        {categories.map((c, i) => (
          <Li
            key={c.category}
            label={
              <>
                {c.label}
                <small className="block text-[13px] text-[#5E6A63] tabular-nums">Omsætning {kr(c.money.revenue)}</small>
              </>
            }
          >
            <b className="tabular-nums">{kr(c.money.profit)}</b>
            <small className="block text-[13px] text-[#5E6A63] tabular-nums">
              <MarginBar pctValue={c.money.marginPct} index={i} />
              {pct(c.money.marginPct)}
            </small>
          </Li>
        ))}
        {missingCost > 0 ? (
          <Li label={<span className="text-[#5E6A63]">{missingCost === 1 ? "1 solgt vare mangler kostpris" : `${int(missingCost)} solgte varer mangler kostpris`}</span>} />
        ) : null}
      </List>
    </Card>
  );
}

export function StaffPanel({ payload }: { payload: StatPayload }) {
  const staff = payload.staff ?? [];
  const th = "py-2.5 pl-4 text-right text-[13px] font-medium text-[#5E6A63] first:pl-0 first:text-left";
  const td = "border-t border-[#EEF0EC] py-[15px] pl-4 text-right tabular-nums first:pl-0 first:text-left";
  return (
    <Card
      title="Medarbejdere"
      delayMs={60}
      aside={<span className="text-[13px] text-[#5E6A63]">Salg i kassen og egne reparationer</span>}
    >
      <div className="overflow-x-auto">
        <table className="mt-3.5 w-full min-w-[560px] border-collapse text-[15px]">
          <thead>
            <tr>
              <th scope="col" className={th}>Medarbejder</th>
              <th scope="col" className={th}>Salg</th>
              <th scope="col" className={th}>Reparationer</th>
              <th scope="col" className={th}>Omsætning</th>
              <th scope="col" className={th}>Fortjeneste</th>
              <th scope="col" className={th}>Margin</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={6} className={`${td} text-[#5E6A63]`}>
                  {payload.viewer.scope === "webshop" ? "Webshop-ordrer har ingen medarbejder tilknyttet." : "Ingen salg i kassen i perioden."}
                </td>
              </tr>
            ) : (
              staff.map((s, i) => (
                <tr key={`${s.name}-${i}`} className="motion-safe:transition-colors hover:bg-[#FAFBF9]">
                  <td className={td}>
                    <span aria-hidden className="mr-2.5 inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#E9ECE7] text-[13px] font-semibold">
                      {s.name.slice(0, 1).toUpperCase()}
                    </span>
                    <b>{s.name}</b>
                    {s.store ? <span className="text-[#5E6A63]"> · {s.store}</span> : null}
                  </td>
                  <td className={td}>{int(s.sales)}</td>
                  <td className={td}>{int(s.repairs)}</td>
                  <td className={td}>{kr(s.money.revenue)}</td>
                  <td className={td}>
                    <b>{kr(s.money.profit)}</b>
                  </td>
                  <td className={td}>
                    <MarginBar pctValue={s.money.marginPct} index={i} />
                    {pct(s.money.marginPct)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Mest solgte, reparationer, opkøb                                   */
/* ------------------------------------------------------------------ */

export function TopPanel({ payload }: { payload: StatPayload }) {
  return (
    <section aria-label="Mest solgte" className={cardClass}>
      <TopList items={payload.top} isOwner={payload.viewer.isOwner} />
    </section>
  );
}

export function RepairsPanel({ payload }: { payload: StatPayload }) {
  const { repairs } = payload;
  return (
    <Card title="Reparationer" delayMs={50}>
      <Kv>
        <KvItem label="Betalte sager">
          <CountUp value={repairs.paidCases} format="int" />
        </KvItem>
        <KvItem label="Omsætning">
          <CountUp value={repairs.money.revenue} />
        </KvItem>
        {payload.viewer.isOwner && repairs.money.profit !== undefined ? (
          <KvItem label="Fortjeneste">
            <CountUp value={repairs.money.profit} />
          </KvItem>
        ) : null}
        <KvItem label="Åbne sager nu">
          <CountUp value={repairs.openNow} format="int" />
        </KvItem>
      </Kv>
      {repairs.byType.length > 0 || repairs.prepaidWithoutAmount > 0 ? (
        <List>
          {repairs.byType.map((t) => (
            <Li key={t.label} label={t.label}>
              <b className="tabular-nums">{t.sharePct} %</b>
            </Li>
          ))}
          {repairs.prepaidWithoutAmount > 0 ? (
            <Li
              label={
                <span className="text-[#5E6A63]">
                  {repairs.prepaidWithoutAmount === 1 ? "1 forudbetalt sag uden beløb" : `${int(repairs.prepaidWithoutAmount)} forudbetalte sager uden beløb`}
                </span>
              }
            />
          ) : null}
        </List>
      ) : null}
    </Card>
  );
}

export function BuybackPanel({ payload }: { payload: StatPayload }) {
  const { buyback, range } = payload;
  // Hele perioden ligger før slutsedlerne: ingen tal at vise, kun hvorfra de findes.
  const noData = buyback.dataFrom != null && range.to < buyback.dataFrom;
  return (
    <Card title="Opkøb" tag="penge ud" delayMs={100}>
      {noData ? null : (
        <Kv>
          <KvItem label="Udbetalt">
            <CountUp value={buyback.paidOut} />
          </KvItem>
          <KvItem label="Slutsedler">
            <CountUp value={buyback.receipts} format="int" />
          </KvItem>
          <KvItem label="Tilbud sendt">
            <CountUp value={buyback.offersSent} format="int" />
          </KvItem>
          <KvItem label="Accepteret">{buyback.acceptedPct == null ? "–" : `${Math.round(buyback.acceptedPct)} %`}</KvItem>
        </Kv>
      )}
      <List>
        {noData ? null : (
          <Li label="Modregnet">
            <b className="tabular-nums">{kr(buyback.offset)}</b>
          </Li>
        )}
        {noData
          ? null
          : buyback.byStore.map((s) => (
              <Li key={s.label} label={s.label}>
                <b className="tabular-nums">{kr(s.amount)}</b>
              </Li>
            ))}
        {buyback.dataFrom ? <Li label={<span className="text-[#5E6A63]">Slutsedler findes fra {longDate(buyback.dataFrom)}</span>} /> : null}
      </List>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Webshop og lager                                                   */
/* ------------------------------------------------------------------ */

export function WebshopPanel({ payload }: { payload: StatPayload }) {
  const { webshop } = payload;
  const visits = webshop.visits;
  const share = (n: number) => (visits && visits > 0 ? Math.min(100, (n / visits) * 100) : 0);
  const steps =
    visits == null
      ? null
      : [
          { label: "Besøg", value: visits, width: visits > 0 ? 100 : 0 },
          { label: "Lagt i kurv", value: webshop.addToCart ?? 0, width: share(webshop.addToCart ?? 0) },
          { label: "Købt", value: webshop.purchases, width: share(webshop.purchases) },
        ];
  return (
    <Card title="Webshop">
      {steps ? (
        <div className="mt-4">
          {steps.map((s, i) => (
            <div key={s.label}>
              <div className="pb-0.5 pt-2">
                <span
                  aria-hidden
                  className={`stat-grow-x block h-[26px] rounded-md ${i === steps.length - 1 ? "bg-[#1A3D2E]" : "bg-[#B9CFC0]"}`}
                  style={{ width: `${s.width}%`, ...delay(i * 60) }}
                />
              </div>
              <div className="text-[#5E6A63]">
                {s.label} <b className="text-[#15211B] tabular-nums">{int(s.value)}</b>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <List className="mt-5">
        {steps ? null : (
          <Li label="Købt">
            <b className="tabular-nums">{int(webshop.purchases)}</b>
          </Li>
        )}
        <Li label="Forladte kurve i perioden">
          <b className="tabular-nums">{int(webshop.abandoned)}</b>
        </Li>
        <Li label="Gns. ordre">
          <b className="tabular-nums">{kr(webshop.avgOrder)}</b>
        </Li>
      </List>
    </Card>
  );
}

export function StockPanel({ payload }: { payload: StatPayload }) {
  const { stock } = payload;
  return (
    <Card title="Lager" tag="lige nu" delayMs={50}>
      <Kv>
        <KvItem label="Enheder på lager">
          <CountUp value={stock.units} format="int" />
        </KvItem>
        {stock.costValue !== undefined ? (
          <KvItem label="Lagerværdi, kostpris">
            <CountUp value={stock.costValue} />
          </KvItem>
        ) : null}
        <KvItem label="Gns. dage på lager">{stock.avgDays == null ? "–" : int(stock.avgDays)}</KvItem>
        <KvItem label="Over 60 dage" tone={stock.over60 > 0 ? "warn" : undefined}>
          {int(stock.over60)}
        </KvItem>
      </Kv>
      <List>
        <Li label="Udsolgte modeller">
          <b className="tabular-nums">{int(stock.soldOutModels)}</b>
        </Li>
        <Li label="Kun 1 tilbage">
          <b className="tabular-nums">{int(stock.oneLeftModels)}</b>
        </Li>
        {stock.accessoryCostValue !== undefined ? (
          <Li label="Tilbehør, lagerværdi">
            <b className="tabular-nums">{kr(stock.accessoryCostValue)}</b>
          </Li>
        ) : null}
      </List>
    </Card>
  );
}
