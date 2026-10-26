import Link from "next/link";
import { SCOPE_LABELS } from "@/lib/auth/store-scope";
import type { StoreOverview } from "@/lib/admin/overview/load";
import { formatKr, readyLabel } from "@/lib/admin/overview/format";
import { OVERBLIK_PERIODS } from "@/lib/admin/overview/period";
import { Empty, KpiCard, KpiGrid, linkClass, PageHeading, Panel, PanelGrid, PeriodToggle, Row } from "./parts";
import { WebBookingsPanel } from "./web-bookings-panel";
import { WebshopOrdersPanel } from "./webshop-orders-panel";

/** Overblik for én butik: hilsen, nye reparationsanmodninger, fire nøgletal og to paneler. */
export function StoreOverviewView({ data }: { data: StoreOverview }) {
  const { kpis, cash, scope } = data;
  const hasCash = cash.state !== "none" || scope === "vejle" || scope === "slagelse";
  const heading = scope === "ingen" ? "Hej" : `Hej ${SCOPE_LABELS[scope]}`;

  if (scope === "ingen") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading>{heading}</PageHeading>
        <p className="m-0 max-w-[560px] text-[15px] text-[#5E6A63]">
          Din bruger er ikke knyttet til en butik endnu. Bed ejeren tildele dig Vejle, Slagelse eller Webshop under Indstillinger.
        </p>
      </div>
    );
  }

  const delta = data.revenueDeltaPct;
  const deltaNote =
    delta === null ? undefined : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta)} % ${data.range.compareLabel}`;

  const isWebshop = scope === "webshop";
  const bookings = data.webBookings;
  // Webshoppen håndterer ordrer først; reparationsanmodninger vises kun, hvis der er nogen.
  const showBookingsLate = isWebshop && (bookings.groups.length > 0 || bookings.stale > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading aside={<PeriodToggle periods={OVERBLIK_PERIODS} current={data.period} basePath="/admin" />}>
        {heading}
      </PageHeading>

      {isWebshop ? <WebshopOrdersPanel data={data.webshopOrders} /> : <WebBookingsPanel data={bookings} />}

      <KpiGrid>
        <KpiCard
          label="Omsætning inkl. moms"
          value={formatKr(kpis.revenue)}
          note={deltaNote}
          tone={delta !== null && delta > 0 ? "positive" : delta !== null && delta < 0 ? "warning" : "muted"}
        />
        <KpiCard
          label="Antal salg"
          value={kpis.salesCount}
          note={kpis.salesCount > 0 ? `Gns. kurv ${formatKr(kpis.avgBasket)}` : "Ingen salg endnu"}
        />
        <KpiCard
          label="Profit"
          value={formatKr(kpis.profit)}
          note={kpis.marginPct !== null ? `${kpis.marginPct} % af omsætning` : undefined}
        />
        {hasCash ? (
          <KpiCard
            label="Kassen"
            value={cash.state === "open" ? "Åben" : cash.state === "closed" ? "Lukket" : "–"}
            note={cash.detail}
          />
        ) : null}
      </KpiGrid>
      <p className="m-0 -mt-3 text-[12px] text-[#5E6A63]">
        Profit er omsætning ekskl. moms (brugtmoms fratrukket) minus kostpris. Depositum indgår ikke, før det er afregnet.
      </p>

      {showBookingsLate ? <WebBookingsPanel data={bookings} /> : null}

      <PanelGrid>
        <Panel
          title="Klar til afhentning"
          aside={
            <Link href="/admin/reparationer" className={linkClass}>
              Se alle ({data.ready.total})
            </Link>
          }
        >
          {data.ready.items.length === 0 ? (
            <Empty>Ingen sager venter på afhentning.</Empty>
          ) : (
            data.ready.items.map((c) => (
              <Row
                key={c.id}
                aside={<span className={c.overdue ? "text-[#9A5B0A]" : "text-[#5E6A63]"}>{readyLabel(c.days)}</span>}
              >
                <Link href={`/admin/reparationer/${c.id}`} className="text-inherit no-underline hover:underline">
                  <b>{c.label}</b> {c.title}
                </Link>
              </Row>
            ))
          )}
        </Panel>

        <Panel
          title="Overførsler"
          aside={
            <Link href="/admin/varer/overforsler" className={linkClass}>
              Åbn
            </Link>
          }
        >
          {data.transfers.length === 0 ? (
            <Empty>Ingen overførsler på vej.</Empty>
          ) : (
            data.transfers.map((t) => (
              <Row
                key={t.id}
                aside={
                  t.action ? (
                    <Link href="/admin/varer/overforsler" className={linkClass}>
                      {t.action}
                    </Link>
                  ) : null
                }
              >
                {t.text}
              </Row>
            ))
          )}
        </Panel>
      </PanelGrid>
    </div>
  );
}
