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
  venter_paa_svar: "Venter p\u00e5 svar",
  lukket: "Lukket",
};

const STATUS_BADGE: Record<InquiryStatus, string> = {
  ny: "bg-blue-500/10 text-blue-600",
  besvaret: "bg-emerald-500/10 text-emerald-600",
  venter_paa_svar: "bg-amber-500/10 text-amber-600",
  lukket: "bg-charcoal/[0.05] text-charcoal/40",
};

const STATUS_DOT: Record<InquiryStatus, string> = {
  ny: "bg-blue-500",
  besvaret: "bg-emerald-500",
  venter_paa_svar: "bg-amber-500",
  lukket: "bg-charcoal/20",
};

const ALL_STATUSES: (InquiryStatus | "alle")[] = ["alle", "ny", "besvaret", "venter_paa_svar", "lukket"];

const SOURCE_LABELS: Record<InquirySource | "alle", string> = {
  alle: "Alle",
  kontaktformular: "Kontaktformular",
  "saelg-enhed": "S\u00e6lg enhed",
  "reparation-booking": "Booking",
  manuel: "Manuel",
};

const ALL_SOURCES: (InquirySource | "alle")[] = ["alle", "kontaktformular", "saelg-enhed", "reparation-booking", "manuel"];

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  form: "Formular",
};

const CHANNEL_BADGE: Record<string, string> = {
  email: "bg-blue-500/10 text-blue-600",
  sms: "bg-purple-500/10 text-purple-600",
  form: "bg-charcoal/[0.05] text-charcoal/40",
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

  const [messages, setMessages] = useState<Record<string, InquiryMessage[]>>({});
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);

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
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Henvendelser
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">
            {filtered.length} henvendelser
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ny henvendelse
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg className="h-4 w-4 text-charcoal/25" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="S\u00f8g efter navn, email eller besked..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/[0.06] bg-white py-3 pl-11 pr-4 text-sm text-charcoal placeholder:text-charcoal/25 shadow-sm transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-3 flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all ${
              filter === s
                ? "bg-charcoal text-white shadow-sm"
                : "bg-white text-charcoal/40 border border-black/[0.04] hover:text-charcoal/60 shadow-sm"
            }`}
          >
            {s !== "alle" && <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />}
            {s === "alle" ? "Alle" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Source filter */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {ALL_SOURCES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSourceFilter(s)}
            className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${
              sourceFilter === s
                ? "bg-charcoal/80 text-white"
                : "bg-charcoal/[0.03] text-charcoal/30 hover:text-charcoal/50"
            }`}
          >
            {SOURCE_LABELS[s]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
            <p className="text-sm text-charcoal/30">Indl\u00e6ser henvendelser...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white py-20 shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/[0.03]">
            <svg className="h-5 w-5 text-charcoal/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75" />
            </svg>
          </div>
          <p className="text-sm font-medium text-charcoal/30">Ingen henvendelser fundet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inq) => {
            const isExpanded = expandedId === inq.id;
            const inqMessages = messages[inq.id] ?? [];
            return (
              <div
                key={inq.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                  isExpanded ? "border-emerald-500/20 shadow-md" : "border-black/[0.04]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(inq)}
                  className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-black/[0.01]"
                >
                  {/* Status dot */}
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[inq.status]}`} />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-charcoal">{inq.name}</p>
                      {inq.subject && (
                        <span className="truncate text-xs text-charcoal/35">\u2014 {inq.subject}</span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-charcoal/30">{inq.message}</p>
                  </div>

                  {/* Right side */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_BADGE[inq.status]}`}>
                      {STATUS_LABELS[inq.status]}
                    </span>
                    <span className="hidden text-[10px] text-charcoal/20 sm:block">
                      {formatDate(inq.created_at)}
                    </span>
                    <svg className={`h-4 w-4 text-charcoal/15 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-black/[0.04] px-5 pb-5 pt-4">
                    {/* Contact info bar */}
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-charcoal/35">
                      <span>{inq.email}</span>
                      {inq.phone && (
                        <>
                          <span className="h-3 w-px bg-charcoal/10" />
                          <span>{inq.phone}</span>
                        </>
                      )}
                      <span className="h-3 w-px bg-charcoal/10" />
                      <span className="rounded-md bg-charcoal/[0.04] px-2 py-0.5 text-[10px] font-semibold">
                        {SOURCE_LABELS[inq.source]}
                      </span>
                    </div>

                    {/* Conversation */}
                    <div className="mb-4 space-y-3">
                      {/* Original message */}
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-charcoal/[0.03] px-4 py-3">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-[11px] font-bold text-charcoal">{inq.name}</span>
                            <span className="text-[10px] text-charcoal/25">{formatDate(inq.created_at)}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-charcoal/70">{inq.message}</p>
                        </div>
                      </div>

                      {inqMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender === "staff" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                              msg.sender === "staff"
                                ? "rounded-tr-md bg-emerald-500/[0.07]"
                                : "rounded-tl-md bg-charcoal/[0.03]"
                            }`}
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-[11px] font-bold text-charcoal">
                                {msg.sender === "staff" ? (msg.staff_name ?? "Personale") : inq.name}
                              </span>
                              <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${CHANNEL_BADGE[msg.channel] ?? CHANNEL_BADGE.email}`}>
                                {CHANNEL_LABELS[msg.channel] ?? msg.channel}
                              </span>
                              <span className="text-[10px] text-charcoal/25">{formatDate(msg.created_at)}</span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-charcoal/70">{msg.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply box */}
                    <div className="mb-4 rounded-xl border border-black/[0.04] bg-[#f4f3f0]/50 p-4">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/25">
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
                            className="w-full rounded-lg border border-black/[0.06] bg-white px-3 py-2 text-sm text-charcoal focus:border-emerald-500/30 focus:outline-none"
                          >
                            <option value="" disabled>V\u00e6lg skabelon...</option>
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
                        className="w-full rounded-lg border border-black/[0.06] bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleReply(inq.id, "email")}
                          disabled={replySending || !replyText.trim()}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75" />
                          </svg>
                          {replySending ? "Sender..." : "Email"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReply(inq.id, "sms")}
                          disabled={replySending || !replyText.trim() || !inq.phone}
                          className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-[12px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133" />
                          </svg>
                          {replySending ? "Sender..." : "SMS"}
                        </button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="mb-4">
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/25">
                        Admin noter
                      </label>
                      <textarea
                        rows={2}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full rounded-lg border border-black/[0.06] bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                        placeholder="Tilf\u00f8j noter..."
                      />
                      <button
                        type="button"
                        onClick={() => saveNote(inq.id)}
                        disabled={saving}
                        className="mt-2 rounded-lg bg-charcoal px-4 py-2 text-[12px] font-bold text-white transition-all hover:brightness-125 disabled:opacity-60"
                      >
                        {saving ? "Gemmer..." : "Gem noter"}
                      </button>
                    </div>

                    {/* Status actions */}
                    <div className="flex flex-wrap gap-2">
                      {(["ny", "besvaret", "venter_paa_svar", "lukket"] as InquiryStatus[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateStatus(inq.id, s)}
                          disabled={saving || inq.status === s}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all disabled:opacity-40 ${
                            inq.status === s
                              ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/15"
                              : "bg-white text-charcoal/40 border border-black/[0.06] hover:text-charcoal/60"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            inq.status === s ? "bg-white" : STATUS_DOT[s]
                          }`} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-2xl">
            <div className="border-b border-black/[0.04] px-6 py-4">
              <h3 className="font-display text-lg font-bold text-charcoal">
                Opret henvendelse
              </h3>
            </div>
            <form onSubmit={handleCreateInquiry} className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/30">Navn *</label>
                  <input
                    type="text"
                    required
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    className="rounded-lg border border-black/[0.06] bg-[#f4f3f0] px-4 py-2.5 text-sm text-charcoal transition-all focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/30">Telefon</label>
                  <input
                    type="tel"
                    value={newForm.phone}
                    onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                    className="rounded-lg border border-black/[0.06] bg-[#f4f3f0] px-4 py-2.5 text-sm text-charcoal transition-all focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/30">Email *</label>
                <input
                  type="email"
                  required
                  value={newForm.email}
                  onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                  className="rounded-lg border border-black/[0.06] bg-[#f4f3f0] px-4 py-2.5 text-sm text-charcoal transition-all focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/30">Emne</label>
                <input
                  type="text"
                  value={newForm.subject}
                  onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })}
                  className="rounded-lg border border-black/[0.06] bg-[#f4f3f0] px-4 py-2.5 text-sm text-charcoal transition-all focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/30">Besked *</label>
                <textarea
                  required
                  rows={4}
                  value={newForm.message}
                  onChange={(e) => setNewForm({ ...newForm, message: e.target.value })}
                  className="rounded-lg border border-black/[0.06] bg-[#f4f3f0] px-4 py-2.5 text-sm text-charcoal transition-all focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-lg border border-black/[0.06] px-5 py-2.5 text-sm font-medium text-charcoal/50 transition-all hover:bg-black/[0.02] hover:text-charcoal"
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  disabled={newSubmitting}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all hover:shadow-lg hover:brightness-110 disabled:opacity-60"
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
