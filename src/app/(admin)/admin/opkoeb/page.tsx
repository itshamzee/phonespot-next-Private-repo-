"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { ContactInquiry } from "@/lib/supabase/types";
import type { TradeInOffer, TradeInDerivedStatus } from "@/lib/supabase/trade-in-types";
import { deriveTradeInStatus, formatDKK } from "@/lib/supabase/trade-in-types";

const STATUS_CONFIG: Record<TradeInDerivedStatus, { label: string; color: string }> = {
  ny: { label: "Ny", color: "bg-blue-100 text-blue-700" },
  tilbud_sendt: { label: "Tilbud sendt", color: "bg-yellow-100 text-yellow-700" },
  accepteret: { label: "Accepteret", color: "bg-green-100 text-green-700" },
  afvist: { label: "Afvist", color: "bg-red-100 text-red-700" },
  modtaget: { label: "Modtaget", color: "bg-purple-100 text-purple-700" },
  betalt: { label: "Betalt", color: "bg-emerald-100 text-emerald-800" },
  lukket: { label: "Lukket", color: "bg-stone-100 text-stone-600" },
};

interface TradeInRow {
  inquiry: ContactInquiry;
  offers: Pick<TradeInOffer, "status" | "offer_amount" | "created_at">[];
  receipts: { status: string }[];
  derivedStatus: TradeInDerivedStatus;
}

export default function OpkoebPage() {
  const [rows, setRows] = useState<TradeInRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TradeInDerivedStatus | "alle">("alle");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);

    const supabase = createBrowserClient();

    // Fetch all sell-device inquiries
    const { data: inquiries } = await supabase
      .from("contact_inquiries")
      .select("*")
      .eq("source", "saelg-enhed")
      .order("created_at", { ascending: false });

    if (!inquiries || inquiries.length === 0) { setRows([]); setLoading(false); return; }

    // Fetch all offers and receipts for these inquiries
    const ids = inquiries.map((i) => i.id);

    const { data: allOffers } = await supabase
      .from("trade_in_offers")
      .select("inquiry_id, status, offer_amount, created_at")
      .in("inquiry_id", ids);

    const { data: allReceipts } = await supabase
      .from("trade_in_receipts")
      .select("inquiry_id, status")
      .in("inquiry_id", ids);

    const result: TradeInRow[] = inquiries.map((inquiry) => {
      const offers = (allOffers || []).filter((o) => o.inquiry_id === inquiry.id);
      const receipts = (allReceipts || []).filter((r) => r.inquiry_id === inquiry.id);
      return {
        inquiry,
        offers,
        receipts,
        derivedStatus: deriveTradeInStatus(inquiry.status, offers, receipts),
      };
    });

    setRows(result);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = rows.filter((row) => {
    if (filter !== "alle" && row.derivedStatus !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const meta = (row.inquiry.metadata || {}) as Record<string, any>;
      const device = meta.device || {};
      const haystack = [row.inquiry.name, row.inquiry.email, device.brand, device.model].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-stone-800">Opkøb</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Søg kunde eller enhed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TradeInDerivedStatus | "alle")}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            <option value="alle">Alle</option>
            {(Object.keys(STATUS_CONFIG) as TradeInDerivedStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <p className="text-stone-500">Ingen henvendelser fundet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="px-4 py-3 text-left font-semibold text-stone-600">Kunde</th>
                <th className="px-4 py-3 text-left font-semibold text-stone-600">Enhed</th>
                <th className="px-4 py-3 text-left font-semibold text-stone-600">Levering</th>
                <th className="px-4 py-3 text-left font-semibold text-stone-600">Tilbud</th>
                <th className="px-4 py-3 text-left font-semibold text-stone-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-stone-600">Dato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const meta = (row.inquiry.metadata || {}) as Record<string, any>;
                const device = meta.device || {};
                const latestOffer = row.offers.find((o) => o.status === "pending" || o.status === "accepted")
                  || row.offers[0];
                const statusCfg = STATUS_CONFIG[row.derivedStatus];

                return (
                  <tr key={row.inquiry.id} className="border-b border-stone-50 transition-colors hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/opkoeb/${row.inquiry.id}`} className="font-medium text-stone-800 hover:text-green-700">
                        {row.inquiry.name}
                      </Link>
                      <p className="text-xs text-stone-400">{row.inquiry.email}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {device.brand} {device.model}
                      {device.storage && <span className="ml-1 text-stone-400">· {device.storage}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-stone-500">
                        {meta.deliveryMethod === "Aflever i butik" ? "Butik" : "Forsendelse"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-700">
                      {latestOffer ? formatDKK(latestOffer.offer_amount) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-400">
                      {new Date(row.inquiry.created_at).toLocaleDateString("da-DK")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
