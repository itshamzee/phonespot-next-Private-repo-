"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ScopeSlug } from "@/lib/auth/store-scope";
import { SCOPE_LABELS } from "@/lib/auth/store-scope";
import { formatWhen, summarizeLines } from "@/lib/transfers/format";
import { maskImei, postJson } from "@/lib/transfers/client";
import { receiptProgress } from "@/lib/transfers/rules";
import type { Transfer } from "@/lib/transfers/types";
import { ScanDialog } from "./scan-dialog";
import { SendDialog } from "./send-dialog";

type Filter = "alle" | "til" | "fra";

/** Tre kolonner: Anmodet, På vej, Modtaget. Filter Alle / Til <min butik> / Fra <min butik>. */
export function TransferBoard({ transfers, mine }: { transfers: Transfer[]; mine: ScopeSlug | null }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("alle");
  const [sending, setSending] = useState<Transfer | null>(null);
  const [receiving, setReceiving] = useState<Transfer | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = transfers.filter((t) =>
    filter === "til" ? t.to.slug === mine : filter === "fra" ? t.from.slug === mine : true,
  );
  const requested = visible.filter((t) => t.status === "requested");
  const sent = visible.filter((t) => t.status === "sent");
  const finished = visible.filter((t) => t.status === "received" || t.status === "cancelled");

  async function cancel(t: Transfer) {
    const warning =
      t.status === "sent"
        ? "Varerne er allerede sendt. Annullerer du, lægges de tilbage på lager hos afsenderen. Fortsæt?"
        : "Annullér anmodningen?";
    if (!window.confirm(warning)) return;
    setBusyId(t.id);
    setError(null);
    const res = await postJson(`/api/admin/transfers/${t.id}/cancel`, {});
    setBusyId(null);
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  const filters: { id: Filter; label: string }[] = mine
    ? [
        { id: "alle", label: "Alle" },
        { id: "til", label: `Til ${SCOPE_LABELS[mine]}` },
        { id: "fra", label: `Fra ${SCOPE_LABELS[mine]}` },
      ]
    : [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em]">Overførsler</h1>
        {filters.length > 0 && (
          <div role="group" aria-label="Retning" className="flex gap-1 rounded-[10px] bg-[#E9ECE7] p-1">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`h-[34px] rounded-lg px-3.5 text-[14px] ${filter === f.id ? "bg-white font-semibold" : "text-[#3D4842]"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[14px] text-[#5E6A63]">
        En vare flytter først lager, når modtageren scanner den. Imens står den som &quot;På vej&quot; og kan ikke sælges nogen steder.
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-[#FDECEC] px-3 py-2 text-[14px] text-[#B42318]">
          {error}
        </p>
      )}

      <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <Column title={`Anmodet (${requested.length})`} empty="Ingen åbne anmodninger.">
          {requested.map((t) => (
            <Card key={t.id} t={t}>
              <span className="text-[#5E6A63]">
                {t.to.name} beder {t.from.name} · {formatWhen(t.requestedAt)}
                {t.requestedByName ? ` · ${t.requestedByName}` : ""}
              </span>
              {t.note && <span className="text-[#3D4842]">&quot;{t.note}&quot;</span>}
              {t.can.send && (
                <button
                  type="button"
                  onClick={() => setSending(t)}
                  className="flex h-9 items-center justify-center rounded-lg bg-[#1A3D2E] font-semibold text-white hover:bg-[#2D6B45]"
                >
                  Pak og send
                </button>
              )}
              {t.can.cancel && <CancelLink busy={busyId === t.id} onClick={() => cancel(t)} />}
            </Card>
          ))}
        </Column>

        <Column title={`På vej (${sent.length})`} empty="Intet er på vej.">
          {sent.map((t) => {
            const progress = receiptProgress(t.lines);
            const imeis = t.lines.filter((l) => l.imei && l.receivedQty < l.sentQty).map((l) => l.imei as string);
            return (
              <Card key={t.id} t={t}>
                <span className="text-[#5E6A63]">
                  {t.from.name} → {t.to.name} · sendt {formatWhen(t.sentAt)}
                </span>
                {imeis.slice(0, 3).map((i) => (
                  <span key={i} className="text-[#5E6A63]">
                    IMEI {maskImei(i)}
                  </span>
                ))}
                {progress.received > 0 && (
                  <span className="text-[#5E6A63]">
                    {progress.received} af {progress.sent} modtaget
                  </span>
                )}
                {t.can.receive && (
                  <button
                    type="button"
                    onClick={() => setReceiving(t)}
                    className="flex h-9 items-center justify-center rounded-lg bg-[#2F8F55] font-semibold text-white hover:bg-[#2D6B45]"
                  >
                    Scan og modtag
                  </button>
                )}
                {t.can.cancel && <CancelLink busy={busyId === t.id} onClick={() => cancel(t)} />}
              </Card>
            );
          })}
        </Column>

        <Column title="Modtaget" empty="Ingen afsluttede overførsler de seneste 30 dage.">
          {finished.map((t) => (
            <Card key={t.id} t={t} muted={t.status === "cancelled"}>
              <span className="text-[#5E6A63]">
                {t.from.name} → {t.to.name} ·{" "}
                {t.status === "cancelled"
                  ? `annulleret ${formatWhen(t.cancelledAt)}`
                  : `modtaget ${formatWhen(t.receivedAt)}${t.receivedByName ? ` af ${t.receivedByName}` : ""}`}
              </span>
              {t.closedShort && <span className="text-[#9A5B0A]">Lukket med mangler</span>}
            </Card>
          ))}
        </Column>
      </div>

      {sending && <SendDialog key={sending.id} transfer={sending} onClose={() => setSending(null)} />}
      {receiving && <ScanDialog key={receiving.id} transfer={receiving} onClose={() => setReceiving(null)} />}
    </>
  );
}

function Column({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-xl bg-[#EEF0EC] p-3.5">
      <h2 className="mx-1 text-[15px] font-semibold">{title}</h2>
      {children.length === 0 && <p className="px-1 py-3 text-[14px] text-[#5E6A63]">{empty}</p>}
      {children}
    </section>
  );
}

function Card({ t, children, muted }: { t: Transfer; children: React.ReactNode; muted?: boolean }) {
  return (
    <article
      className={`flex flex-col gap-2 rounded-[10px] border border-[#E2E5E0] bg-white p-3.5 text-[14px] ${muted ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <b className={muted ? "line-through" : ""}>{summarizeLines(t.lines)}</b>
        <span className="shrink-0 text-[12px] text-[#5E6A63]">#{t.number}</span>
      </div>
      {children}
    </article>
  );
}

function CancelLink({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="self-start text-[13px] text-[#5E6A63] underline underline-offset-2 hover:text-[#B42318] disabled:opacity-50"
    >
      Annullér
    </button>
  );
}
