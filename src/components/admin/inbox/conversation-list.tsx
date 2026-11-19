"use client";

import { useEffect, useState, type ReactNode } from "react";
import { waitingLabel, type InboxRow, type InboxView } from "@/lib/inquiries/inbox";
import { Button, Segmented, Skeleton } from "@/components/admin/ui";
import { CHANNEL_LABELS, isUnread, mailboxLabel } from "./inbox-helpers";
import { storeName } from "./saved-replies";
import { ViewSelect } from "./view-list";
import type { Counts, StoreFilter } from "./use-inbox";

/** Tiden til ventetiderne: tikker hvert minut, så "12 min" ikke står stille. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const STORE_OPTIONS: { value: StoreFilter; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "vejle", label: "Vejle" },
  { value: "slagelse", label: "Slagelse" },
];

type Tone = "plain" | "me" | "need" | "fiks" | "public";
const TAG_TONES: Record<Tone, string> = {
  plain: "border-[#E2E5E0] bg-white text-[#5E6A63]",
  me: "border-green-eco bg-green-eco text-white",
  need: "border-transparent bg-[#FDECEC] font-semibold text-[#B42318]",
  fiks: "border-[#CFE0D4] bg-green-pale text-green-eco",
  public: "border-transparent bg-[#FFF4E5] font-semibold text-[#8A4B08]",
};

function Tag({ tone = "plain", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`whitespace-nowrap rounded-md border px-[7px] py-1 text-[11.5px] leading-none ${TAG_TONES[tone]}`}>{children}</span>;
}

export interface ConversationListProps {
  rows: InboxRow[];
  view: InboxView;
  counts: Counts;
  onViewChange: (v: InboxView) => void;
  query: string;
  onQuery: (q: string) => void;
  searching: boolean;
  showStoreFilter: boolean;
  store: StoreFilter;
  onStore: (s: StoreFilter) => void;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  onRetry: () => void;
  selectedId: string | null;
  meId: string | null;
  readSet: Set<string>;
  /** viaKeyboard: rækken blev aktiveret med Enter/mellemrum, så fokus skal videre til tråden. */
  onOpen: (id: string, viaKeyboard: boolean) => void;
}

export function ConversationList(p: ConversationListProps) {
  const now = useNow();
  const newestFirst = p.view === "waiting" || p.view === "done";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none flex-col gap-2.5 border-b border-[#E2E5E0] bg-white px-3.5 pb-2.5 pt-3">
        <div className="min-[900px]:hidden">
          <ViewSelect view={p.view} counts={p.counts} onChange={p.onViewChange} />
        </div>
        <input
          type="search"
          value={p.query}
          onChange={(e) => p.onQuery(e.target.value)}
          placeholder="Søg navn, telefon, tekst"
          aria-label="Søg i samtaler"
          className="h-10 w-full min-w-0 rounded-lg border border-[#C9D0C7] bg-white px-2.5 text-[16px] outline-none focus:border-[#2F8F55] focus-visible:ring-2 focus-visible:ring-[#2F8F55]/30 min-[900px]:text-[14px]"
        />
        <div className="flex items-center gap-2">
          {p.showStoreFilter && <Segmented size="sm" label="Butik" value={p.store} onChange={p.onStore} options={STORE_OPTIONS} />}
          <span className="ml-auto text-[12px] text-[#5E6A63]">{newestFirst ? "Nyeste øverst" : "Længst ventende øverst"}</span>
        </div>
      </div>

      <div aria-busy={p.loading} className="m-busy min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {p.error && !p.loaded ? (
          <div role="alert" className="m-3.5 flex items-center justify-between gap-3 rounded-lg bg-[#FDECEC] p-3 text-[14px] text-[#B42318]">
            <span>{p.error}</span>
            <Button size="sm" onClick={p.onRetry}>
              Prøv igen
            </Button>
          </div>
        ) : !p.loaded ? (
          <ListSkeleton />
        ) : p.rows.length === 0 ? (
          <p className="m-0 px-6 py-12 text-center text-[14px] text-[#5E6A63]">
            {p.searching ? "Ingen sager matcher søgningen her." : "Ingen sager her."}
          </p>
        ) : (
          <ul className="m-0 list-none p-0" aria-label="Samtaler">
            {p.rows.map((row) => (
              <li key={row.id}>
                <Row row={row} now={now} selected={row.id === p.selectedId} unread={isUnread(row, p.meId, p.readSet, now)} meId={p.meId} onOpen={p.onOpen} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({
  row,
  now,
  selected,
  unread,
  meId,
  onOpen,
}: {
  row: InboxRow;
  now: Date;
  selected: boolean;
  unread: boolean;
  meId: string | null;
  onOpen: (id: string, viaKeyboard: boolean) => void;
}) {
  const wait = waitingLabel(row.lastInboundAt, now);
  const box = row.channel === "email" ? mailboxLabel(row.mailbox) : null;
  const store = storeName(row.store);
  const mine = !!meId && row.assignedTo === meId;
  return (
    <button
      type="button"
      data-row-id={row.id}
      aria-current={selected ? "true" : undefined}
      // detail === 0: aktiveret fra tastaturet (Enter/mellemrum), ikke med mus eller finger.
      onClick={(e) => onOpen(row.id, e.detail === 0)}
      className={`relative block w-full border-b border-[#E2E5E0] px-3.5 pb-3 pt-[11px] text-left motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2F8F55] ${
        selected ? "bg-green-pale" : "bg-white hover:bg-[#FAFBF9]"
      }`}
    >
      {selected && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-green-eco" />}
      <span className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate font-semibold text-[#15211B]">
          {unread && (
            <>
              <span aria-hidden className="mr-[7px] inline-block h-[7px] w-[7px] rounded-full bg-green-eco align-middle" />
              <span className="sr-only">Ulæst: </span>
            </>
          )}
          {row.name || "Ukendt afsender"}
        </span>
        <span className={`whitespace-nowrap text-[12px] tabular-nums ${wait.long ? "font-semibold text-[#8A4B08]" : "text-[#5E6A63]"}`}>{wait.text}</span>
      </span>
      {row.subject && <span className="mt-px block truncate text-[13px] text-[#15211B]">{row.subject}</span>}
      {row.preview && <span className="block truncate text-[13px] text-[#5E6A63]">{row.preview}</span>}
      <span className="mt-[7px] flex flex-wrap items-center gap-[5px]">
        <Tag>{box ? `${CHANNEL_LABELS[row.channel] ?? row.channel} · ${box}` : (CHANNEL_LABELS[row.channel] ?? row.channel)}</Tag>
        {store && <Tag>{store}</Tag>}
        {row.isPublic && <Tag tone="public">Offentlig</Tag>}
        {row.needsHuman && <Tag tone="need">Kræver dig</Tag>}
        {row.fiksAnswered && <Tag tone="fiks">Besvaret af Fiks</Tag>}
        {row.hasDraft && !row.isPublic && <Tag tone="fiks">Udkast klar</Tag>}
        {row.assignedTo && <Tag tone={mine ? "me" : "plain"}>{mine ? "Min" : row.assignedName || "En kollega"}</Tag>}
      </span>
    </button>
  );
}

/** Første indlæsning: rækker i listens egne mål. */
function ListSkeleton() {
  return (
    <div data-skeleton aria-label="Henter samtaler">
      <span className="sr-only">Henter samtaler...</span>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="border-b border-[#E2E5E0] px-3.5 py-3">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-2/5 rounded-md" />
            <Skeleton className="h-3.5 w-10 rounded-md" />
          </div>
          <Skeleton className="mt-2 h-3.5 w-3/4 rounded-md" />
          <Skeleton className="mt-1.5 h-3.5 w-11/12 rounded-md" />
          <div className="mt-2.5 flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-12 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
