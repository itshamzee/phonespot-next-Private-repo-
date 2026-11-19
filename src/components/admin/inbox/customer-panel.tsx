"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/admin/ui";
import { CHANNEL_LABELS, formatKr, matchedByLabel, type CustomerInfo, type InboxDetail, type ThreadDraft } from "./inbox-helpers";
import { STATUS_LABELS } from "@/lib/repairs/status-labels";
import { storeName } from "./saved-replies";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", day: "numeric", month: "short", year: "numeric" }).format(d);
};
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(", ");

export interface CustomerPanelProps {
  detail: InboxDetail | null;
  customer: CustomerInfo | null;
  error: string | null;
  /** Udkastet, hvis forklaring vises for en ukendt afsender. */
  draft: ThreadDraft | null;
  onOpenConversation: (id: string) => void;
  /** Kun i skuffen (under 1240 px). */
  onClose?: () => void;
}

/** Kundekortet: kontakt og historik fra /customer, eller forklaringen for en ukendt afsender. */
export function CustomerPanel({ detail, customer, error, draft, onOpenConversation, onClose }: CustomerPanelProps) {
  const inq = detail?.inquiry ?? null;
  const isPublic = inq?.channel === "google_review" || inq?.channel === "trustpilot_review";
  const store = storeName(inq?.store_id);

  let body: ReactNode;
  if (!inq) {
    body = <p className="m-0 text-[13px] text-[#5E6A63]">Vælg en samtale for at se kunden her.</p>;
  } else if (isPublic) {
    body = (
      <>
        <h3 className="m-0 text-[16px] font-semibold">Offentlig anmeldelse</h3>
        <p className="m-0 text-[13px] text-[#5E6A63]">{join(CHANNEL_LABELS[inq.channel ?? ""], store)}</p>
        <p className="m-0 mt-3 rounded-lg bg-[#FFF4E5] px-[11px] py-[9px] text-[13px] text-[#8A4B08]">
          Anmeldelser kobles ikke til en kunde. Svaret kan læses af alle.
        </p>
      </>
    );
  } else if (error) {
    body = (
      <p role="alert" className="m-0 rounded-lg bg-[#FDECEC] p-3 text-[13px] text-[#B42318]">
        {error}
      </p>
    );
  } else if (!customer) {
    body = (
      <div data-skeleton aria-label="Henter kunden" className="flex flex-col gap-2">
        <span className="sr-only">Henter kunden...</span>
        <Skeleton className="h-5 w-2/3 rounded-md" />
        <Skeleton className="h-3.5 w-1/2 rounded-md" />
        <Skeleton className="mt-3 h-14 w-full rounded-lg" />
      </div>
    );
  } else {
    const found = matchedByLabel(customer.matchedBy);
    const email = customer.email ?? inq.email;
    const phone = customer.phone ?? inq.phone;
    body = (
      <>
        <h3 className="m-0 text-[16px] font-semibold">{customer.name || inq.name || "Ukendt afsender"}</h3>
        {customer.known && found && <p className="m-0 text-[13px] text-[#5E6A63]">{found}</p>}
        <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-[3px] text-[13px]">
          {email && (
            <>
              <dt className="text-[#5E6A63]">Mail</dt>
              <dd className="m-0 [overflow-wrap:anywhere]">{email}</dd>
            </>
          )}
          {phone && (
            <>
              <dt className="text-[#5E6A63]">Telefon</dt>
              <dd className="m-0 tabular-nums">{phone}</dd>
            </>
          )}
          <dt className="text-[#5E6A63]">Butik</dt>
          <dd className="m-0">{store ?? "Ikke valgt"}</dd>
        </dl>
        {!customer.known ? (
          <div className="mt-3 rounded-lg bg-[#FFF4E5] px-[11px] py-[9px] text-[13px] text-[#8A4B08]">
            <p className="m-0">Ikke identificeret. Fiks giver ikke ordre- eller sagsoplysninger i denne samtale. Bed om mail eller telefon for at koble kunden.</p>
            {draft?.reason && <p className="m-0 mt-1.5">Fiks: {draft.reason}</p>}
          </div>
        ) : (
          <>
            <Section title="Reparationer" items={customer.repairs.map((r) => ({
              id: r.id,
              href: r.href,
              title: join(r.ticketNumber != null ? `Sag ${r.ticketNumber}` : null, r.device) || "Reparation",
              sub: join(r.issue, r.status ? (STATUS_LABELS as Record<string, string>)[r.status] ?? r.status : null, fmtDate(r.createdAt)),
            }))} />
            <Section title="Ordrer" items={customer.orders.map((o) => ({
              id: o.id,
              href: o.href,
              title: o.orderNumber != null ? `Ordre ${o.orderNumber}` : "Ordre",
              sub: join(formatKr(o.total), o.status, fmtDate(o.createdAt)),
            }))} />
            <Section title="Opkøb" items={customer.buyback.map((b) => ({
              id: b.id,
              href: b.href,
              title: b.subject || "Opkøb",
              sub: join(b.offerAmount != null ? `Tilbud ${formatKr(b.offerAmount)}` : null, b.offerStatus ?? b.status, fmtDate(b.createdAt)),
            }))} />
            <Section
              title="Tidligere samtaler"
              items={customer.previous.map((c) => ({
                id: c.id,
                // Tidligere samtaler åbnes her i Kundecenteret, ikke på den gamle side.
                href: `/admin/kundecenter?id=${encodeURIComponent(c.id)}`,
                title: c.subject || "Uden emne",
                sub: join(CHANNEL_LABELS[c.channel ?? ""] ?? c.channel, fmtDate(c.createdAt)),
                onOpen: () => onOpenConversation(c.id),
              }))}
            />
          </>
        )}
      </>
    );
  }

  return (
    <div className="p-4">
      {onClose && (
        <div className="-mt-1 mb-2 flex items-center justify-between">
          <span className="text-[13px] text-[#5E6A63]">Kunde</span>
          <button type="button" onClick={onClose} className="m-press m-tap rounded-lg px-2.5 py-1.5 text-[13px] font-medium hover:bg-[#F5F6F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F8F55]">
            Luk
          </button>
        </div>
      )}
      {body}
    </div>
  );
}

type Item = { id: string; href: string; title: string; sub: string; onOpen?: () => void };

function Section({ title, items }: { title: string; items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-3.5 border-t border-[#E2E5E0] pt-3">
      <h4 className="m-0 mb-[7px] text-[12px] font-medium text-[#5E6A63]">{title}</h4>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              href={it.href}
              prefetch={false}
              onClick={(e) => {
                if (!it.onOpen || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                it.onOpen();
              }}
              className="block rounded-lg border border-[#E2E5E0] bg-white px-2.5 py-2 hover:bg-[#FAFBF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2F8F55]"
            >
              <span className="block text-[14px] font-semibold text-[#15211B]">{it.title}</span>
              {it.sub && <span className="block text-[12.5px] text-[#5E6A63]">{it.sub}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
