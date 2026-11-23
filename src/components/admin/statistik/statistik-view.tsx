import type { StatPayload } from "@/lib/admin/statistik/payload";
import { PageHeading } from "@/components/admin/overview/parts";
import { ChartPanel } from "./chart-panel";
import { BusyRegion, ExportControl, PeriodSelector, RangeLabel, RangeStepper, StatNavProvider, StoreSelector } from "./controls";
import { NowBlock } from "./now-block";
import {
  BuybackPanel,
  ProfitPanel,
  RepairsPanel,
  StaffPanel,
  StockPanel,
  StoresAndPaymentsPanel,
  TopPanel,
  WebshopPanel,
} from "./panels";
import type { Metric } from "./shared";
import "./statistik.css";

/**
 * Statistik-siden (server component). Sætter "Lige nu", vælgerne, grafen og
 * panelerne sammen efter docs/design/admin-2026-11/Statistik.html. Alt, der
 * vises, kommer fra payloaden, som allerede er afgrænset og skåret til på serveren.
 */
export function StatistikView({
  payload,
  metric,
  today,
}: {
  payload: StatPayload;
  metric: Metric;
  /** Dansk dato i dag (YYYY-MM-DD), øverste grænse i datovælgeren. */
  today: string;
}) {
  const { viewer } = payload;
  const grid3 = "grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6";

  return (
    <StatNavProvider>
      <div className="stat-page mx-auto flex max-w-[1320px] flex-col gap-5 text-[15px] leading-normal text-[#15211B] min-[980px]:gap-7">
        <PageHeading
          aside={
            <div className="flex max-w-full flex-wrap items-center gap-3">
              <StoreSelector stores={payload.stores} current={viewer.scope} />
              <RangeLabel range={payload.range} />
              <ExportControl viewer={viewer} range={payload.range} />
            </div>
          }
        >
          Statistik
        </PageHeading>

        <BusyRegion>
          <NowBlock initial={payload.now} isOwner={viewer.isOwner} butik={viewer.scope} />
        </BusyRegion>

        <p className="stat-noprint m-0 mb-[-8px] mt-5 text-[15px] font-medium text-[#5E6A63]">Vælg periode for resten af siden</p>
        {/* Under 980px står bladreren på sin egen række over periodevælgeren. */}
        <div className="flex flex-col gap-3 min-[980px]:flex-row min-[980px]:flex-wrap min-[980px]:items-center min-[980px]:justify-between">
          <PeriodSelector range={payload.range} minDate={payload.minDate} today={today} />
          <div className="max-[979px]:order-first">
            <RangeStepper range={payload.range} minDate={payload.minDate} today={today} />
          </div>
        </div>

        <BusyRegion className="flex flex-col gap-5 min-[980px]:gap-7">
          <div className="grid grid-cols-1 gap-6 min-[980px]:grid-cols-[2fr_1fr]">
            <ChartPanel payload={payload} metric={metric} />
            <StoresAndPaymentsPanel payload={payload} metric={metric} />
          </div>

          {viewer.isOwner && payload.categories && payload.staff ? (
            <div className="grid grid-cols-1 gap-6 min-[980px]:grid-cols-[1fr_1.7fr]">
              <ProfitPanel payload={payload} />
              <StaffPanel payload={payload} />
            </div>
          ) : null}

          <div className={grid3}>
            <TopPanel payload={payload} />
            <RepairsPanel payload={payload} />
            <BuybackPanel payload={payload} />
          </div>

          <div className={grid3}>
            <WebshopPanel payload={payload} />
            <StockPanel payload={payload} />
          </div>
        </BusyRegion>
      </div>
    </StatNavProvider>
  );
}
