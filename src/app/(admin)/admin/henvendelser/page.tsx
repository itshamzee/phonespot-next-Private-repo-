"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ContactInquiry, InquiryStatus } from "@/lib/supabase/types";

const STATUS_LABELS: Record<InquiryStatus, string> = {
  ny: "Ny",
  besvaret: "Besvaret",
  lukket: "Lukket",
};

const STATUS_COLORS: Record<InquiryStatus, string> = {
  ny: "bg-blue-50 text-blue-600",
  besvaret: "bg-emerald-50 text-emerald-600",
  lukket: "bg-stone-100 text-stone-500",
};

const ALL_STATUSES: (InquiryStatus | "alle")[] = ["alle", "ny", "besvaret", "lukket"];

export default function AdminHenvendelserPage() {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InquiryStatus | "alle">("alle");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = createBrowserClient();

  async function loadInquiries() {
    setLoading(true);
    const { data } = await supabase
      .from("contact_inquiries")
      .select("*")
      .order("created_at", { ascending: false });
    setInquiries((data as ContactInquiry[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadInquiries();
  }, []);

  const filtered = inquiries.filter((inq) => {
    if (filter !== "alle" && inq.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        inq.name.toLowerCase().includes(q) ||
        inq.email.toLowerCase().includes(q) ||
        inq.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function updateStatus(id: string, status: InquiryStatus) {
    setSaving(true);
    await fetch(`/api/contact/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadInquiries();
    setSaving(false);
  }

  async function saveNote(id: string) {
    setSaving(true);
    await fetch(`/api/contact/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_notes: noteText }),
    });
    await loadInquiries();
    setSaving(false);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function toggleExpand(inq: ContactInquiry) {
    if (expandedId === inq.id) {
      setExpandedId(null);
    } else {
      setExpandedId(inq.id);
      setNoteText(inq.admin_notes ?? "");
    }
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl font-bold tracking-tight text-charcoal">
        Henvendelser
      </h2>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Soeg efter navn, email eller besked..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              filter === s
                ? "bg-green-eco text-white shadow-sm shadow-green-eco/15"
                : "bg-white text-stone-500 border border-stone-200 hover:border-stone-300 hover:text-charcoal transition-colors"
            }`}
          >
            {s === "alle" ? "Alle" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-stone-400">Indlaeser henvendelser...</p>
      ) : filtered.length === 0 ? (
        <p className="text-stone-400">Ingen henvendelser fundet.</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((inq) => {
            const isExpanded = expandedId === inq.id;
            return (
              <div
                key={inq.id}
                className="rounded-xl border border-stone-200/60 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(inq)}
                  className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">{inq.name}</p>
                    <p className="mt-0.5 text-sm text-stone-400">{inq.email}</p>
                    {inq.subject && (
                      <p className="mt-1 text-sm font-medium text-charcoal">
                        {inq.subject}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-2 text-sm text-stone-400">
                      {inq.message}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[inq.status]}`}
                    >
                      {STATUS_LABELS[inq.status]}
                    </span>
                    <span className="text-xs text-stone-400">
                      {formatDate(inq.created_at)}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-stone-100 px-5 pb-5 pt-4">
                    <div className="mb-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Fuld besked
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-charcoal">
                        {inq.message}
                      </p>
                    </div>

                    {inq.phone && (
                      <p className="mb-4 text-sm text-stone-400">
                        Telefon: {inq.phone}
                      </p>
                    )}

                    <div className="mb-4">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Admin noter
                      </label>
                      <textarea
                        rows={3}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
                        placeholder="Tilfoej noter..."
                      />
                      <button
                        type="button"
                        onClick={() => saveNote(inq.id)}
                        disabled={saving}
                        className="mt-2 rounded-xl bg-green-eco px-4 py-2 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-60"
                      >
                        {saving ? "Gemmer..." : "Gem noter"}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(["ny", "besvaret", "lukket"] as InquiryStatus[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateStatus(inq.id, s)}
                          disabled={saving || inq.status === s}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
                            inq.status === s
                              ? "bg-green-eco text-white shadow-sm shadow-green-eco/15"
                              : "bg-white text-stone-500 border border-stone-200 hover:border-stone-300 hover:text-charcoal"
                          }`}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
