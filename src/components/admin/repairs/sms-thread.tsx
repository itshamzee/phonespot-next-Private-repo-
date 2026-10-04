"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SmsLogEntry } from "@/lib/supabase/types";
import { buildSmsTemplates, smsParts } from "@/lib/repairs/case-sms";
import { formatWhen } from "@/lib/repairs/format";
import { Btn, Card, apiError } from "@/components/admin/repairs/ui";

type TicketForSms = {
  id: string;
  ticket_number: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  device_type: string;
  device_model: string;
  store_id: string | null;
};

/**
 * SMS-tråden som chat. Udgående beskeder står til højre i grøn. Indgående svar
 * logges endnu ikke, så de vises ikke.
 */
export function SmsThread({
  ticket,
  sms,
  priceDkk,
  onSent,
}: {
  ticket: TicketForSms;
  sms: SmsLogEntry[];
  priceDkk: number | null;
  onSent: () => void | Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const templates = useMemo(() => buildSmsTemplates(ticket, priceDkk), [ticket, priceDkk]);
  const { chars, parts } = smsParts(text);
  const hasPhone = Boolean(ticket.customer_phone.trim());

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight; // kun tråden, aldrig siden
  }, [sms.length]);

  async function send() {
    const message = text.trim();
    if (!message || !hasPhone) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: ticket.id,
          customer_id: ticket.customer_id,
          phone: ticket.customer_phone,
          message,
        }),
      });
      if (!res.ok) {
        setError(await apiError(res, "SMS'en blev ikke sendt. Prøv igen."));
      } else {
        setText("");
      }
      await onSent();
    } catch {
      setError("SMS'en blev ikke sendt, fordi forbindelsen fejlede.");
    }
    setSending(false);
  }

  return (
    <Card title="SMS" id="sms">
      <div className="flex flex-col gap-3">
        <div ref={threadRef} className="flex max-h-[320px] flex-col gap-2 overflow-y-auto" aria-live="polite">
          {sms.length === 0 && <p className="m-0 text-sm text-[#5E6A63]">Ingen SMS på sagen endnu.</p>}
          {sms.map((m) => (
            <div key={m.id} className="flex max-w-[80%] flex-col items-end gap-0.5 self-end">
              <div
                className={`rounded-[14px_14px_4px_14px] px-3.5 py-2.5 text-sm text-white ${
                  m.status === "failed" ? "bg-[#B42318]" : "bg-[#1A3D2E]"
                }`}
              >
                {m.message}
              </div>
              <span className="text-xs text-[#5E6A63]">
                {m.status === "failed" ? "Ikke sendt · " : ""}
                {formatWhen(m.created_at)}
              </span>
            </div>
          ))}
        </div>

        {hasPhone ? (
          <div className="flex flex-col gap-2">
            <select
              aria-label="Vælg skabelon"
              value=""
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.target.value);
                if (t) setText(t.text);
              }}
              className="h-10 rounded-lg border border-[#C9D0C7] bg-white px-3 text-sm"
            >
              <option value="">Vælg skabelon</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <textarea
                id="sms-composer"
                aria-label="Skriv SMS"
                rows={2}
                value={text}
                placeholder="Skriv besked eller vælg skabelon"
                onChange={(e) => setText(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-[#C9D0C7] px-3 py-2 text-sm focus:border-[#2F8F55] focus:outline-none"
              />
              <Btn variant="primary" className="self-end" disabled={sending || !text.trim()} onClick={send}>
                {sending ? "Sender..." : "Send"}
              </Btn>
            </div>
            <span className="text-xs text-[#5E6A63]">
              Til {ticket.customer_phone} · {chars} tegn{parts > 1 ? ` · ${parts} SMS` : ""}
            </span>
          </div>
        ) : (
          <p className="m-0 text-sm text-[#7A4A06]">Sagen har intet telefonnummer, så der kan ikke sendes SMS.</p>
        )}
        {error && (
          <p role="alert" className="m-0 rounded-lg bg-[#FDECEC] p-3 text-sm text-[#B42318]">
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}
