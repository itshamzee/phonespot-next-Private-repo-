"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type {
  ContactInquiry,
  InquiryStatus,
  InquiryMessage,
  InquirySource,
  ReplyTemplate,
} from "@/lib/supabase/types";

const STATUS_LABELS: Record<InquiryStatus, string> = {
  ny: "Ny",
  besvaret: "Besvaret",
  venter_paa_svar: "Venter paa svar",
  lukket: "Lukket",
};

const STATUS_COLORS: Record<InquiryStatus, string> = {
  ny: "bg-blue-50 text-blue-600",
  besvaret: "bg-emerald-50 text-emerald-600",
  venter_paa_svar: "bg-amber-50 text-amber-600",
  lukket: "bg-stone-100 text-stone-500",
};

const ALL_STATUSES: (InquiryStatus | "alle")[] = ["alle", "ny", "besvaret", "venter_paa_svar", "lukket"];

const SOURCE_LABELS: Record<InquirySource | "alle", string> = {
  alle: "Alle",
  kontaktformular: "Kontaktformular",
  "saelg-enhed": "Saelg enhed",
  "reparation-booking": "Booking",
  manuel: "Manuel",
};

const ALL_SOURCES: (InquirySource | "alle")[] = ["alle", "kontaktformular", "saelg-enhed", "reparation-booking", "manuel"];

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  form: "Formular",
};

const CHANNEL_COLORS: Record<string, string> = {
  email: "bg-blue-50 text-blue-600",
  sms: "bg-purple-50 text-purple-600",
  form: "bg-stone-100 text-stone-500",
};

export default function AdminHenvendelserPage() {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InquiryStatus | "alle">("alle");
  const [sourceFilter, setSourceFilter] = useState<InquirySource | "alle">("alle");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  // Conversation thread state
  const [messages, setMessages] = useState<Record<string, InquiryMessage[]>>({});
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);

  // New inquiry modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  });
  const [newSubmitting, setNewSubmitting] = useState(false);

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

  async function loadTemplates() {
    try {
      const res = await fetch("/api/admin/templates?channel=quick-reply");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch {
      // Silently handle
    }
  }

  async function loadMessages(inquiryId: string) {
    try {
      const res = await fetch(`/api/contact/${inquiryId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => ({ ...prev, [inquiryId]: data }));
      }
    } catch {
      // Silently handle
    }
  }

  useEffect(() => {
    loadInquiries();
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = inquiries.filter((inq) => {
    if (filter !== "alle" && inq.status !== filter) return false;
    if (sourceFilter !== "alle" && inq.source !== sourceFilter) return false;
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

  async function handleReply(inquiryId: string, channel: "email" | "sms") {
    if (!replyText.trim()) return;
    setReplySending(true);
    try {
      const res = await fetch(`/api/contact/${inquiryId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: replyText.trim(),
          channel,
          staff_name: "Admin",
        }),
      });
      if (res.ok) {
        setReplyText("");
        await loadMessages(inquiryId);
        await loadInquiries();
      }
    } catch {
      // Silently handle
    }
    setReplySending(false);
  }

  async function handleCreateInquiry(e: React.FormEvent) {
    e.preventDefault();
    setNewSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newForm,
          source: "manuel",
        }),
      });
      if (res.ok) {
        setShowNewModal(false);
        setNewForm({ name: "", phone: "", email: "", subject: "", message: "" });
        await loadInquiries();
      }
    } catch {
      // Silently handle
    }
    setNewSubmitting(false);
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
      setReplyText("");
      loadMessages(inq.id);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal">
          Henvendelser
        </h2>
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="rounded-full bg-green-eco px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Ny henvendelse
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Soeg efter navn, email eller besked..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
        />
      </div>

      {/* Status filter */}
      <div className="mb-3 flex flex-wrap gap-2">
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

      {/* Source filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {ALL_SOURCES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSourceFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              sourceFilter === s
                ? "bg-charcoal text-white"
                : "bg-stone-50 text-stone-400 border border-stone-200 hover:border-stone-300 hover:text-charcoal transition-colors"
            }`}
          >
            {SOURCE_LABELS[s]}
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
            const inqMessages = messages[inq.id] ?? [];
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
                    <span className="rounded-full bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-400">
                      {SOURCE_LABELS[inq.source]}
                    </span>
                    <span className="text-xs text-stone-400">
                      {formatDate(inq.created_at)}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-stone-100 px-5 pb-5 pt-4">
                    {/* Conversation thread */}
                    <div className="mb-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Samtale
                      </p>

                      {/* Original message always shown first */}
                      <div className="mb-3 flex justify-start">
                        <div className="max-w-[80%] rounded-xl bg-amber-50/60 px-4 py-3">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs font-semibold text-charcoal">{inq.name}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CHANNEL_COLORS.form}`}>
                              {CHANNEL_LABELS.form}
                            </span>
                            <span className="text-[10px] text-stone-400">{formatDate(inq.created_at)}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-charcoal">{inq.message}</p>
                        </div>
                      </div>

                      {/* Subsequent messages */}
                      {inqMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`mb-3 flex ${msg.sender === "staff" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-xl px-4 py-3 ${
                              msg.sender === "staff"
                                ? "bg-green-eco/5"
                                : "bg-amber-50/60"
                            }`}
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-xs font-semibold text-charcoal">
                                {msg.sender === "staff" ? (msg.staff_name ?? "Personale") : inq.name}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CHANNEL_COLORS[msg.channel] ?? CHANNEL_COLORS.email}`}>
                                {CHANNEL_LABELS[msg.channel] ?? msg.channel}
                              </span>
                              <span className="text-[10px] text-stone-400">{formatDate(msg.created_at)}</span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-charcoal">{msg.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply box */}
                    <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50/30 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Svar
                      </p>
                      {templates.length > 0 && (
                        <div className="mb-2">
                          <select
                            onChange={(e) => {
                              const tpl = templates.find((t) => t.id === e.target.value);
                              if (tpl) setReplyText(tpl.body);
                            }}
                            defaultValue=""
                            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none"
                          >
                            <option value="" disabled>Vaelg skabelon...</option>
                            {templates.map((tpl) => (
                              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Skriv svar..."
                        className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleReply(inq.id, "email")}
                          disabled={replySending || !replyText.trim()}
                          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          {replySending ? "Sender..." : "Send som email"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReply(inq.id, "sms")}
                          disabled={replySending || !replyText.trim() || !inq.phone}
                          className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          {replySending ? "Sender..." : "Send som SMS"}
                        </button>
                      </div>
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
                      {(["ny", "besvaret", "venter_paa_svar", "lukket"] as InquiryStatus[]).map((s) => (
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

      {/* New inquiry modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-display text-lg font-semibold text-charcoal">
              Opret henvendelse
            </h3>
            <form onSubmit={handleCreateInquiry} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-charcoal">Navn *</label>
                  <input
                    type="text"
                    required
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    className="rounded-lg border border-soft-grey px-4 py-2.5 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-charcoal">Telefon</label>
                  <input
                    type="tel"
                    value={newForm.phone}
                    onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                    className="rounded-lg border border-soft-grey px-4 py-2.5 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-charcoal">Email *</label>
                <input
                  type="email"
                  required
                  value={newForm.email}
                  onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                  className="rounded-lg border border-soft-grey px-4 py-2.5 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-charcoal">Emne</label>
                <input
                  type="text"
                  value={newForm.subject}
                  onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })}
                  className="rounded-lg border border-soft-grey px-4 py-2.5 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-charcoal">Besked *</label>
                <textarea
                  required
                  rows={4}
                  value={newForm.message}
                  onChange={(e) => setNewForm({ ...newForm, message: e.target.value })}
                  className="rounded-lg border border-soft-grey px-4 py-2.5 text-sm text-charcoal focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-full border border-soft-grey px-5 py-2 text-sm hover:bg-sand"
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  disabled={newSubmitting}
                  className="rounded-full bg-green-eco px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {newSubmitting ? "Opretter..." : "Opret"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
