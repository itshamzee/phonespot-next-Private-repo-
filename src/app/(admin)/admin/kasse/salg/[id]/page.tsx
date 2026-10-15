import Link from "next/link";
import { notFound } from "next/navigation";
import { formatOere } from "@/lib/cart/utils";
import { staffScopeForPage } from "@/lib/auth/store-scope-page";
import { loadLocationIndex } from "@/lib/auth/store-scope-server";
import { canAccessStore, slugForLocationId } from "@/lib/auth/store-scope";
import { uuidSchema } from "@/lib/pos/schemas";
import { loadSaleDetail } from "@/lib/pos/sales-history-data";
import { REFUND_LABELS, returUrl } from "@/lib/pos/sales-history";
import { formatSaleDate } from "../_components/sales-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Salg" };

const card = "rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm";
const btn =
  "inline-flex items-center rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-sm font-semibold text-[#1A3D2E] hover:bg-black/[0.03]";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const sale = await loadSaleDetail(id);
  if (!sale) notFound();

  const auth = await staffScopeForPage();
  const locations = await loadLocationIndex();
  if (!auth || !canAccessStore(auth.staff, slugForLocationId(locations, sale.locationId))) notFound();

  const { date, time } = formatSaleDate(sale.createdAt);
  const isCredit = sale.type === "credit_note";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/admin/kasse/salg" className="text-sm font-semibold text-[#1A3D2E] hover:text-[#2D6B45]">
        Tilbage til salgshistorik
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            {isCredit ? "Kreditnota" : "Bon"} {sale.receiptNumber}
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/40">
            {date} kl. {time}
            {sale.locationName ? ` · ${sale.locationName}` : ""}
            {sale.staffName ? ` · ${sale.staffName}` : ""}
          </p>
          {sale.refundState !== "ingen" && (
            <p className="mt-1 text-sm font-medium text-amber-700">
              {REFUND_LABELS[sale.refundState]} · {formatOere(sale.refunded)} tilbagebetalt
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/pos/receipt?order_id=${sale.id}`} target="_blank" rel="noreferrer" className={btn}>
            Udskriv kvittering
          </a>
          {!isCredit && sale.refundState !== "fuld" && (
            <Link href={returUrl(sale)} className={btn}>
              Retur
            </Link>
          )}
        </div>
      </div>

      <section className={card} aria-label="Varer">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-xs text-charcoal/50">
              <th className="pb-2 font-medium">Vare</th>
              <th className="pb-2 text-right font-medium">Antal</th>
              <th className="pb-2 text-right font-medium">Stykpris</th>
              <th className="pb-2 text-right font-medium">Linje</th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map((l) => (
              <tr key={l.id} className="border-b border-black/[0.04] last:border-0">
                <td className="py-2.5">
                  {l.name}
                  {l.caseNumber && l.caseId && (
                    <Link href={`/admin/reparationer/${l.caseId}`} className="ml-2 text-xs text-[#1A3D2E] hover:underline">
                      Sag {l.caseNumber}
                    </Link>
                  )}
                </td>
                <td className="py-2.5 text-right tabular-nums">{Math.abs(l.quantity)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatOere(l.unitPrice)}</td>
                <td className="py-2.5 text-right font-medium tabular-nums">{formatOere(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 space-y-1 text-sm">
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-charcoal/60">
              <dt>Rabat{sale.discountReason ? ` (${sale.discountReason})` : ""}</dt>
              <dd className="tabular-nums">-{formatOere(sale.discountAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-charcoal">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatOere(sale.total)}</dd>
          </div>
          <div className="flex justify-between text-charcoal/50">
            <dt>Heraf moms</dt>
            <dd className="tabular-nums">{formatOere(sale.vatTotal)}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className={card} aria-label="Betaling">
          <h3 className="text-sm font-semibold text-charcoal">Betaling</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {sale.payments.length === 0 && <li className="text-charcoal/40">Ingen betalingslinjer gemt</li>}
            {sale.payments.map((p, i) => (
              <li key={i} className="flex justify-between">
                <span className="text-charcoal/70">
                  {p.label}
                  {p.reference ? ` · ${p.reference}` : ""}
                </span>
                <span className="tabular-nums">{formatOere(p.amount)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={card} aria-label="Kunde">
          <h3 className="text-sm font-semibold text-charcoal">Kunde</h3>
          {sale.customer ? (
            <div className="mt-2 text-sm text-charcoal/70">
              <Link href={`/admin/kunder/${sale.customer.id}`} className="font-medium text-[#1A3D2E] hover:underline">
                {sale.customer.name?.trim() || "Kunde uden navn"}
              </Link>
              {sale.customer.phone && <p>{sale.customer.phone}</p>}
              {sale.customer.email && <p>{sale.customer.email}</p>}
            </div>
          ) : (
            <p className="mt-2 text-sm text-charcoal/40">Kunde uden navn</p>
          )}
          {sale.cases.length > 0 && (
            <p className="mt-3 text-sm text-charcoal/70">
              Reparationssag:{" "}
              {sale.cases.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ", "}
                  <Link href={`/admin/reparationer/${c.id}`} className="font-medium text-[#1A3D2E] hover:underline">
                    {c.label}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </section>
      </div>

      {(sale.notes || sale.creditReason || sale.originalOrder || sale.creditNotes.length > 0) && (
        <section className={card} aria-label="Noter og returneringer">
          {sale.originalOrder && (
            <p className="text-sm text-charcoal/70">
              Retur af{" "}
              <Link href={`/admin/kasse/salg/${sale.originalOrder.id}`} className="font-medium text-[#1A3D2E] hover:underline">
                bon {sale.originalOrder.receiptNumber}
              </Link>
              {sale.creditReason ? ` · ${sale.creditReason}` : ""}
            </p>
          )}
          {sale.notes && <p className="text-sm text-charcoal/70">{sale.notes}</p>}
          {sale.creditNotes.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-charcoal/70">
              {sale.creditNotes.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/kasse/salg/${c.id}`} className="font-medium text-[#1A3D2E] hover:underline">
                    Kreditnota {c.receiptNumber}
                  </Link>{" "}
                  · {formatOere(Math.abs(c.total))}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
