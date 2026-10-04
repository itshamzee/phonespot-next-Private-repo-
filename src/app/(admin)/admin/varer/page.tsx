import Link from "next/link";
import { staffScopeForPage } from "@/lib/auth/store-scope-page";
import { isOwner } from "@/lib/auth/store-scope";
import { resolveLocationId } from "@/lib/auth/store-scope-server";
import { OVERVIEW_PER_PAGE, canReceiveGoods, myStoreSlug, queryOverview } from "@/lib/stock/overview";
import { REASON_LABELS, queryMovements } from "@/lib/stock/movements";
import { formatWhen } from "@/lib/transfers/format";
import { getPendingTransfers } from "@/lib/transfers/summary";
import { VarerHeader } from "@/components/admin/varer/varer-header";
import { VarerList } from "@/components/admin/varer/varer-list";
import { VarerTabs, type VarerTab } from "@/components/admin/varer/varer-tabs";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Auth = NonNullable<Awaited<ReturnType<typeof staffScopeForPage>>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function VarerPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const auth = await staffScopeForPage();
  if (!auth) {
    return <p className="text-[15px] text-[#5E6A63]">Log ind som personale for at se varerne.</p>;
  }
  const { staff, scope } = auth;
  const mine = myStoreSlug(staff, scope);
  const fane: VarerTab =
    first(params.fane) === "bevaegelser" ? "bevaegelser" : first(params.fane) === "indkoeb" ? "indkoeb" : "varer";
  const pageNo = Math.max(1, Number(first(params.side)) || 1);

  // Antal åbne overførsler til fanen. Fejl her må ikke vælte siden.
  const pending = await openTransferCount(auth, mine).catch(() => 0);

  return (
    <div className="flex flex-col gap-5 text-[#15211B]">
      <VarerHeader canReceive={canReceiveGoods(staff)} isOwner={isOwner(staff)} defaultLocation={mine ?? "vejle"} />
      <VarerTabs active={fane} transferCount={pending} />

      {fane === "varer" && (
        <VarerTabContent staff={staff} q={first(params.q) ?? ""} kun={first(params.kun) === "1"} page={pageNo} mine={mine} />
      )}
      {fane === "bevaegelser" && <MovementsTab staff={staff} scope={scope} page={pageNo} />}
      {fane === "indkoeb" && (
        <section className="rounded-xl border border-[#E2E5E0] bg-white px-6 py-12 text-center">
          <p className="text-[16px] font-semibold">Indkøb kommer snart</p>
          <p className="mx-auto mt-1 max-w-[52ch] text-[14px] text-[#5E6A63]">
            Indkøbslisten (varer der skal bestilles hjem, også fra reparationssager) bygges som næste skridt. Indtil da bruger du
            &quot;Modtag varer&quot; til at lægge indkøbte varer på lager mod en faktura.
          </p>
        </section>
      )}
    </div>
  );
}

async function openTransferCount(auth: Auth, mine: string | null): Promise<number> {
  const { staff, scope } = auth;
  let target: string | null;
  if (isOwner(staff)) target = scope === "alle" ? "alle" : mine ? await resolveLocationId(mine) : null;
  else target = staff.location_id;
  if (!target) return 0;
  const p = await getPendingTransfers(target);
  // En butik er enten afsender eller modtager på en overførsel, så summen tæller ikke dobbelt.
  return p.incoming.count + p.outgoing.count;
}

async function VarerTabContent({
  staff,
  q,
  kun,
  page,
  mine,
}: {
  staff: Auth["staff"];
  q: string;
  kun: boolean;
  page: number;
  mine: ReturnType<typeof myStoreSlug>;
}) {
  const result = await queryOverview(staff, { q, onlyStore: kun ? mine : null, page, perPage: OVERVIEW_PER_PAGE });
  return (
    <VarerList
      rows={result.rows}
      total={result.total}
      page={result.page}
      perPage={result.perPage}
      q={q}
      kun={kun && !!mine}
      mine={mine}
      canSeeCost={result.canSeeCost}
    />
  );
}

async function MovementsTab({ staff, scope, page }: { staff: Auth["staff"]; scope: Auth["scope"]; page: number }) {
  const res = await queryMovements(staff, scope, { page });
  const pages = Math.max(1, Math.ceil(res.total / res.perPage));
  const href = (p: number) => `/admin/varer?fane=bevaegelser${p > 1 ? `&side=${p}` : ""}`;
  const cols = "grid grid-cols-[110px_minmax(0,1fr)_90px_70px_130px_minmax(0,1fr)] gap-3";
  const btn = "flex h-8 items-center rounded-lg border border-[#C9D0C7] px-3";
  return (
    <section className="flex flex-col gap-3.5 rounded-xl border border-[#E2E5E0] bg-white px-5 py-[18px]">
      <div className="overflow-x-auto">
        <div className="min-w-[760px] text-[14px]">
          <div className={`${cols} border-b border-[#E2E5E0] p-2 text-[13px] font-semibold text-[#5E6A63]`}>
            <span>Tidspunkt</span>
            <span>Vare</span>
            <span>Butik</span>
            <span className="text-right">Antal</span>
            <span>Årsag</span>
            <span>Note</span>
          </div>
          {res.rows.length === 0 && <p className="px-2 py-10 text-center text-[#5E6A63]">Ingen lagerbevægelser endnu.</p>}
          {res.rows.map((m) => {
            const note = [m.note, m.staffName].filter(Boolean).join(" · ");
            return (
              <div key={m.id} className={`${cols} items-center border-b border-[#EEF0EC] px-2 py-2.5`}>
                <span className="text-[#5E6A63]">{formatWhen(m.createdAt)}</span>
                <span className="truncate" title={m.itemName}>
                  {m.itemName}
                </span>
                <span>{m.locationName}</span>
                <span className={`text-right font-semibold tabular-nums ${m.qtyDelta < 0 ? "text-[#9A5B0A]" : "text-[#1A3D2E]"}`}>
                  {m.qtyDelta > 0 ? `+${m.qtyDelta}` : m.qtyDelta}
                </span>
                <span>{REASON_LABELS[m.reason] ?? m.reason}</span>
                <span className="truncate text-[#5E6A63]" title={note}>
                  {note}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between text-[13px] text-[#5E6A63]">
        <span>
          {res.total === 0 ? "Ingen" : `${(page - 1) * res.perPage + 1}–${Math.min(res.total, page * res.perPage)} af ${res.total}`}
        </span>
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link href={href(page - 1)} className={`${btn} text-[#15211B]`}>
              Forrige
            </Link>
          ) : (
            <span className={`${btn} opacity-40`}>Forrige</span>
          )}
          <span className="px-2 tabular-nums">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={href(page + 1)} className={`${btn} text-[#15211B]`}>
              Næste
            </Link>
          ) : (
            <span className={`${btn} opacity-40`}>Næste</span>
          )}
        </div>
      </div>
    </section>
  );
}
