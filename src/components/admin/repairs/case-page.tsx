"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStoreScope } from "@/components/admin/shell/store-scope-context";
import type { CaseDetail } from "@/lib/repairs/case-detail";
import { formatPhone, isClosed, pickupFor } from "@/lib/repairs/case-list";
import { formatKr, methodLabel } from "@/lib/repairs/case-money";
import { buildTimeline } from "@/lib/repairs/case-timeline";
import { formatDay, formatLong, formatPickup } from "@/lib/repairs/format";
import { HOLD_REASONS } from "@/lib/repairs/hold";
import { NEXT_STATUS, STATUS_LABELS } from "@/lib/repairs/status-labels";
import { ticketLabel } from "@/lib/repairs/ticket-label";
import { STORE_IDS, normalizeStoreId, storeLabel } from "@/lib/stores";
import type { RepairStatus } from "@/lib/supabase/types";
import { focusWithoutScroll, revealTop } from "@/lib/reveal";
import { Btn, BtnLink, Card, Dl, Pill, apiError, btnClass } from "@/components/admin/repairs/ui";
import CaseItemsEditor from "@/components/admin/repairs/case-items-editor";
import type { CaseItemView } from "@/lib/repairs/new-case-types";
import { MeldKlarDialog } from "@/components/admin/repairs/meld-klar-dialog";
import { PrintModal } from "@/components/admin/repairs/print-modal";
import { SmsThread } from "@/components/admin/repairs/sms-thread";

/** Er adgangskoden noteret? Selve koden gemmes og vises aldrig her. */
function passcodeLabel(detail: CaseDetail): string {
  const item = (detail.ticket.intake_checklist ?? []).find((c) => /adgangskode/i.test(c.label));
  if (item && item.status === "ok") return "Noteret (vises kun på værkstedet)";
  if (item && item.status === "ikke_relevant") return "Ikke relevant";
  return "Ikke noteret";
}

/** Kort opsummering af tilstanden ved modtagelse ud fra tjekliste og enhedsnoter. */
function conditionSummary(detail: CaseDetail): string | null {
  const list = (detail.ticket.intake_checklist ?? []).filter((c) => c.status !== "ikke_vurderet");
  const faults = list.filter((c) => c.status === "fejl").map((c) => (c.note ? `${c.label}: ${c.note}` : c.label));
  const parts: string[] = [];
  if (list.length > 0) parts.push(faults.length ? `Fejl ved modtagelse: ${faults.join("; ")}.` : "Ingen fejl noteret ved modtagelse.");
  if (detail.device?.condition_notes) parts.push(detail.device.condition_notes);
  return parts.length ? `Tilstand ved modtagelse: ${parts.join(" ")}` : null;
}

export default function CasePage({ id }: { id: string }) {
  const router = useRouter();
  const { isOwner } = useStoreScope();
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [meldKlar, setMeldKlar] = useState(false);
  const [print, setPrint] = useState<"intake-receipt" | "workshop-report" | null>(null);
  const [photos, setPhotos] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState<string>(HOLD_REASONS[0]);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quote, setQuote] = useState({ price: "", days: "", notes: "" });
  const [noteText, setNoteText] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/repairs/${id}`);
      if (res.status === 404) return setState("missing");
      if (!res.ok) return setState("error");
      setDetail((await res.json()) as CaseDetail);
      setState("ok");
    } catch {
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (state === "ok" && window.location.hash === "#sms") {
      const el = document.getElementById("sms-composer");
      revealTop(document.getElementById("sms"));
      focusWithoutScroll(el);
    }
  }, [state]);

  const timeline = useMemo(
    () =>
      detail
        ? buildTimeline({
            ticket: detail.ticket,
            logs: detail.logs,
            sms: detail.sms,
            comments: detail.comments,
            quotes: detail.quotes,
            deposits: detail.deposits,
          })
        : [],
    [detail],
  );

  async function patchTicket(body: Record<string, unknown>, failMessage: string, key: string) {
    setBusy(key);
    setNotice(null);
    try {
      const res = await fetch(`/api/repairs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) setNotice(await apiError(res, failMessage));
      else await load();
    } catch {
      setNotice(`${failMessage} Forbindelsen fejlede.`);
    }
    setBusy(null);
  }

  async function postJson(url: string, method: string, body: unknown, failMessage: string, key: string): Promise<boolean> {
    setBusy(key);
    setNotice(null);
    let ok = false;
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) setNotice(await apiError(res, failMessage));
      else {
        ok = true;
        const data = (await res.json().catch(() => ({}))) as { warning?: string };
        if (data.warning) setNotice(data.warning);
        await load();
      }
    } catch {
      setNotice(`${failMessage} Forbindelsen fejlede.`);
    }
    setBusy(null);
    return ok;
  }

  async function reklamation() {
    if (!detail || !window.confirm(`Opret en ny reklamationssag for ${ticketLabel(detail.ticket)}? Kunde og enhed kopieres til den nye sag.`)) return;
    setBusy("reklamation");
    try {
      const res = await fetch(`/api/repairs/${id}/reklamation`, { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { ticketId: string };
        router.push(`/admin/reparationer/${data.ticketId}`);
        return;
      }
      setNotice(await apiError(res, "Reklamationssagen blev ikke oprettet. Prøv igen."));
    } catch {
      setNotice("Reklamationssagen blev ikke oprettet, fordi forbindelsen fejlede.");
    }
    setBusy(null);
  }

  if (state === "loading") return <p className="p-8 text-sm text-[#5E6A63]">Henter sag...</p>;
  if (state === "missing")
    return (
      <div className="p-8 text-sm">
        <p>Sagen findes ikke, eller den hører til en anden butik.</p>
        <Link href="/admin/reparationer" className="font-medium text-[#1A3D2E] underline">
          Tilbage til Sagsstyring
        </Link>
      </div>
    );
  if (state === "error" || !detail)
    return (
      <div className="p-8 text-sm" role="alert">
        <p>Sagen kunne ikke hentes.</p>
        <Btn onClick={() => { setState("loading"); load(); }}>Prøv igen</Btn>
      </div>
    );

  const t = detail.ticket;
  const label = ticketLabel(t);
  const closed = isClosed(t.status);
  const status = t.status as RepairStatus;
  const next = NEXT_STATUS[status];
  const pickup = pickupFor({ ...t, repair_quotes: detail.quotes });
  const tabLabel = t.on_hold_reason ? "Afventer del" : STATUS_LABELS[status] ?? t.status;
  const { totals } = detail;
  const condition = conditionSummary(detail);
  const photoUrls = [...(t.intake_photos ?? []), ...(t.checkout_photos ?? [])].filter(Boolean);
  const latestPrice = detail.totals.total_oere > 0 ? detail.totals.total_oere / 100 : null;
  const history = detail.history;

  return (
    <div className="flex flex-col gap-5 px-4 py-6 sm:px-8 sm:py-7">
      <Link href="/admin/reparationer" className="text-sm text-[#1A3D2E] no-underline hover:underline">
        ← Sagsstyring
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3.5">
          <h1 className="m-0 text-[32px] font-bold tracking-[-0.02em] text-[#15211B]">Sag {label}</h1>
          <span className="rounded-lg bg-[#EEF0EC] px-2.5 py-1 text-[13px] font-semibold text-[#3D4842]">{tabLabel}</span>
          {t.is_urgent && <Pill tone="amber">Hastesag</Pill>}
        </div>
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Handlinger på sagen">
          <Btn
            onClick={() => {
              revealTop(document.getElementById("sms"));
              focusWithoutScroll(document.getElementById("sms-composer"));
            }}
          >
            SMS
          </Btn>
          {t.customer_email?.trim() ? (
            <a href={`mailto:${t.customer_email}?subject=${encodeURIComponent(`Sag ${label}`)}`} className={btnClass("secondary")}>
              E-mail
            </a>
          ) : (
            <Btn disabled title="Sagen har ingen e-mailadresse">
              E-mail
            </Btn>
          )}
          <Btn onClick={() => setPrint("intake-receipt")}>Print</Btn>
          {!closed && <BtnLink href={`/admin/kasse?sag=${id}&depositum=1`}>Depositum</BtnLink>}
          {!closed && (
            <BtnLink href={`/admin/kasse?sag=${id}`} variant="primary">
              Betal
            </BtnLink>
          )}
          {!closed && (
            <Btn variant="ready" className="!px-4" onClick={() => setMeldKlar(true)}>
              Meld klar
            </Btn>
          )}
        </div>
      </div>

      {notice && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-[#F5D9B0] bg-[#FFF4E5] px-4 py-3 text-sm text-[#8A4B08]">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-semibold underline">
            Luk
          </button>
        </div>
      )}

      {t.parent_ticket_id && (
        <p className="m-0 text-sm text-[#5E6A63]">
          Reklamation på en tidligere sag.{" "}
          <Link href={`/admin/reparationer/${t.parent_ticket_id}`} className="font-medium text-[#1A3D2E] underline">
            Åbn den oprindelige sag
          </Link>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2" aria-label="Flere handlinger">
        <Btn size="sm" disabled={busy === "urgent"} onClick={() => patchTicket({ is_urgent: !t.is_urgent }, "Hastesag blev ikke ændret.", "urgent")}>
          {t.is_urgent ? "Fjern hastesag" : "Markér som hastesag"}
        </Btn>
        {t.on_hold_reason ? (
          <Btn size="sm" onClick={() => patchTicket({ on_hold_reason: null }, "Sagen blev ikke fjernet fra hold.", "hold")}>
            Fjern fra hold ({t.on_hold_reason.toLowerCase()})
          </Btn>
        ) : (
          !closed && (
            <span className="flex items-center gap-1.5">
              {holdOpen ? (
                <>
                  <select aria-label="Årsag til hold" value={holdReason} onChange={(e) => setHoldReason(e.target.value)} className="h-[34px] rounded-lg border border-[#C9D0C7] bg-white px-2 text-sm">
                    {HOLD_REASONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <Btn size="sm" variant="primary" onClick={async () => { await patchTicket({ on_hold_reason: holdReason }, "Sagen blev ikke sat på hold.", "hold"); setHoldOpen(false); }}>
                    Sæt på hold
                  </Btn>
                  <Btn size="sm" onClick={() => setHoldOpen(false)}>
                    Annuller
                  </Btn>
                </>
              ) : (
                <Btn size="sm" onClick={() => setHoldOpen(true)}>
                  Sæt på hold
                </Btn>
              )}
            </span>
          )
        )}
        {status === "modtaget" && (
          <Btn size="sm" onClick={() => setQuoteOpen((v) => !v)}>
            {quoteOpen ? "Annuller tilbud" : "Send tilbud"}
          </Btn>
        )}
        {next && (
          <Btn size="sm" disabled={busy === "status"} onClick={() => postJson(`/api/repairs/${id}/status`, "PATCH", { status: next }, "Status blev ikke ændret.", "status")}>
            Næste trin: {STATUS_LABELS[next].toLowerCase()}
          </Btn>
        )}
        <Btn size="sm" disabled={busy === "reklamation"} onClick={reklamation}>
          Reklamation
        </Btn>
        {isOwner && (
          <select
            aria-label="Butik"
            value={normalizeStoreId(t.store_id) ?? ""}
            onChange={(e) => patchTicket({ store_id: normalizeStoreId(e.target.value) }, "Butikken blev ikke ændret.", "store")}
            className="h-[34px] rounded-lg border border-[#C9D0C7] bg-white px-2 text-sm"
          >
            <option value="">Butik: Generel</option>
            {STORE_IDS.map((s) => (
              <option key={s} value={s}>
                Butik: {storeLabel(s)}
              </option>
            ))}
          </select>
        )}
      </div>

      {quoteOpen && (
        <form
          className="grid gap-3 rounded-xl border border-[#E2E5E0] bg-white p-5 sm:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await postJson(
              `/api/repairs/${id}/quote`,
              "POST",
              { price_dkk: Number(quote.price), estimated_days: quote.days ? Number(quote.days) : null, notes: quote.notes || null },
              "Tilbuddet blev ikke sendt. Prøv igen.",
              "quote",
            );
            if (ok) {
              setQuoteOpen(false);
              setQuote({ price: "", days: "", notes: "" });
            }
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            Pris (kr.)
            <input required type="number" min="1" value={quote.price} onChange={(e) => setQuote({ ...quote, price: e.target.value })} className="h-10 rounded-lg border border-[#C9D0C7] px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Estimerede hverdage
            <input type="number" min="1" value={quote.days} onChange={(e) => setQuote({ ...quote, days: e.target.value })} className="h-10 rounded-lg border border-[#C9D0C7] px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Note til kunden
            <input value={quote.notes} onChange={(e) => setQuote({ ...quote, notes: e.target.value })} className="h-10 rounded-lg border border-[#C9D0C7] px-3" />
          </label>
          <div className="sm:col-span-3">
            <Btn type="submit" variant="primary" disabled={busy === "quote"}>
              {busy === "quote" ? "Sender..." : "Send tilbud til kunde"}
            </Btn>
          </div>
        </form>
      )}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        <Card title="Detaljer">
          <Dl
            rows={[
              ["Enhed", <b key="e">{[t.device_model || t.device_type, detail.device?.color].filter(Boolean).join(" · ")}</b>],
              ["IMEI / serienr.", <span key="i" className="tabular-nums">{detail.device?.serial_number || "Ikke noteret"}</span>],
              ["Fejl", t.issue_description || "Ikke angivet"],
              ["Kode", passcodeLabel(detail)],
              ["Indleveret", formatLong(t.created_at)],
              ["Lovet klar", formatPickup(pickup) + (pickup.source === "promised" ? "" : " (forventet)")],
              ["Ansvarlig", t.assigned_to || "Ikke tildelt"],
              ["Garanti", detail.warranty || "Ikke angivet på ydelsen"],
            ]}
          />
        </Card>
        <Card title="Kunde">
          <Dl
            rows={[
              ["Navn", <b key="n">{t.customer_name}</b>],
              ["Telefon", t.customer_phone ? <a key="p" href={`tel:${t.customer_phone}`} className="text-[#1A3D2E]">{formatPhone(t.customer_phone)}</a> : "Ikke angivet"],
              ["E-mail", t.customer_email || "Ikke angivet"],
              ["Hjemmebutik", storeLabel(normalizeStoreId(t.store_id))],
              [
                "Historik",
                history
                  ? [
                      history.tickets === null ? null : history.tickets === 0 ? "Ingen tidligere sager" : `${history.tickets} tidligere ${history.tickets === 1 ? "sag" : "sager"}`,
                      history.orders ? `${history.orders} ${history.orders === 1 ? "køb" : "køb"} (webshop)` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Ukendt"
                  : "Ukendt",
              ],
            ]}
          />
          {t.customer_id && (
            <div className="mt-3 text-sm">
              <Link href={`/admin/kunder/${t.customer_id}`} className="text-[#1A3D2E] underline">
                Åbn kunde
              </Link>
            </div>
          )}
          {condition && <div className="mt-3.5 rounded-[10px] bg-[#F5F6F4] px-3.5 py-3 text-sm">{condition}</div>}
        </Card>
      </div>

      <Card title="Opgaver og varer">
        {t.on_hold_reason && <p className="mb-2 mt-0 text-sm text-[#7A4A06]">På hold: {t.on_hold_reason.toLowerCase()}</p>}
        <CaseItemsEditor
          ticketId={id}
          store={normalizeStoreId(t.store_id)}
          modelId={(t as { repair_model_id?: string | null }).repair_model_id ?? null}
          deviceModel={t.device_model}
          closed={closed}
          lines={detail.lines}
          items={(detail as CaseDetail & { items?: CaseItemView[] }).items}
          onChanged={load}
          onNotice={setNotice}
        />
        <div className="flex flex-col items-end gap-1.5 pt-3.5 text-sm tabular-nums">
          {totals.discount_oere > 0 && (
            <div className="flex gap-6">
              <span className="text-[#5E6A63]">Rabat</span>
              <span>{formatKr(-totals.discount_oere)}</span>
            </div>
          )}
          <div className="flex gap-6">
            <span className="text-[#5E6A63]">I alt</span>
            <span>{formatKr(totals.total_oere)}</span>
          </div>
          {detail.deposits.map((d, i) => (
            <div key={i} className="flex gap-6">
              <span className="text-[#5E6A63]">
                Depositum betalt {formatDay(d.paid_at)} ({methodLabel(d.method)})
              </span>
              <span>{formatKr(-d.amount_oere)}</span>
            </div>
          ))}
          <div className="flex gap-6 text-[17px] font-bold">
            <span>Rest ved afhentning</span>
            <span>{formatKr(totals.rest_oere)}</span>
          </div>
          {totals.paid && <span className="text-xs text-[#1A3D2E]">Sagen er betalt{t.paid_at ? ` ${formatDay(t.paid_at)}` : ""}.</span>}
          {totals.overpaid_oere > 0 && (
            <span className="text-xs text-[#7A4A06]">Depositum overstiger prisen med {formatKr(totals.overpaid_oere)}.</span>
          )}
          {!detail.deposits_ok && (
            <span className="text-xs text-[#B42318]">Depositum kunne ikke hentes. Resten kan være forkert.</span>
          )}
        </div>
      </Card>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        <SmsThread
          ticket={t}
          sms={detail.sms}
          priceDkk={latestPrice}
          onSent={load}
        />
        <Card title="Historik">
          <ol className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
            {timeline.map((i) => (
              <li key={i.id}>
                <b>{formatDay(i.at)}</b> · {i.text}
                {i.actor ? ` · ${i.actor}` : ""}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {photoUrls.length > 0 ? (
              <button type="button" onClick={() => setPhotos(true)} className="text-[#1A3D2E] underline">
                Fotos ({photoUrls.length})
              </button>
            ) : (
              <span className="text-[#5E6A63]">Fotos (0)</span>
            )}
            <span className="text-[#C9D0C7]">·</span>
            {t.signature_url ? (
              <a href={t.signature_url} target="_blank" rel="noreferrer" className="text-[#1A3D2E] underline">
                Underskrift
              </a>
            ) : (
              <span className="text-[#5E6A63]">Underskrift (ikke gemt)</span>
            )}
            <span className="text-[#C9D0C7]">·</span>
            <button type="button" onClick={() => setPrint("intake-receipt")} className="text-[#1A3D2E] underline">
              Indleveringsbevis
            </button>
            <span className="text-[#C9D0C7]">·</span>
            <button type="button" onClick={() => setPrint("workshop-report")} className="text-[#1A3D2E] underline">
              Værkstedsrapport
            </button>
          </div>
        </Card>
      </div>

      <Card title="Interne noter">
        {(t.internal_notes ?? []).length > 0 && (
          <ul className="m-0 mb-3 flex list-none flex-col gap-2 p-0 text-sm">
            {t.internal_notes.map((n, i) => (
              <li key={i} className="rounded-lg bg-[#F5F6F4] p-3">
                {n.text}
                <div className="mt-1 text-xs text-[#5E6A63]">
                  {n.author} · {formatLong(n.timestamp)}
                </div>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!noteText.trim()) return;
            if (await postJson(`/api/admin/repairs/${id}`, "POST", { note: noteText.trim() }, "Noten blev ikke gemt. Prøv igen.", "note")) setNoteText("");
          }}
        >
          <input aria-label="Tilføj note" placeholder="Tilføj note" value={noteText} onChange={(e) => setNoteText(e.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-[#C9D0C7] px-3 text-sm" />
          <Btn type="submit" variant="primary" disabled={busy === "note" || !noteText.trim()}>
            Tilføj
          </Btn>
        </form>
      </Card>

      {meldKlar && (
        <MeldKlarDialog
          target={{
            id,
            label,
            status: t.status,
            customer_name: t.customer_name,
            customer_phone: t.customer_phone,
            paid: Boolean(t.paid),
            rest_oere: totals.rest_oere,
          }}
          onClose={() => setMeldKlar(false)}
          onDone={async ({ warning }) => {
            setMeldKlar(false);
            setNotice(warning ?? null);
            await load();
          }}
        />
      )}
      {print && <PrintModal detail={detail} type={print} onClose={() => setPrint(null)} />}
      {photos && (
        <div role="dialog" aria-modal="true" aria-label="Fotos" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4" onKeyDown={(e) => e.key === "Escape" && setPhotos(false)}>
          <div className="mx-auto max-w-3xl rounded-xl bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-[17px] font-semibold">Fotos</h2>
              <Btn autoFocus onClick={() => setPhotos(false)}>
                Luk
              </Btn>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photoUrls.map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={u} alt={`Foto ${i + 1} fra indlevering`} className="w-full rounded-lg border border-[#E2E5E0]" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
