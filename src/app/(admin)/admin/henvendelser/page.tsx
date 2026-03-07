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
  ny: "bg-blue-100 text-blue-800",
  besvaret: "bg-green-100 text-green-800",
  lukket: "bg-gray-100 text-gray-800",
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
      <h2 className="mb-6 font-display text-2xl font-bold text-charcoal">
        Henvendelser
      </h2>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Soeg efter navn, email eller besked..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === s
                ? "bg-green-eco text-white"
                : "bg-white text-charcoal border border-soft-grey hover:bg-sand"
            }`}
          >
            {s === "alle" ? "Alle" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray">Indlaeser henvendelser...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray">Ingen henvendelser fundet.</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((inq) => {
            const isExpanded = expandedId === inq.id;
            return (
              <div
                key={inq.id}
                className="rounded-2xl border border-soft-grey bg-white transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(inq)}
                  className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">{inq.name}</p>
                    <p className="mt-0.5 text-sm text-gray">{inq.email}</p>
                    {inq.subject && (
                      <p className="mt-1 text-sm font-medium text-charcoal">
                        {inq.subject}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-2 text-sm text-gray">
                      {inq.message}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[inq.status]}`}
                    >
                      {STATUS_LABELS[inq.status]}
                    </span>
                    <span className="text-xs text-gray">
                      {formatDate(inq.created_at)}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-soft-grey px-5 pb-5 pt-4">
                    <div className="mb-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray">
                        Fuld besked
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-charcoal">
                        {inq.message}
                      </p>
                    </div>

                    {inq.phone && (
                      <p className="mb-4 text-sm text-gray">
                        Telefon: {inq.phone}
                      </p>
                    )}

                    <div className="mb-4">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray">
                        Admin noter
                      </label>
                      <textarea
                        rows={3}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full rounded-lg border border-soft-grey bg-white px-4 py-3 text-sm text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                        placeholder="Tilfoej noter..."
                      />
                      <button
                        type="button"
                        onClick={() => saveNote(inq.id)}
                        disabled={saving}
                        className="mt-2 rounded-full bg-charcoal px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
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
                          className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                            inq.status === s
                              ? "bg-green-eco text-white"
                              : "border border-soft-grey bg-white text-charcoal hover:bg-sand"
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
