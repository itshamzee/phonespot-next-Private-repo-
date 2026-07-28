"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { ContactInquiry } from "@/lib/supabase/types";
import type { TradeInOffer, TradeInDerivedStatus } from "@/lib/supabase/trade-in-types";
import { deriveTradeInStatus, formatDKK } from "@/lib/supabase/trade-in-types";
import { readLeadDevices, deviceLabel } from "@/lib/buyback/lead-devices";
import { normalizeStoreId } from "@/lib/stores";
import StoreBadge from "@/components/admin/StoreBadge";
import StoreFilter, {
  matchesStoreFilter,
  type StoreFilterValue,
} from "@/components/admin/StoreFilter";
import BuybackFeed from "@/components/admin/BuybackFeed";
import BuybackHoldWindow from "@/components/admin/BuybackHoldWindow";
import BuybackStatusBar from "@/components/admin/BuybackStatusBar";

const STATUS_CONFIG: Record<TradeInDerivedStatus, { label: string; badge: string; dot: string }> = {
  ny: { label: "Ny", badge: "bg-blue-500/10 text-blue-600", dot: "bg-blue-500" },
  tilbud_sendt: { label: "Tilbud sendt", badge: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" },
  accepteret: { label: "Accepteret", badge: "bg-emerald-500/10 text-emerald-600", dot: "bg-emerald-500" },
  afvist: { label: "Afvist", badge: "bg-rose-500/10 text-rose-600", dot: "bg-rose-500" },
  modtaget: { label: "Modtaget", badge: "bg-violet-500/10 text-violet-600", dot: "bg-violet-500" },
  betalt: { label: "Betalt", badge: "bg-green-500/10 text-green-700", dot: "bg-green-500" },
  lukket: { label: "Lukket", badge: "bg-charcoal/[0.06] text-charcoal/40", dot: "bg-charcoal/20" },
};

const ALL_STATUSES: (TradeInDerivedStatus | "alle")[] = [
  "alle", "ny", "tilbud_sendt", "accepteret", "modtaget", "betalt", "afvist", "lukket",
];

interface TradeInRow {
  inquiry: ContactInquiry;
  offers: Pick<TradeInOffer, "status" | "offer_amount" | "created_at">[];
  receipts: { status: string }[];
  derivedStatus: TradeInDerivedStatus;
}

// Primær kilde er `store_id` (tilføjes af parallel migration — kolonnen kan mangle,
// select("*") giver da bare undefined). Gamle rækker har kun `metadata.preferredStore`,
// som kun er meningsfuld når kunden valgte at aflevere i butik (feltet har en
// default-værdi og gemmes også på forsendelses-rækker).
function inquiryStoreRaw(inquiry: ContactInquiry): string | null {
  const direct = (inquiry as ContactInquiry & { store_id?: string | null }).store_id;
  if (typeof direct === "string" && direct) return direct;
  const meta = (inquiry.metadata || {}) as Record<string, unknown>;
  if (meta.deliveryMethod !== "Aflever i butik") return null;
  const preferred = meta.preferredStore ?? meta.preferred_store;
  return typeof preferred === "string" ? preferred : null;
}

export default function OpkoebPage() {
  const [rows, setRows] = useState<TradeInRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TradeInDerivedStatus | "alle">("alle");
  const [storeFilter, setStoreFilter] = useState<StoreFilterValue>("alle");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);

    const supabase = createBrowserClient();

    const { data: inquiries } = await supabase
      .from("contact_inquiries")
      .select("*")
      .eq("source", "saelg-enhed")
      .order("created_at", { ascending: false });

    if (!inquiries || inquiries.length === 0) { setRows([]); setLoading(false); return; }

    const ids = inquiries.map((i) => i.id);

    const { data: allOffers } = await supabase
      .from("trade_in_offers")
      .select("inquiry_id, status, offer_amount, created_at")
      .in("inquiry_id", ids);

    const { data: allReceipts } = await supabase
      .from("trade_in_receipts")
      .select("inquiry_id, status")
      .in("inquiry_id", ids);

    const { data: allDeclines } = await supabase
      .from("buyback_declines")
      .select("id, inquiry_id")
      .in("inquiry_id", ids);

    const result: TradeInRow[] = inquiries.map((inquiry) => {
      const offers = (allOffers || []).filter((o) => o.inquiry_id === inquiry.id);
      const receipts = (allReceipts || []).filter((r) => r.inquiry_id === inquiry.id);
      const declines = (allDeclines || []).filter((d) => d.inquiry_id === inquiry.id);
      return {
        inquiry,
        offers,
        receipts,
        derivedStatus: deriveTradeInStatus(inquiry.status, offers, receipts, declines),
      };
    });

    setRows(result);
    setLoading(false);
  }, []);

  // Deferred so the first fetch does not set state during the effect body.
  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Status- og søgefiltre anvendes først, så butiksfanernes tal afspejler
  // det aktuelle udsnit — butiksfilteret lægges ovenpå til sidst.
  const preFiltered = rows.filter((row) => {
    if (filter !== "alle" && row.derivedStatus !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const leadDevices = readLeadDevices(row.inquiry.metadata);
      const haystack = [
        row.inquiry.name,
        row.inquiry.email,
        ...leadDevices.flatMap((e) => [e.device.brand, e.device.model]),
      ].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const storeCounts: Record<StoreFilterValue, number> = {
    alle: preFiltered.length,
    slagelse: 0,
    vejle: 0,
    generel: 0,
  };
  for (const row of preFiltered) {
    const store = normalizeStoreId(inquiryStoreRaw(row.inquiry));
    if (store) storeCounts[store] += 1;
    else storeCounts.generel += 1;
  }

  const filtered = preFiltered.filter((row) =>
    matchesStoreFilter(storeFilter, normalizeStoreId(inquiryStoreRaw(row.inquiry))),
  );

  const statusCounts = rows.reduce((acc, r) => {
    acc[r.derivedStatus] = (acc[r.derivedStatus] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Opkøb
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            {rows.length} henvendelser totalt
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/admin/opkoeb/indstillinger"
            className="text-[13px] text-charcoal/40 underline hover:text-charcoal/60"
          >
            Indstillinger
          </Link>
          {(statusCounts.ny ?? 0) > 0 && (
            <Link
              href="/admin/opkoeb/ko"
              className="rounded-lg bg-charcoal px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              Behandl kø ({statusCounts.ny})
            </Link>
          )}
        </div>
      </div>

      {/* Does buyback need you today? */}
      <BuybackStatusBar needsYou={statusCounts.ny ?? 0} />

      {/* Offers still inside their hold window — yours to stop */}
      <BuybackHoldWindow onChange={loadData} />

      {/* What the automation has been doing */}
      <BuybackFeed limit={12} />

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg className="h-4 w-4 text-charcoal/25" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Søg efter kunde eller enhed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/[0.06] bg-white py-3 pl-11 pr-4 text-sm text-charcoal placeholder:text-charcoal/25 shadow-sm transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {ALL_STATUSES.map((s) => {
          const count = s === "alle" ? rows.length : (statusCounts[s] ?? 0);
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all ${
                filter === s
                  ? "bg-charcoal text-white shadow-sm"
                  : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
              }`}
            >
              {s !== "alle" && (
                <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
              )}
              {s === "alle" ? "Alle" : STATUS_CONFIG[s].label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                filter === s ? "bg-white/20 text-white" : "bg-charcoal/[0.04] text-charcoal/30"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Store filter */}
      <StoreFilter
        value={storeFilter}
        onChange={setStoreFilter}
        counts={storeCounts}
        className="mb-6"
      />

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <p className="text-sm text-charcoal/30">Indlæser opkøb...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white py-20 shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/[0.03]">
            <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-charcoal/30">Ingen henvendelser fundet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
          <div className="divide-y divide-black/[0.03]">
            {filtered.map((row) => {
              const meta = (row.inquiry.metadata || {}) as Record<string, unknown>;
              const leadDevices = readLeadDevices(meta);
              const first = leadDevices[0]?.device;
              const extraCount = Math.max(0, leadDevices.length - 1);
              const latestOffer = row.offers.find((o) => o.status === "pending" || o.status === "accepted")
                || row.offers[0];
              const statusCfg = STATUS_CONFIG[row.derivedStatus];

              return (
                <Link
                  key={row.inquiry.id}
                  href={`/admin/opkoeb/${row.inquiry.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-black/[0.015] sm:px-6"
                >
                  {/* Status dot */}
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusCfg.dot}`} />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-charcoal group-hover:text-emerald-700">
                        {row.inquiry.name}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-charcoal/35">
                      {deviceLabel(first)}
                      {extraCount > 0 && ` \· +${extraCount} enhed${extraCount > 1 ? "er" : ""}`}
                      {` \· ${meta.deliveryMethod === "Aflever i butik" ? "Butik" : "Forsendelse"}`}
                    </p>
                  </div>

                  {/* Right */}
                  <div className="flex shrink-0 items-center gap-3">
                    {latestOffer && (
                      <span className="hidden rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 sm:inline-block">
                        {formatDKK(latestOffer.offer_amount)}
                      </span>
                    )}
                    <StoreBadge store={inquiryStoreRaw(row.inquiry)} />
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusCfg.badge}`}>
                      {statusCfg.label}
                    </span>
                    <span className="hidden text-xs text-charcoal/20 sm:block">
                      {formatDate(row.inquiry.created_at)}
                    </span>
                    <svg className="h-4 w-4 text-charcoal/15" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
