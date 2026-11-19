"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Button, Skeleton, Textarea } from "@/components/admin/ui";
import { menuItemClass, usePopoverMenu } from "@/components/admin/shell/use-popover-menu";
import { buildThreadItems, CHANNEL_LABELS, snoozePresets, type InboxDetail, type ThreadDraft, type ThreadItem } from "./inbox-helpers";

const TZ = "Europe/Copenhagen";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

/** "i dag 08.42", "i går 15.10", ellers "19. nov. 08.42". */
export function messageTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = new Intl.DateTimeFormat("da-DK", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  if (dayKey(d) === dayKey(now)) return `i dag ${time}`;
  if (dayKey(d) === dayKey(new Date(now.getTime() - 86_400_000))) return `i går ${time}`;
  return `${new Intl.DateTimeFormat("da-DK", { timeZone: TZ, day: "numeric", month: "short" }).format(d)} ${time}`;
}

export interface ThreadProps {
  detail: InboxDetail | null;
  error: string | null;
  onRetry: () => void;
  meId: string | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
  busy: string | null;
  auditDraft: ThreadDraft | null;
  composer: ReactNode;
  onBack: () => void;
  onCustomer: () => void;
  onTake: () => void;
  onSnooze: (until: string, label: string) => void;
  onDone: () => void;
  onReopen: () => void;
  onVerdict: (draft: ThreadDraft, verdict: "correct" | "wrong", note: string) => Promise<boolean>;
}

export function Thread({ headingRef, detail, ...p }: ThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inq = detail?.inquiry ?? null;
  const items = useMemo(() => (detail ? buildThreadItems(detail.messages, detail.drafts) : []), [detail]);

  // Nederst i tråden, når en sag åbnes, eller der kommer en ny besked.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [inq?.id, items.length]);

  if (!detail || !inq) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-none items-center gap-2 border-b border-[#E2E5E0] px-4 py-3 min-[900px]:hidden">
          <Button size="sm" onClick={p.onBack}>
            Tilbage
          </Button>
        </div>
        {p.error ? (
          <div role="alert" className="m-4 flex items-center justify-between gap-3 rounded-lg bg-[#FDECEC] p-3 text-[14px] text-[#B42318]">
            <span>{p.error}</span>
            <Button size="sm" onClick={p.onRetry}>
              Prøv igen
            </Button>
          </div>
        ) : (
          <div data-skeleton aria-label="Henter samtalen" className="flex flex-col gap-3 p-[18px]">
            <span className="sr-only">Henter samtalen...</span>
            <Skeleton className="h-5 w-1/2 rounded-md" />
            <Skeleton className="h-3.5 w-1/3 rounded-md" />
            <Skeleton className="mt-4 h-20 w-3/5 rounded-xl" />
            <Skeleton className="h-16 w-1/2 self-end rounded-xl" />
          </div>
        )}
      </div>
    );
  }

  const closed = inq.status === "lukket";
  const mine = !!p.meId && inq.assigned_to === p.meId;
  const owner = inq.assigned_to ? (mine ? "din sag" : `hos ${inq.assigned_name || "en kollega"}`) : "ikke tildelt";
  const channel = CHANNEL_LABELS[inq.channel ?? "email"] ?? inq.channel;
  const rating = inq.channel === "google_review" ? googleRating(inq.metadata) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none flex-wrap items-center gap-2.5 border-b border-[#E2E5E0] bg-white px-4 py-3 min-[900px]:px-[18px]">
        <Button size="sm" className="min-[900px]:hidden" onClick={p.onBack}>
          Tilbage
        </Button>
        <div className="min-w-40 flex-1">
          <h2 ref={headingRef} tabIndex={-1} className="m-0 text-[16px] font-semibold text-[#15211B] outline-none focus-visible:ring-2 focus-visible:ring-[#2F8F55]">
            {inq.subject || "Uden emne"}
          </h2>
          <p className="m-0 text-[13px] text-[#5E6A63]">
            {inq.name || "Ukendt afsender"} · {channel} · {owner}
          </p>
        </div>
        {!closed && !mine && (
          <Button size="sm" variant="primary" loading={p.busy === "take"} onClick={p.onTake}>
            Tag den
          </Button>
        )}
        {!closed && <SnoozeMenu disabled={p.busy !== null} onPick={p.onSnooze} />}
        {!closed && (
          <Button size="sm" loading={p.busy === "done"} onClick={p.onDone}>
            Færdig
          </Button>
        )}
        <Button size="sm" className="min-[1240px]:hidden" onClick={p.onCustomer}>
          Kunde
        </Button>
      </div>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-[#F5F6F4] p-4 min-[900px]:p-[18px]">
        {items.map((item, i) => (
          <Bubble key={item.id} item={item} customerName={inq.name} rating={i === 0 ? rating : null} />
        ))}
      </div>

      {p.auditDraft && !closed && <AuditBar key={p.auditDraft.id} draft={p.auditDraft} onVerdict={p.onVerdict} />}
      {closed ? (
        <div className="flex flex-none flex-wrap items-center gap-3 border-t border-[#E2E5E0] bg-white px-4 py-3 min-[900px]:px-[18px]">
          <span className="flex-1 text-[14px] text-[#5E6A63]">Sagen er færdig.</span>
          <Button size="sm" loading={p.busy === "reopen"} onClick={p.onReopen}>
            Genåbn
          </Button>
        </div>
      ) : (
        p.composer
      )}
    </div>
  );
}

/** Googles stjerneantal som ren tekst ("2 af 5"), hvis det findes i metadata. Aldrig for Trustpilot. */
function googleRating(meta: Record<string, unknown> | null | undefined): string | null {
  const n = meta ? Number(meta.rating ?? meta.stars) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 5 ? `${n} af 5` : null;
}

function Bubble({ item, customerName, rating }: { item: ThreadItem; customerName: string | null; rating: string | null }) {
  if (item.kind === "system") {
    return <p className="m-0 max-w-[520px] self-center text-center text-[12.5px] font-medium text-[#B42318]">{item.text}</p>;
  }
  const m = item.message;
  const when = messageTime(m.created_at);
  const shell = {
    customer: "self-start border-[#E2E5E0] bg-white",
    staff: "self-end border-[#D3E2D8] bg-green-pale",
    fiks: "self-end border-dashed border-[#9DBBA8] bg-[#F1F6F2]",
    note: "self-stretch border-[#EBDD9A] bg-[#FFF8DB]",
  }[item.kind];
  const who =
    item.kind === "customer" ? customerName || "Kunden" : item.kind === "fiks" ? "Fiks, automatisk svar" : m.staff_name || "Personale";
  return (
    <div className={`rounded-xl border px-[13px] py-2.5 ${item.kind === "note" ? "max-w-none" : "max-w-[min(620px,88%)]"} ${shell}`}>
      <div className="mb-[3px] flex flex-wrap gap-2 text-[12px] text-[#5E6A63]">
        <b className={`font-semibold ${item.kind === "fiks" ? "text-green-eco" : "text-[#15211B]"}`}>{who}</b>
        {item.kind === "note" && <span>intern note, kunden ser den ikke</span>}
        {rating && <span className="font-semibold tabular-nums text-[#15211B]">{rating}</span>}
        <span>{when}</span>
      </div>
      <p className="m-0 whitespace-pre-wrap break-words text-[14px] text-[#15211B]">{m.body}</p>
      {item.kind === "fiks" && item.basedOn && (
        <p className="m-0 mt-[7px] border-t border-[#D9E5DD] pt-1.5 text-[12px] text-[#5E6A63]">{item.basedOn}</p>
      )}
    </div>
  );
}

function SnoozeMenu({ disabled, onPick }: { disabled: boolean; onPick: (until: string, label: string) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menu = usePopoverMenu({ wrapRef, triggerRef, panelRef });
  // Tidspunkterne regnes ud, når menuen åbnes, ikke da siden blev indlæst.
  const presets = useMemo(() => (menu.open ? snoozePresets(new Date()) : []), [menu.open]);
  return (
    <div ref={wrapRef} className="relative">
      <Button ref={triggerRef} size="sm" disabled={disabled} aria-haspopup="menu" aria-expanded={menu.open} aria-controls={menu.panelId} onClick={menu.toggle}>
        Udsæt
      </Button>
      <div
        ref={panelRef}
        id={menu.panelId}
        role="menu"
        aria-label="Udsæt til"
        data-open={menu.open}
        aria-hidden={menu.open ? undefined : true}
        tabIndex={-1}
        className="m-pop absolute right-0 top-10 z-20 w-48 rounded-xl border border-[#E2E5E0] bg-white p-1.5 text-[#15211B] outline-none"
      >
        {presets.map((s) => (
          <button
            key={s.label}
            type="button"
            role="menuitem"
            className={`${menuItemClass} m-tap w-full text-left`}
            onClick={() => {
              menu.closeAndReturn();
              onPick(s.until, s.label);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AuditBar({ draft, onVerdict }: { draft: ThreadDraft; onVerdict: ThreadProps["onVerdict"] }) {
  const id = useId();
  const [wrong, setWrong] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"correct" | "wrong" | null>(null);

  async function submit(verdict: "correct" | "wrong") {
    setBusy(verdict);
    const ok = await onVerdict(draft, verdict, note.trim());
    setBusy(null);
    if (ok && verdict === "wrong") setWrong(false);
  }

  return (
    <div className="flex flex-none flex-wrap items-center gap-2.5 border-t border-[#E2E5E0] bg-white px-4 py-3 min-[900px]:px-[18px]">
      {wrong ? (
        <>
          <label htmlFor={id} className="w-full text-[14px]">
            Hvad skulle Fiks have svaret?
          </label>
          <Textarea id={id} rows={3} value={note} onChange={(e) => setNote(e.target.value)} autoFocus className="w-full" />
          <Button size="sm" variant="primary" disabled={!note.trim()} loading={busy === "wrong"} onClick={() => submit("wrong")}>
            Gem
          </Button>
          <Button size="sm" variant="quiet" onClick={() => setWrong(false)}>
            Annuller
          </Button>
        </>
      ) : (
        <>
          <span className="min-w-44 flex-1 text-[14px]">Fiks svarede selv. Var svaret rigtigt?</span>
          <Button size="sm" loading={busy === "correct"} onClick={() => submit("correct")}>
            Korrekt
          </Button>
          <Button size="sm" onClick={() => setWrong(true)}>
            Forkert
          </Button>
        </>
      )}
    </div>
  );
}
